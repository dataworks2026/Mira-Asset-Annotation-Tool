from fastapi import APIRouter, HTTPException, status

from app.auth.schemas import LoginRequest, TokenResponse, UserInfo
from app.auth.service import authenticate_user, create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest):
    user = authenticate_user(request.email, request.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    access_token = create_access_token(
        data={
            "sub": user["email"],
            "full_name": user["full_name"],
            "role": user["role"],
        }
    )

    return TokenResponse(
        access_token=access_token,
        user=UserInfo(
            email=user["email"],
            full_name=user["full_name"],
            role=user["role"],
        ),
    )
