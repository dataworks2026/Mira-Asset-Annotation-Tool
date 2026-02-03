from fastapi import HTTPException, status


def raise_not_found(resource: str = "Resource") -> None:
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"{resource} not found",
    )


def raise_service_unavailable(detail: str = "Service temporarily unavailable") -> None:
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=detail,
    )
