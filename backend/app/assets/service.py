import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException

from app.assets.repository import AssetRepository
from app.inspections.repository import InspectionRepository

logger = logging.getLogger(__name__)


def create_asset(
    data: dict,
    user_email: str,
    asset_repo: AssetRepository | None = None,
) -> dict:
    """Create a new asset."""
    repo = asset_repo or AssetRepository()

    # Check if asset with same name already exists for this user
    existing = repo.find_one_by_name_and_user(data["asset_name"], user_email)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Asset with name '{data['asset_name']}' already exists",
        )

    now = datetime.now(timezone.utc)
    asset_id = str(uuid.uuid4())

    doc = {
        "asset_id": asset_id,
        "asset_name": data["asset_name"],
        "asset_type": data["asset_type"],
        "metadata": data.get("metadata") or {},
        "user_email": user_email,
        "created_at": now,
        "updated_at": None,
        "deleted_at": None,
    }

    repo.insert(doc)
    doc.pop("user_email", None)
    doc["created_at"] = now.isoformat()
    return doc


def get_assets(
    user_email: str,
    asset_type: str | None = None,
    asset_repo: AssetRepository | None = None,
) -> list[dict]:
    """Get all assets for a user."""
    repo = asset_repo or AssetRepository()
    return repo.find_by_user(user_email, asset_type)


def get_asset_by_id(
    asset_id: str,
    user_email: str,
    asset_repo: AssetRepository | None = None,
) -> dict | None:
    """Get a single asset by ID."""
    repo = asset_repo or AssetRepository()
    return repo.find_by_id_and_user(asset_id, user_email)


def update_asset(
    asset_id: str,
    updates: dict,
    user_email: str,
    asset_repo: AssetRepository | None = None,
) -> dict:
    """Update asset metadata - no S3 changes needed!"""
    repo = asset_repo or AssetRepository()

    # Verify ownership
    asset = repo.find_by_id_and_user(asset_id, user_email)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Define editable fields
    EDITABLE_FIELDS = {"asset_name", "asset_type", "metadata"}

    # Filter updates to only editable fields
    safe_updates = {k: v for k, v in updates.items() if k in EDITABLE_FIELDS}

    if not safe_updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    # If renaming, check for duplicates
    if "asset_name" in safe_updates:
        new_name = safe_updates["asset_name"]
        existing = repo.find_one_by_name_and_user(new_name, user_email)
        if existing and existing["asset_id"] != asset_id:
            raise HTTPException(
                status_code=400,
                detail=f"Asset with name '{new_name}' already exists",
            )

    # Update MongoDB (S3 paths use asset_id, so no S3 changes needed!)
    repo.update(asset_id, safe_updates)

    # Return updated asset
    updated = repo.find_by_id_and_user(asset_id, user_email)
    if not updated:
        raise HTTPException(status_code=404, detail="Asset not found after update")

    return updated


def delete_asset(
    asset_id: str,
    user_email: str,
    asset_repo: AssetRepository | None = None,
    inspection_repo: InspectionRepository | None = None,
) -> dict:
    """Soft delete an asset. Prevents deletion if inspections exist."""
    a_repo = asset_repo or AssetRepository()
    i_repo = inspection_repo or InspectionRepository()

    # Verify ownership
    asset = a_repo.find_by_id_and_user(asset_id, user_email)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Check for existing inspections
    inspections = i_repo.find_by_asset(asset_id)
    if inspections:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete asset with {len(inspections)} existing inspections. "
            "Delete inspections first.",
        )

    # Soft delete
    a_repo.soft_delete(asset_id, user_email)

    return {"message": "Asset deleted successfully", "asset_id": asset_id}
