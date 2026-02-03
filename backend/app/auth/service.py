from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt

from app.config import settings
from app.auth.repository import UserRepository


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRY_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def authenticate_user(
    email: str, password: str, repo: UserRepository | None = None
) -> dict | None:
    repo = repo or UserRepository()
    user = repo.find_by_email(email)
    if user is None:
        return None
    if not verify_password(password, user["password"]):
        return None
    return user
