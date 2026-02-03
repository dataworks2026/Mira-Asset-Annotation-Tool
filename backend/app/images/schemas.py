from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# Enums

class ShapeTypeEnum(str, Enum):
    rect = "rect"
    ellipse = "ellipse"


class AnnotationStatusEnum(str, Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    completed = "completed"


class DamageTypeEnum(str, Enum):
    CR = "CR"
    SP = "SP"
    CO = "CO"
    LO = "LO"
    DE = "DE"
    BG = "BG"
    CF = "CF"
    RS = "RS"


# Upload request/response

class FileInfo(BaseModel):
    filename: str = Field(..., min_length=1, max_length=500)
    content_type: str


class UploadUrlRequest(BaseModel):
    files: list[FileInfo]


class PresignedUrlInfo(BaseModel):
    image_id: str
    filename: str
    upload_url: str
    s3_key: str


class UploadUrlResponse(BaseModel):
    upload_urls: list[PresignedUrlInfo]


# Image response

class BoundingBox(BaseModel):
    x: float = Field(..., ge=0)
    y: float = Field(..., ge=0)
    width: float = Field(..., gt=0)
    height: float = Field(..., gt=0)


class AnnotationData(BaseModel):
    annotation_id: str
    bbox: BoundingBox
    shape_type: Optional[ShapeTypeEnum] = None
    damage_type: Optional[DamageTypeEnum] = None
    severity: Optional[int] = Field(None, ge=1, le=4)
    component: Optional[str] = Field(None, max_length=10)
    notes: Optional[str] = Field(None, max_length=2000)


class ImageResponse(BaseModel):
    image_id: str
    inspection_id: str
    filename: str
    s3_url: str
    s3_key: str
    content_type: str
    annotation_status: AnnotationStatusEnum
    annotations: list[AnnotationData]
    num_annotations: int
    uploaded_at: str


class ImageListResponse(BaseModel):
    images: list[ImageResponse]
    total: int


# Save annotations

class SaveAnnotationsRequest(BaseModel):
    annotations: list[AnnotationData]
