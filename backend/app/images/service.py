import io
import logging
import re
import uuid
import zipfile
from datetime import datetime, timezone

from botocore.exceptions import BotoCoreError, ClientError

from app.images.repository import ImageRepository
from app.images.s3_service import get_s3_service
from app.images.schemas import AnnotationStatusEnum

logger = logging.getLogger(__name__)


ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png"}


def _sanitize_folder_name(name: str) -> str:
    """Sanitize S3 folder name."""
    sanitized = re.sub(r"[^\w\s\-]", "", name)
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
    return sanitized


def create_upload_urls(
    inspection_id: str,
    files: list[dict],
    inspection: dict,
    image_repo: ImageRepository | None = None,
) -> list[dict]:
    s3 = get_s3_service()
    repo = image_repo or ImageRepository()
    now = datetime.now(timezone.utc)

    asset_name = _sanitize_folder_name(inspection.get("asset_name", "Unknown"))
    inspection_date = inspection.get("inspection_date", "undated")

    results = []
    for f in files:
        if f["content_type"] not in ALLOWED_CONTENT_TYPES:
            continue

        image_id = str(uuid.uuid4())
        s3_key = f"{asset_name}/{inspection_date}/Raw/{f['filename']}"

        upload_url = s3.generate_presigned_upload_url(
            key=s3_key,
            content_type=f["content_type"],
        )

        doc = {
            "image_id": image_id,
            "inspection_id": inspection_id,
            "filename": f["filename"],
            "s3_key": s3_key,
            "content_type": f["content_type"],
            "annotation_status": AnnotationStatusEnum.not_started.value,
            "annotations": [],
            "num_annotations": 0,
            "uploaded_at": now,
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
    image_repo: ImageRepository | None = None,
) -> list[dict]:
    s3 = get_s3_service()
    repo = image_repo or ImageRepository()

    results = repo.find_by_inspection(inspection_id)
    for doc in results:
        doc["s3_url"] = s3.generate_presigned_download_url(doc["s3_key"])

    return results


def save_annotations(
    image_id: str,
    annotations: list[dict],
    image_repo: ImageRepository | None = None,
) -> dict | None:
    s3 = get_s3_service()
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
    updated["s3_url"] = s3.generate_presigned_download_url(updated["s3_key"])
    return updated


def get_image_by_id(
    image_id: str,
    image_repo: ImageRepository | None = None,
) -> dict | None:
    s3 = get_s3_service()
    repo = image_repo or ImageRepository()

    doc = repo.find_by_id(image_id)
    if doc is None:
        return None

    doc["s3_url"] = s3.generate_presigned_download_url(doc["s3_key"])
    return doc


def build_annotated_zip(
    inspection_id: str,
    image_repo: ImageRepository | None = None,
) -> bytes:
    """Build ZIP of annotated images."""
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

    return buf.getvalue()
