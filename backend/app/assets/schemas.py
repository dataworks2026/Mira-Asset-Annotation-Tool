from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class AssetTypeEnum(str, Enum):
    coastal = "coastal"
    wind = "wind"
    railway = "railway"


class AssetCreate(BaseModel):
    asset_name: str = Field(..., min_length=1, max_length=200)
    asset_type: AssetTypeEnum
    metadata: Optional[dict] = Field(default=None, description="Additional metadata")


class AssetUpdate(BaseModel):
    asset_name: Optional[str] = Field(None, min_length=1, max_length=200)
    asset_type: Optional[AssetTypeEnum] = None
    metadata: Optional[dict] = None


class AssetResponse(BaseModel):
    asset_id: str
    asset_name: str
    asset_type: AssetTypeEnum
    metadata: Optional[dict] = None
    user_email: str
    created_at: str
    updated_at: Optional[str] = None
    deleted_at: Optional[str] = None


class AssetListResponse(BaseModel):
    assets: list[AssetResponse]
    total: int
