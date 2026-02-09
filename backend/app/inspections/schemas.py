from datetime import date
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class InspectionStatusEnum(str, Enum):
    in_progress = "in_progress"
    completed = "completed"


class IndustryCategoryEnum(str, Enum):
    """Top-level industry category that determines available asset types, damage types, etc."""
    coastal = "coastal"
    railway = "railway"
    wind = "wind"


class InspectionCreate(BaseModel):
    # Industry category (required) - determines available asset types
    industry_category: IndustryCategoryEnum = Field(..., description="Industry category: coastal, railway, wind")

    # Asset name for the inspection (e.g., "Port of Miami Terminal A")
    asset_name: str = Field(..., max_length=200, description="Name of the asset/location being inspected")

    inspection_date: str = Field(..., description="Date in YYYY-MM-DD format")
    inspection_name: Optional[str] = Field(None, max_length=200, description="Optional friendly name")
    inspector_name: str = Field(..., min_length=1, max_length=100)
    inspection_type: Optional[str] = Field(None, max_length=100)
    method: Optional[str] = Field(None, max_length=100)
    weather_conditions: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("inspection_date")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        try:
            date.fromisoformat(v)
        except ValueError:
            raise ValueError("inspection_date must be in YYYY-MM-DD format")
        return v


class InspectionUpdate(BaseModel):
    """Schema for updating inspection metadata. All fields are optional."""
    asset_name: Optional[str] = Field(None, max_length=200, description="Name of the asset/location being inspected")
    inspection_date: Optional[str] = Field(None, description="Date in YYYY-MM-DD format")
    inspection_name: Optional[str] = Field(None, max_length=200)
    inspector_name: Optional[str] = Field(None, min_length=1, max_length=100)
    inspection_type: Optional[str] = Field(None, max_length=100)
    method: Optional[str] = Field(None, max_length=100)
    weather_conditions: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=2000)

    @field_validator("inspection_date")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        if v:
            try:
                date.fromisoformat(v)
            except ValueError:
                raise ValueError("inspection_date must be in YYYY-MM-DD format")
        return v


class InspectionResponse(BaseModel):
    inspection_id: str
    industry_category: Optional[str] = None  # coastal, railway, wind
    asset_name: Optional[str] = None  # Name of the asset/location
    asset_type: Optional[str] = None  # DEPRECATED - kept for backward compatibility, now on images
    inspection_date: str
    inspection_name: Optional[str] = None
    inspector_name: str
    inspection_type: Optional[str] = None
    method: Optional[str] = None
    weather_conditions: Optional[str] = None
    notes: Optional[str] = None
    status: InspectionStatusEnum
    total_images: int
    num_annotations: Optional[int] = None
    snapshots: Optional[dict] = None
    created_at: str
    updated_at: Optional[str] = None
    completed_at: Optional[str] = None


class InspectionListResponse(BaseModel):
    inspections: list[InspectionResponse]
    total: int
