import logging
import uuid
from datetime import datetime, timezone

from botocore.exceptions import BotoCoreError, ClientError

from app.images.renderer import render_annotations
from app.images.s3_service import get_s3_service, S3ServiceUnavailableError
from app.images.repository import ImageRepository
from app.inspections.repository import InspectionRepository
from app.inspections.schemas import InspectionStatusEnum
from app.inspections.sqs_service import get_sqs_service, SQSServiceUnavailableError

logger = logging.getLogger(__name__)


def create_inspection(
    data: dict,
    user_email: str,
    inspection_repo: InspectionRepository | None = None,
) -> dict:
    repo = inspection_repo or InspectionRepository()

    now = datetime.now(timezone.utc)
    doc = {
        "inspection_id": str(uuid.uuid4()),
        "inspection_date": data["inspection_date"],
        "asset_name": data["asset_name"],
        "asset_type": data["asset_type"],
        "inspector_name": data["inspector_name"],
        "inspection_type": data.get("inspection_type"),
        "method": data.get("method"),
        "weather_conditions": data.get("weather_conditions"),
        "notes": data.get("notes"),
        "status": InspectionStatusEnum.in_progress.value,
        "total_images": 0,
        "user_email": user_email,
        "created_at": now,
        "completed_at": None,
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
            annotations_summary.append({
                "annotation_id": ann.get("annotation_id"),
                "image_id": img["image_id"],
                "filename": img["filename"],
                "damage_type": ann.get("damage_type"),
                "severity": ann.get("severity"),
                "component": ann.get("component"),
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
                annotated_bytes = render_annotations(raw_bytes, img["annotations"])
                annotated_key = img["s3_key"].replace("/Raw/", "/Annotated/")
                s3.upload_object(annotated_key, annotated_bytes, "image/jpeg")
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
