from fastapi import APIRouter, Depends
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
)
from app.images.service import (
    create_upload_urls,
    get_images_by_inspection,
    get_image_by_id,
    save_annotations,
    build_annotated_zip,
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
    user: dict = Depends(get_current_user),
):
    inspection = get_inspection_by_id(inspection_id, user["email"])
    if inspection is None:
        raise_not_found("Inspection")

    images = get_images_by_inspection(inspection_id)
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
