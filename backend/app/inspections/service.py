import logging
import uuid
from datetime import datetime, timezone
from datetime import date

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException

from app.images.renderer import render_annotations
from app.images.s3_service import get_s3_service, S3ServiceUnavailableError
from app.images.repository import ImageRepository
from app.inspections.repository import InspectionRepository
from app.inspections.schemas import InspectionStatusEnum
from app.inspections.sqs_service import get_sqs_service, SQSServiceUnavailableError

logger = logging.getLogger(__name__)


def delete_inspection(
    inspection_id: str,
    user_email: str,
    delete_s3_files: bool = False,
    inspection_repo: InspectionRepository | None = None,
    image_repo: ImageRepository | None = None,
) -> dict:
    """
    Soft delete an inspection and its related images.

    Args:
        inspection_id: The inspection to delete
        user_email: Owner's email for verification
        delete_s3_files: If True, also delete S3 files (dangerous!)
        inspection_repo: Optional repository for testing
        image_repo: Optional repository for testing

    Returns:
        dict with deletion summary

    Raises:
        HTTPException: If inspection not found or other errors
    """
    insp_repo = inspection_repo or InspectionRepository()
    img_repo = image_repo or ImageRepository()

    # 1. Verify ownership and existence
    inspection = insp_repo.find_by_id_and_user(inspection_id, user_email)
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    # 2. Soft delete images first
    images_deleted = img_repo.soft_delete_by_inspection(inspection_id)

    # 3. Soft delete inspection
    insp_repo.soft_delete(inspection_id, user_email)

    result = {
        "message": "Inspection deleted successfully",
        "inspection_id": inspection_id,
        "images_deleted": images_deleted,
        "s3_files_deleted": False,
    }

    # 4. Optional: Delete S3 files (if requested)
    if delete_s3_files:
        try:
            s3 = get_s3_service()
            if s3.available:
                # Get all S3 keys for this inspection
                image_docs = img_repo.find_s3_keys_by_inspection(inspection_id)

                # Determine deletion strategy based on version
                if image_docs and image_docs[0].get("s3_key_version") == "v2":
                    # v2: Delete entire inspection folder
                    success, failures = s3.delete_objects_by_prefix(f"{inspection_id}/")
                    result["s3_files_deleted"] = True
                    result["s3_success_count"] = success
                    result["s3_failure_count"] = failures
                    logger.info(
                        f"Deleted S3 files for inspection {inspection_id}: "
                        f"{success} succeeded, {failures} failed"
                    )
                else:
                    # v1: Delete individual files
                    success = 0
                    failures = 0
                    for img_doc in image_docs:
                        if img_doc.get("s3_key"):
                            if s3.delete_object(img_doc["s3_key"]):
                                success += 1
                            else:
                                failures += 1
                        if img_doc.get("s3_key_annotated"):
                            if s3.delete_object(img_doc["s3_key_annotated"]):
                                success += 1
                            else:
                                failures += 1

                    result["s3_files_deleted"] = True
                    result["s3_success_count"] = success
                    result["s3_failure_count"] = failures
                    logger.info(
                        f"Deleted S3 files for inspection {inspection_id}: "
                        f"{success} succeeded, {failures} failed"
                    )
        except S3ServiceUnavailableError:
            logger.warning("S3 not configured — skipping file deletion")
            result["s3_warning"] = "S3 not configured, files not deleted"
        except Exception as e:
            logger.exception(f"Error deleting S3 files for inspection {inspection_id}")
            result["s3_error"] = str(e)
            # Don't fail the entire operation if S3 deletion fails

    return result


def create_inspection(
    data: dict,
    user_email: str,
    inspection_repo: InspectionRepository | None = None,
) -> dict:
    repo = inspection_repo or InspectionRepository()

    now = datetime.now(timezone.utc)
    inspection_id = str(uuid.uuid4())

    # Get required fields
    industry_category = data.get("industry_category")
    asset_name = data.get("asset_name")

    if not industry_category:
        raise HTTPException(status_code=400, detail="industry_category is required")
    if not asset_name:
        raise HTTPException(status_code=400, detail="asset_name is required")

    # Legacy support: if asset_type is provided at inspection level, store it
    # (will be moved to images in future)
    asset_type = data.get("asset_type")

    doc = {
        "inspection_id": inspection_id,
        "industry_category": industry_category,
        "asset_name": asset_name,
        "asset_type": asset_type,  # DEPRECATED: kept for backward compatibility
        "inspection_date": data["inspection_date"],
        "inspection_name": data.get("inspection_name"),
        "inspector_name": data["inspector_name"],
        "inspection_type": data.get("inspection_type"),
        "method": data.get("method"),
        "weather_conditions": data.get("weather_conditions"),
        "notes": data.get("notes"),
        "status": InspectionStatusEnum.in_progress.value,
        "total_images": 0,
        "num_annotations": 0,
        "user_email": user_email,
        "snapshots": {
            "asset_name_at_creation": asset_name,
            "inspection_date_at_creation": data["inspection_date"],
        },
        "created_at": now,
        "updated_at": None,
        "completed_at": None,
        "deleted_at": None,
    }

    repo.insert(doc)
    doc.pop("user_email", None)
    doc["created_at"] = now.isoformat()
    return doc


def get_inspections(
    user_email: str,
    status_filter: str | None = None,
    inspection_repo: InspectionRepository | None = None,
    image_repo: ImageRepository | None = None,
) -> list[dict]:
    insp_repo = inspection_repo or InspectionRepository()
    img_repo = image_repo or ImageRepository()

    results = insp_repo.find_by_user(user_email, status_filter)
    for doc in results:
        doc["total_images"] = img_repo.count_by_inspection(doc["inspection_id"])

    return results


def get_inspection_by_id(
    inspection_id: str,
    user_email: str,
    inspection_repo: InspectionRepository | None = None,
    image_repo: ImageRepository | None = None,
) -> dict | None:
    insp_repo = inspection_repo or InspectionRepository()
    img_repo = image_repo or ImageRepository()

    doc = insp_repo.find_by_id_and_user(inspection_id, user_email)
    if doc is None:
        return None

    doc["total_images"] = img_repo.count_by_inspection(inspection_id)
    return doc


def update_inspection(
    inspection_id: str,
    updates: dict,
    user_email: str,
    inspection_repo: InspectionRepository | None = None,
) -> dict:
    """Update inspection metadata - no S3 changes needed!"""
    repo = inspection_repo or InspectionRepository()

    # Verify ownership
    inspection = repo.find_by_id_and_user(inspection_id, user_email)
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found")

    # Define editable fields
    EDITABLE_FIELDS = {
        "asset_name",
        "inspection_date",
        "inspection_name",
        "inspector_name",
        "inspection_type",
        "method",
        "weather_conditions",
        "notes",
    }

    # Filter updates to only editable fields
    safe_updates = {k: v for k, v in updates.items() if k in EDITABLE_FIELDS}

    if not safe_updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    logger.info(f"Updating inspection {inspection_id} with fields: {safe_updates}")

    # Validate inspection_date if present
    if "inspection_date" in safe_updates:
        try:
            date_obj = date.fromisoformat(safe_updates["inspection_date"])
            # Optional: Prevent future dates
            if date_obj > date.today():
                raise HTTPException(
                    status_code=400,
                    detail="Inspection date cannot be in the future"
                )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD"
            )

    # Update MongoDB (S3 paths use inspection_id, so no S3 changes needed!)
    repo.update(inspection_id, safe_updates)

    # Return updated inspection
    updated = repo.find_by_id_and_user(inspection_id, user_email)
    if not updated:
        raise HTTPException(status_code=404, detail="Inspection not found after update")

    return updated


def complete_inspection(
    inspection_id: str,
    user_email: str,
    inspection_repo: InspectionRepository | None = None,
    image_repo: ImageRepository | None = None,
) -> dict | None:
    """Complete inspection, send SQS message."""
    insp_repo = inspection_repo or InspectionRepository()
    img_repo = image_repo or ImageRepository()

    doc = insp_repo.find_by_id_and_user(inspection_id, user_email)
    if doc is None:
        return None

    image_docs = img_repo.find_by_inspection(inspection_id)

    if doc["status"] == InspectionStatusEnum.completed.value:
        doc["total_images"] = len(image_docs)
        return doc

    now = datetime.now(timezone.utc)
    insp_repo.update_status(inspection_id, InspectionStatusEnum.completed.value, completed_at=now)

    # Build annotations summary
    annotations_summary = []
    for img in image_docs:
        for ann in img.get("annotations", []):
            component = ann.get("component")
            # Normalize legacy string to list
            if isinstance(component, str):
                component = [component] if component else []
            annotations_summary.append({
                "annotation_id": ann.get("annotation_id"),
                "image_id": img["image_id"],
                "filename": img["filename"],
                "damage_type": ann.get("damage_type"),
                "severity": ann.get("severity"),
                "components": component or [],
                "bbox": ann.get("bbox"),
            })

    # Render and upload annotations
    try:
        s3 = get_s3_service()
        for img in image_docs:
            if not img.get("annotations"):
                continue
            try:
                raw_bytes = s3.download_object(img["s3_key"])
                segment = img.get("segment")
                annotated_bytes = render_annotations(raw_bytes, img["annotations"], segment)

                # Generate annotated path based on version
                s3_key_version = img.get("s3_key_version", "v1")
                if s3_key_version == "v2":
                    # v2: {inspection_id}/annotated/{image_id}_{filename}
                    annotated_key = img["s3_key"].replace("/raw/", "/annotated/")
                else:
                    # v1: {asset_name}/{date}/Annotated/{filename}
                    annotated_key = img["s3_key"].replace("/Raw/", "/Annotated/")

                s3.upload_object(annotated_key, annotated_bytes, "image/jpeg")

                # Store annotated path in database
                img_repo.update_field(img["image_id"], "s3_key_annotated", annotated_key)

                logger.info("Rendered annotated image: %s", annotated_key)
            except (ClientError, BotoCoreError, OSError):
                logger.exception("Failed to render annotated image for %s", img["image_id"])
    except S3ServiceUnavailableError:
        logger.warning("S3 not configured — skipping annotation rendering")

    # Send SQS completion message
    sqs = get_sqs_service()
    updated = insp_repo.find_by_id(inspection_id)
    if updated is None:
        return None
    updated["total_images"] = len(image_docs)
    sqs.send_completion_message(updated, annotations_summary)

    return updated
