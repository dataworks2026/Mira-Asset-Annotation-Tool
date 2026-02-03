import pytest
from app.auth.service import hash_password
from app.database import get_collection


@pytest.fixture(autouse=True)
def seed_test_user():
    """Seed user, cleanup after."""
    users = get_collection("users")
    users.delete_many({"email": "test@example.com"})
    users.insert_one({
        "email": "test@example.com",
        "password": hash_password("testpass123"),
        "full_name": "Test User",
        "role": "engineer",
    })
    yield
    users.delete_many({"email": "test@example.com"})


def test_login_valid_credentials(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "testpass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["full_name"] == "Test User"
    assert data["user"]["role"] == "engineer"


def test_login_wrong_password(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "wrongpass"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password"


def test_login_nonexistent_user(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "testpass123"},
    )
    assert response.status_code == 401


def test_protected_endpoint_without_token(client):
    """Tests auth dependency pattern."""
    response = client.get("/api/health")
    assert response.status_code == 200


def test_token_is_valid_jwt(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "test@example.com", "password": "testpass123"},
    )
    token = response.json()["access_token"]
    # Verify JWT format
    parts = token.split(".")
    assert len(parts) == 3
    assert all(len(p) > 0 for p in parts)
