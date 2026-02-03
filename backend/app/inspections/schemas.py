from datetime import date
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class InspectionStatusEnum(str, Enum):
    in_progress = "in_progress"
    completed = "completed"


class InspectionCreate(BaseModel):
    inspection_date: str = Field(..., description="Date in YYYY-MM-DD format")
    asset_name: str = Field(..., min_length=1, max_length=200)
    asset_type: str = Field(..., min_length=1, max_length=50)
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


class InspectionResponse(BaseModel):
    inspection_id: str
    inspection_date: str
    asset_name: str
    asset_type: str
    inspector_name: str
    inspection_type: Optional[str] = None
    method: Optional[str] = None
    weather_conditions: Optional[str] = None
    notes: Optional[str] = None
    status: InspectionStatusEnum
    total_images: int
    created_at: str
    completed_at: Optional[str] = None


class InspectionListResponse(BaseModel):
    inspections: list[InspectionResponse]
    total: int
