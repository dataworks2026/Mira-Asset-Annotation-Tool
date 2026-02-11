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
    ConfirmUploadRequest,
    UpdateImageRequest,
)
from app.images.service import (
    create_upload_urls,
    confirm_upload_success,
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


@router.post("/api/images/confirm-upload")
def confirm_upload(
    request: ConfirmUploadRequest,
    user: dict = Depends(get_current_user),
):
    """
    Frontend calls this after successfully uploading images to S3.
    Marks images as upload_completed=True so they count toward total_images.
    """
    result = confirm_upload_success(request.image_ids)
    return result


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
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Received annotation update for image {image_id}: {request.model_dump()}")

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


@router.options("/api/images/{image_id}/view")
def proxy_image_options():
    """Handle CORS preflight requests for image proxy endpoint."""
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )


@router.get("/api/images/{image_id}/view")
def proxy_image(image_id: str):
    """
    Proxy image from S3 through backend - eliminates CORS issues.

    NOTE: This endpoint is intentionally public (no auth required) because:
    1. HTML <img> tags cannot send Authorization headers
    2. Image UUIDs are sufficiently random (not guessable)
    3. Images are already access-controlled at inspection level
    4. Alternative would be signed URLs with tokens (more complex)

    Streams image from S3 to avoid memory issues and timeouts.
    """
    import logging
    from app.images.repository import ImageRepository
    from app.images.s3_service import get_s3_service
    from fastapi import HTTPException
    from fastapi.responses import StreamingResponse

    logger = logging.getLogger(__name__)

    repo = ImageRepository()
    image = repo.find_by_id(image_id)

    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Get S3 streaming response
    s3_service = get_s3_service()
    try:
        s3_service._check_available()

        if not s3_service.s3_client:
            raise HTTPException(status_code=503, detail="S3 service unavailable")

        response = s3_service.s3_client.get_object(Bucket=s3_service.bucket_name, Key=image["s3_key"])

        # Stream the body
        def iterfile():
            try:
                for chunk in response['Body'].iter_chunks(chunk_size=8192):
                    yield chunk
            finally:
                response['Body'].close()

        # Return streaming response with caching headers
        return StreamingResponse(
            iterfile(),
            media_type=image.get("content_type", "image/jpeg"),
            headers={
                "Cache-Control": "public, max-age=3600, immutable",
                "ETag": f'"{image_id}"',
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error streaming image {image_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to load image")


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
