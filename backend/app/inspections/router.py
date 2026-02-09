from fastapi import APIRouter, Depends, Query, status
from typing import Optional

from app.auth.dependencies import get_current_user
from app.exceptions import raise_not_found
from app.inspections.schemas import (
    InspectionCreate,
    InspectionUpdate,
    InspectionResponse,
    InspectionListResponse,
    InspectionStatusEnum,
)
from app.inspections.service import (
    create_inspection,
    get_inspections,
    get_inspection_by_id,
    update_inspection,
    complete_inspection,
    delete_inspection,
)

router = APIRouter(prefix="/api/inspections", tags=["inspections"])


@router.post("", response_model=InspectionResponse, status_code=status.HTTP_201_CREATED)
def create(data: InspectionCreate, user: dict = Depends(get_current_user)):
    doc = create_inspection(data.model_dump(), user["email"])
    return doc


@router.get("", response_model=InspectionListResponse)
def list_inspections(
    status_filter: Optional[InspectionStatusEnum] = Query(None, alias="status"),
    user: dict = Depends(get_current_user),
):
    results = get_inspections(
        user["email"], status_filter.value if status_filter else None
    )
    return InspectionListResponse(inspections=results, total=len(results))


@router.get("/{inspection_id}", response_model=InspectionResponse)
def get_inspection(inspection_id: str, user: dict = Depends(get_current_user)):
    doc = get_inspection_by_id(inspection_id, user["email"])
    if doc is None:
        raise_not_found("Inspection")
    return doc


@router.put("/{inspection_id}", response_model=InspectionResponse)
def update(
    inspection_id: str,
    data: InspectionUpdate,
    user: dict = Depends(get_current_user)
):
    """
    Update inspection metadata (date, name, inspector, etc.)
    No S3 changes needed as paths use inspection_id!
    """
    updates = data.model_dump(exclude_unset=True)
    doc = update_inspection(inspection_id, updates, user["email"])
    return doc


@router.post("/{inspection_id}/complete", response_model=InspectionResponse)
def complete(inspection_id: str, user: dict = Depends(get_current_user)):
    doc = complete_inspection(inspection_id, user["email"])
    if doc is None:
        raise_not_found("Inspection")
    return doc


@router.delete("/{inspection_id}")
def delete(
    inspection_id: str,
    delete_s3_files: bool = Query(
        False,
        description="If true, permanently delete S3 files (cannot be undone)"
    ),
    user: dict = Depends(get_current_user)
):
    """
    Soft delete an inspection and all related images.
    Optionally delete S3 files (use with caution!).
    """
    result = delete_inspection(inspection_id, user["email"], delete_s3_files)
    return result
