from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response

from app.auth.dependencies import get_current_user
from app.exceptions import raise_not_found
from app.inspections.service import get_inspection_by_id
from app.images.schemas import (
    UploadUrlRequest,
    UploadUrlResponse,
    ImageResponse,
    ImageListResponse,
    SaveAnnotationsRequest,
    UpdateImageRequest,
)
from app.images.service import (
    create_upload_urls,
    get_images_by_inspection,
    get_image_by_id,
    save_annotations,
    update_image_metadata,
    build_annotated_zip,
    delete_image,
)

router = APIRouter(tags=["images"])


@router.post(
    "/api/inspections/{inspection_id}/upload-urls",
    response_model=UploadUrlResponse,
)
def request_upload_urls(
    inspection_id: str,
    request: UploadUrlRequest,
    user: dict = Depends(get_current_user),
):
    inspection = get_inspection_by_id(inspection_id, user["email"])
    if inspection is None:
        raise_not_found("Inspection")

    files = [f.model_dump() for f in request.files]
    urls = create_upload_urls(inspection_id, files, inspection)
    return UploadUrlResponse(upload_urls=urls)


@router.get(
    "/api/inspections/{inspection_id}/images",
    response_model=ImageListResponse,
)
def list_images(
    inspection_id: str,
    include_urls: bool = Query(
        True,
        description="Include presigned S3 URLs (set to false for metadata-only for better performance)"
    ),
    user: dict = Depends(get_current_user),
):
    inspection = get_inspection_by_id(inspection_id, user["email"])
    if inspection is None:
        raise_not_found("Inspection")

    images = get_images_by_inspection(inspection_id, include_urls=include_urls)
    return ImageListResponse(images=images, total=len(images))


@router.get("/api/images/{image_id}", response_model=ImageResponse)
def get_image(
    image_id: str,
    user: dict = Depends(get_current_user),
):
    image = get_image_by_id(image_id)
    if image is None:
        raise_not_found("Image")
    return image


@router.put("/api/images/{image_id}/annotations", response_model=ImageResponse)
def update_annotations(
    image_id: str,
    request: SaveAnnotationsRequest,
    user: dict = Depends(get_current_user),
):
    annotations = [a.model_dump() for a in request.annotations]
    updated = save_annotations(image_id, annotations)
    if updated is None:
        raise_not_found("Image")
    return updated


@router.patch("/api/images/{image_id}", response_model=ImageResponse)
def update_image(
    image_id: str,
    request: UpdateImageRequest,
    user: dict = Depends(get_current_user),
):
    """Update image metadata (e.g., asset_type for this specific image)."""
    updates = request.model_dump(exclude_unset=True)
    updated = update_image_metadata(image_id, updates)
    if updated is None:
        raise_not_found("Image")
    return updated


@router.get("/api/inspections/{inspection_id}/download-annotated")
def download_annotated_images(
    inspection_id: str,
    user: dict = Depends(get_current_user),
):
    """Download all annotated images for an inspection as a ZIP file."""
    inspection = get_inspection_by_id(inspection_id, user["email"])
    if inspection is None:
        raise_not_found("Inspection")

    zip_bytes = build_annotated_zip(inspection_id)

    filename = f"{inspection['asset_name']}_annotated.zip"
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/api/images/{image_id}")
def delete_image_endpoint(
    image_id: str,
    delete_s3_files: bool = Query(
        False,
        description="If true, permanently delete S3 files (cannot be undone)"
    ),
    user: dict = Depends(get_current_user),
):
    """
    Soft delete an image and optionally delete S3 files.
    Use with caution - S3 deletion cannot be undone!
    """
    result = delete_image(image_id, delete_s3_files)
    return result
