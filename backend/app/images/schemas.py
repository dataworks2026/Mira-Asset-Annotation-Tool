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
    # Coastal damage types
    CR = "CR"  # Cracking
    SP = "SP"  # Spalling
    CO = "CO"  # Corrosion
    LO = "LO"  # Loss of Section
    DE = "DE"  # Delamination
    BG = "BG"  # Biological Growth
    CF = "CF"  # Collision/Fire
    RS = "RS"  # Rust Staining
    ER = "ER"  # Erosion
    SC = "SC"  # Scour
    MG = "MG"  # Marine Growth
    # Railway damage types
    WR = "WR"  # Wear
    DF = "DF"  # Deformation
    BK = "BK"  # Broken Component
    MS = "MS"  # Missing Component
    AL = "AL"  # Alignment Issue
    # Wind damage types
    LT = "LT"  # Lightning Damage
    IC = "IC"  # Ice Damage
    DL = "DL"  # Delamination
    IM = "IM"  # Impact Damage
    OL = "OL"  # Oil Leak


# --- Spatial Awareness Enums ---

class ElevationEnum(str, Enum):
    """Elevation zones for coastal/marine structures"""
    above_water = "above_water"
    splash_zone = "splash_zone"
    tidal_zone = "tidal_zone"
    submerged = "submerged"
    buried = "buried"
    # Generic options
    top = "top"
    middle = "middle"
    bottom = "bottom"


class SideFaceEnum(str, Enum):
    """Side/face orientation of the structure"""
    # Cardinal directions
    north = "north"
    south = "south"
    east = "east"
    west = "west"
    # Relative to water/environment
    seaward = "seaward"
    landward = "landward"
    upstream = "upstream"
    downstream = "downstream"
    # Generic
    front = "front"
    back = "back"
    left = "left"
    right = "right"
    interior = "interior"
    exterior = "exterior"


# Upload request/response

class FileInfo(BaseModel):
    filename: str = Field(..., min_length=1, max_length=500)
    content_type: str


class UploadUrlRequest(BaseModel):
    files: list[FileInfo] = Field(..., max_length=100, description="Maximum 100 files per request")


class PresignedUrlInfo(BaseModel):
    image_id: str
    filename: str
    upload_url: str
    s3_key: str


class UploadUrlResponse(BaseModel):
    upload_urls: list[PresignedUrlInfo]


# Image response

class BoundingBox(BaseModel):
    x: float
    y: float
    width: float = Field(..., gt=0)
    height: float = Field(..., gt=0)


class AnnotationData(BaseModel):
    annotation_id: str
    bbox: BoundingBox
    shape_type: Optional[ShapeTypeEnum] = None
    damage_type: Optional[DamageTypeEnum] = None
    severity: Optional[int] = Field(None, ge=1, le=4)
    # DEPRECATED: Old component field - replaced by structural_segments
    component: Optional[list[str]] = Field(None, description="(DEPRECATED) Use structural_segments instead")
    # NEW: Structural segments - which components this damage affects
    structural_segments: Optional[list[str]] = Field(
        None,
        min_length=1,
        description="Structural component codes (e.g., ['BH', 'SZ']). Required for new annotations."
    )
    notes: Optional[str] = Field(None, max_length=2000)
    # Spatial Awareness - Defect tracking across inspections
    defect_id: Optional[str] = Field(
        None,
        max_length=50,
        pattern=r"^[A-Z0-9-]+$",
        description="Unique defect identifier for tracking across inspections (e.g., PIER-CR-001)"
    )


class ImageResponse(BaseModel):
    image_id: str
    inspection_id: str
    filename: str
    s3_url: str
    s3_key: str
    content_type: str
    asset_type: Optional[str] = None  # Asset type for this specific image (pier, bulkhead, etc.)
    # Spatial Awareness fields - location context for the image
    segment: Optional[str] = Field(None, description="Segment/bay of the asset (e.g., 'Segment 1', 'Bay 3', 'Span A-B')")
    elevation: Optional[str] = Field(None, description="Elevation zone (e.g., 'above_water', 'splash_zone', 'submerged')")
    side_face: Optional[str] = Field(None, description="Side/face orientation (e.g., 'north', 'seaward', 'interior')")
    # GPS coordinates
    latitude: Optional[float] = Field(None, ge=-90, le=90, description="Latitude coordinate (-90 to 90)")
    longitude: Optional[float] = Field(None, ge=-180, le=180, description="Longitude coordinate (-180 to 180)")
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


# Confirm upload success

class ConfirmUploadRequest(BaseModel):
    image_ids: list[str] = Field(..., description="List of image IDs that were successfully uploaded to S3")


# Update image metadata

class UpdateImageRequest(BaseModel):
    asset_type: Optional[str] = Field(None, max_length=100, description="Asset type for this image")
    # Spatial Awareness fields
    segment: Optional[str] = Field(None, max_length=100, description="Segment/bay of the asset")
    elevation: Optional[str] = Field(None, max_length=50, description="Elevation zone")
    side_face: Optional[str] = Field(None, max_length=50, description="Side/face orientation")
    # GPS coordinates
    latitude: Optional[float] = Field(None, ge=-90, le=90, description="Latitude coordinate")
    longitude: Optional[float] = Field(None, ge=-180, le=180, description="Longitude coordinate")
