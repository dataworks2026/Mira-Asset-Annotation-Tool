from fastapi import APIRouter, Depends, Query, status
from typing import Optional

from app.auth.dependencies import get_current_user
from app.exceptions import raise_not_found
from app.assets.schemas import (
    AssetCreate,
    AssetUpdate,
    AssetResponse,
    AssetListResponse,
    AssetTypeEnum,
)
from app.assets.service import (
    create_asset,
    get_assets,
    get_asset_by_id,
    update_asset,
    delete_asset,
)

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create(data: AssetCreate, user: dict = Depends(get_current_user)):
    """Create a new asset."""
    doc = create_asset(data.model_dump(), user["email"])
    return doc


@router.get("", response_model=AssetListResponse)
def list_assets(
    asset_type: Optional[AssetTypeEnum] = Query(None),
    user: dict = Depends(get_current_user),
):
    """List all assets for the current user."""
    results = get_assets(
        user["email"], asset_type.value if asset_type else None
    )
    return AssetListResponse(assets=results, total=len(results))


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(asset_id: str, user: dict = Depends(get_current_user)):
    """Get a single asset by ID."""
    doc = get_asset_by_id(asset_id, user["email"])
    if doc is None:
        raise_not_found("Asset")
    return doc


@router.put("/{asset_id}", response_model=AssetResponse)
def update(
    asset_id: str,
    data: AssetUpdate,
    user: dict = Depends(get_current_user)
):
    """
    Update asset metadata - rename, change type, or update metadata.
    No S3 changes needed as paths use asset_id!
    """
    updates = data.model_dump(exclude_unset=True)
    doc = update_asset(asset_id, updates, user["email"])
    return doc


@router.delete("/{asset_id}", status_code=status.HTTP_200_OK)
def delete(asset_id: str, user: dict = Depends(get_current_user)):
    """
    Soft delete an asset.
    Prevents deletion if inspections exist for this asset.
    """
    result = delete_asset(asset_id, user["email"])
    return result
