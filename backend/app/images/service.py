import io
import json
import logging
import re
import uuid
import zipfile
from datetime import datetime, timezone

from botocore.exceptions import BotoCoreError, ClientError

from app.images.repository import ImageRepository
from app.images.renderer import DAMAGE_LABELS, SEVERITY_LABELS
from app.images.s3_service import get_s3_service, S3ServiceUnavailableError
from app.images.schemas import AnnotationStatusEnum
from fastapi import HTTPException

logger = logging.getLogger(__name__)


ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB per file


def _sanitize_folder_name(name: str) -> str:
    """Sanitize S3 folder name."""
    sanitized = re.sub(r"[^\w\s\-]", "", name)
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
    return sanitized


def confirm_upload_success(
    image_ids: list[str],
    image_repo: ImageRepository | None = None,
) -> dict:
    """
    Mark images as successfully uploaded to S3.
    Frontend calls this after successful S3 PUT.
    """
    repo = image_repo or ImageRepository()
    from datetime import datetime, timezone

    result = repo._collection.update_many(
        {"image_id": {"$in": image_ids}},
        {
            "$set": {
                "upload_completed": True,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {
        "confirmed": result.modified_count,
        "requested": len(image_ids),
    }


def create_upload_urls(
    inspection_id: str,
    files: list[dict],
    inspection: dict,
    image_repo: ImageRepository | None = None,
) -> list[dict]:
    s3 = get_s3_service()
    repo = image_repo or ImageRepository()
    now = datetime.now(timezone.utc)

    # Check if this is a legacy inspection (no asset_id) or new format
    use_v2_format = "asset_id" in inspection

    results = []
    for f in files:
        # Validate content type
        if f["content_type"] not in ALLOWED_CONTENT_TYPES:
            logger.warning(f"Skipping file {f['filename']} - invalid content type: {f['content_type']}")
            continue

        # Validate file size
        file_size = f.get("file_size", 0)
        if file_size > MAX_FILE_SIZE:
            logger.warning(f"Skipping file {f['filename']} - exceeds {MAX_FILE_SIZE/1024/1024}MB limit")
            continue

        # Delete any existing record with same filename (handles retries)
        # This is lightweight - single DELETE query per file
        repo._collection.delete_many({
            "inspection_id": inspection_id,
            "filename": f["filename"],
            "deleted_at": None,
        })

        # Create new record
        image_id = str(uuid.uuid4())

        # Generate S3 key based on format version
        if use_v2_format:
            # NEW FORMAT v2: {inspection_id}/raw/{image_id}_{filename}
            s3_key = f"{inspection_id}/raw/{image_id}_{f['filename']}"
            s3_key_version = "v2"
        else:
            # LEGACY FORMAT v1: {asset_name}/{inspection_date}/Raw/{filename}
            asset_name = _sanitize_folder_name(inspection.get("asset_name", "Unknown"))
            inspection_date = inspection.get("inspection_date", "undated")
            s3_key = f"{asset_name}/{inspection_date}/Raw/{f['filename']}"
            s3_key_version = "v1"

        upload_url = s3.generate_presigned_upload_url(
            key=s3_key,
            content_type=f["content_type"],
        )

        doc = {
            "image_id": image_id,
            "inspection_id": inspection_id,
            "filename": f["filename"],
            "original_filename": f["filename"],
            "s3_key": s3_key,
            "s3_key_version": s3_key_version,
            "s3_key_annotated": None,
            "content_type": f["content_type"],
            "file_size": f.get("file_size"),
            "annotation_status": AnnotationStatusEnum.not_started.value,
            "annotations": [],
            "num_annotations": 0,
            "upload_completed": False,  # Mark as not uploaded until frontend confirms
            "uploaded_at": now,
            "updated_at": None,
            "deleted_at": None,
        }
        repo.insert(doc)

        results.append({
            "image_id": image_id,
            "filename": f["filename"],
            "upload_url": upload_url,
            "s3_key": s3_key,
        })

    return results


def get_images_by_inspection(
    inspection_id: str,
    include_urls: bool = True,
    image_repo: ImageRepository | None = None,
) -> list[dict]:
    repo = image_repo or ImageRepository()
    results = repo.find_by_inspection(inspection_id)

    # Generate proxy URLs instead of presigned S3 URLs
    # This eliminates CORS issues and improves caching
    if include_urls:
        for doc in results:
            # Frontend will use: /api/images/{image_id}/view
            doc["s3_url"] = f"/api/images/{doc['image_id']}/view"
    else:
        # Set empty string for s3_url when not included
        for doc in results:
            doc["s3_url"] = ""

    return results


def save_annotations(
    image_id: str,
    annotations: list[dict],
    image_repo: ImageRepository | None = None,
) -> dict | None:
    repo = image_repo or ImageRepository()

    doc = repo.find_by_id(image_id)
    if doc is None:
        return None

    num = len(annotations)
    if num == 0:
        status = AnnotationStatusEnum.not_started.value
    else:
        # Mark completed if fully labeled
        all_labeled = all(
            a.get("damage_type") and a.get("severity") is not None
            for a in annotations
        )
        status = (
            AnnotationStatusEnum.completed.value
            if all_labeled
            else AnnotationStatusEnum.in_progress.value
        )

    repo.update_annotations(image_id, annotations, num, status)

    updated = repo.find_by_id(image_id)
    if updated is None:
        return None
    # Use proxy URL instead of presigned S3 URL
    updated["s3_url"] = f"/api/images/{image_id}/view"
    return updated


def get_image_by_id(
    image_id: str,
    image_repo: ImageRepository | None = None,
) -> dict | None:
    repo = image_repo or ImageRepository()

    doc = repo.find_by_id(image_id)
    if doc is None:
        return None

    # Use proxy URL instead of presigned S3 URL
    doc["s3_url"] = f"/api/images/{image_id}/view"
    return doc


def update_image_metadata(
    image_id: str,
    updates: dict,
    image_repo: ImageRepository | None = None,
) -> dict | None:
    """Update image metadata (e.g., asset_type, segment, elevation, side_face, latitude, longitude)."""
    repo = image_repo or ImageRepository()

    doc = repo.find_by_id(image_id)
    if doc is None:
        return None

    # Filter to allowed fields - includes spatial awareness fields and GPS coordinates
    allowed_fields = {"asset_type", "segment", "elevation", "side_face", "latitude", "longitude"}
    safe_updates = {k: v for k, v in updates.items() if k in allowed_fields}

    if safe_updates:
        for field, value in safe_updates.items():
            repo.update_field(image_id, field, value)

    updated = repo.find_by_id(image_id)
    if updated is None:
        return None
    # Use proxy URL instead of presigned S3 URL
    updated["s3_url"] = f"/api/images/{image_id}/view"
    return updated


def _build_annotations_json(image_docs: list[dict], inspection_id: str) -> str:
    """Build a CV-ready annotations JSON for all images in the inspection."""
    images_out = []
    for doc in image_docs:
        annotations_out = []
        for ann in doc.get("annotations", []):
            damage_code = ann.get("damage_type")
            severity = ann.get("severity")
            components = ann.get("component")
            # Normalize component to list for backwards compat
            if isinstance(components, str):
                components = [components] if components else []
            elif not components:
                components = []

            annotations_out.append({
                "annotation_id": ann.get("annotation_id"),
                "bbox": ann.get("bbox"),
                "shape_type": ann.get("shape_type", "rect"),
                "damage_type": {
                    "code": damage_code,
                    "label": DAMAGE_LABELS.get(damage_code, "") if damage_code else "",
                } if damage_code else None,
                "severity": {
                    "level": severity,
                    "label": SEVERITY_LABELS.get(severity, "") if severity else "",
                } if severity else None,
                "components": [
                    {"code": c} for c in components
                ],
                "notes": ann.get("notes"),
                # Spatial Awareness - defect tracking
                "defect_id": ann.get("defect_id"),
            })
        images_out.append({
            "image_id": doc["image_id"],
            "filename": doc["filename"],
            "s3_key": doc["s3_key"],
            # Spatial Awareness - image location context
            "asset_type": doc.get("asset_type"),
            "segment": doc.get("segment"),
            "elevation": doc.get("elevation"),
            "side_face": doc.get("side_face"),
            "structural_segments": doc.get("structural_segments", []),
            "annotation_status": doc.get("annotation_status"),
            "num_annotations": doc.get("num_annotations", len(annotations_out)),
            "annotations": annotations_out,
        })

    output = {
        "inspection_id": inspection_id,
        "export_version": "1.1",  # Bumped version for spatial awareness fields
        "total_images": len(images_out),
        "total_annotations": sum(len(img["annotations"]) for img in images_out),
        "images": images_out,
    }
    return json.dumps(output, indent=2)


def build_annotated_zip(
    inspection_id: str,
    image_repo: ImageRepository | None = None,
) -> bytes:
    """Build ZIP of annotated images and annotations JSON."""
    s3 = get_s3_service()
    repo = image_repo or ImageRepository()

    image_docs = repo.find_by_inspection(inspection_id)

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for doc in image_docs:
            raw_key = doc["s3_key"]
            annotated_key = raw_key.replace("/Raw/", "/Annotated/")

            # Prefer annotated, fallback raw
            try:
                if "/Raw/" in raw_key and s3.object_exists(annotated_key):
                    image_bytes = s3.download_object(annotated_key)
                else:
                    image_bytes = s3.download_object(raw_key)
            except (ClientError, BotoCoreError, OSError):
                logger.exception("Failed to download image %s", doc["image_id"])
                continue

            zf.writestr(doc["filename"], image_bytes)

        # Add annotations JSON
        annotations_json = _build_annotations_json(image_docs, inspection_id)
        zf.writestr("annotations.json", annotations_json)

    return buf.getvalue()


def delete_image(
    image_id: str,
    delete_s3_files: bool = False,
    image_repo: ImageRepository | None = None,
) -> dict:
    """
    Soft delete an image and optionally delete S3 files.

    Args:
        image_id: The image to delete
        delete_s3_files: If True, also delete S3 files
        image_repo: Optional repository for testing

    Returns:
        dict with deletion summary

    Raises:
        HTTPException: If image not found
    """
    repo = image_repo or ImageRepository()

    # Get image data (including S3 keys) before soft delete
    image_data = repo.find_s3_keys_by_id(image_id)
    if not image_data:
        raise HTTPException(status_code=404, detail="Image not found")

    # Soft delete the image
    deleted = repo.soft_delete(image_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Image not found or already deleted")

    result = {
        "message": "Image deleted successfully",
        "image_id": image_id,
        "inspection_id": image_data.get("inspection_id"),
        "s3_files_deleted": False,
    }

    # Optional S3 deletion
    if delete_s3_files:
        try:
            s3 = get_s3_service()
            if s3.available:
                success = 0
                failures = 0

                # Delete raw image
                if image_data.get("s3_key"):
                    if s3.delete_object(image_data["s3_key"]):
                        success += 1
                    else:
                        failures += 1

                # Delete annotated image if exists
                if image_data.get("s3_key_annotated"):
                    if s3.delete_object(image_data["s3_key_annotated"]):
                        success += 1
                    else:
                        failures += 1

                result["s3_files_deleted"] = True
                result["s3_success_count"] = success
                result["s3_failure_count"] = failures
                logger.info(f"Deleted S3 files for image {image_id}: {success} succeeded, {failures} failed")
        except S3ServiceUnavailableError:
            logger.warning("S3 not configured — skipping file deletion")
            result["s3_warning"] = "S3 not configured, files not deleted"
        except Exception as e:
            logger.exception(f"Error deleting S3 files for image {image_id}")
            result["s3_error"] = str(e)

    return result
