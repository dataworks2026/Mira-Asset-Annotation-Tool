import pytest
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
from app.auth.service import hash_password, create_access_token
from app.database import get_collection


@pytest.fixture(autouse=True)
def setup_and_cleanup():
    """Seed user and inspection."""
    users = get_collection("users")
    inspections = get_collection("inspections")
    images = get_collection("images")

    users.delete_many({"email": "test@example.com"})
    users.insert_one({
        "email": "test@example.com",
        "password": hash_password("testpass123"),
        "full_name": "Test User",
        "role": "engineer",
    })

    inspections.delete_many({"inspection_id": "test-insp-001"})
    inspections.insert_one({
        "inspection_id": "test-insp-001",
        "inspection_date": "2026-01-30",
        "asset_name": "Test Bridge",
        "asset_type": "bridge",
        "inspector_name": "Test User",
        "status": "in_progress",
        "total_images": 0,
        "user_email": "test@example.com",
        "created_at": datetime(2026, 1, 30, tzinfo=timezone.utc),
        "completed_at": None,
    })

    yield

    users.delete_many({"email": "test@example.com"})
    inspections.delete_many({"inspection_id": "test-insp-001"})
    images.delete_many({"inspection_id": "test-insp-001"})


@pytest.fixture
def auth_headers():
    token = create_access_token({
        "sub": "test@example.com",
        "full_name": "Test User",
        "role": "engineer",
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def mock_s3():
    """Mock S3 for tests."""
    mock_service = MagicMock()
    mock_service.generate_presigned_upload_url.return_value = (
        "https://s3.example.com/upload?presigned=true"
    )
    mock_service.generate_presigned_download_url.return_value = (
        "https://s3.example.com/download?presigned=true"
    )
    with patch("app.images.service.get_s3_service", return_value=mock_service):
        yield mock_service


def test_request_upload_urls(client, auth_headers):
    response = client.post(
        "/api/inspections/test-insp-001/upload-urls",
        json={
            "files": [
                {"filename": "photo1.jpg", "content_type": "image/jpeg"},
                {"filename": "photo2.png", "content_type": "image/png"},
            ]
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["upload_urls"]) == 2
    assert data["upload_urls"][0]["filename"] == "photo1.jpg"
    assert "upload_url" in data["upload_urls"][0]
    assert "image_id" in data["upload_urls"][0]
    assert "s3_key" in data["upload_urls"][0]


def test_upload_creates_image_documents(client, auth_headers):
    client.post(
        "/api/inspections/test-insp-001/upload-urls",
        json={
            "files": [
                {"filename": "photo1.jpg", "content_type": "image/jpeg"},
            ]
        },
        headers=auth_headers,
    )

    images = get_collection("images")
    docs = list(images.find({"inspection_id": "test-insp-001"}))
    assert len(docs) == 1
    assert docs[0]["filename"] == "photo1.jpg"
    assert docs[0]["annotation_status"] == "not_started"
    assert docs[0]["annotations"] == []


def test_list_images_for_inspection(client, auth_headers):
    # Create images
    client.post(
        "/api/inspections/test-insp-001/upload-urls",
        json={
            "files": [
                {"filename": "a.jpg", "content_type": "image/jpeg"},
                {"filename": "b.jpg", "content_type": "image/jpeg"},
            ]
        },
        headers=auth_headers,
    )

    response = client.get(
        "/api/inspections/test-insp-001/images",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["images"]) == 2
    assert "s3_url" in data["images"][0]


def test_get_single_image(client, auth_headers):
    resp = client.post(
        "/api/inspections/test-insp-001/upload-urls",
        json={
            "files": [
                {"filename": "single.jpg", "content_type": "image/jpeg"},
            ]
        },
        headers=auth_headers,
    )
    image_id = resp.json()["upload_urls"][0]["image_id"]

    response = client.get(f"/api/images/{image_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["image_id"] == image_id
    assert data["filename"] == "single.jpg"
    assert data["s3_url"] is not None


def test_get_nonexistent_image(client, auth_headers):
    response = client.get("/api/images/does-not-exist", headers=auth_headers)
    assert response.status_code == 404


def test_upload_rejects_invalid_content_type(client, auth_headers):
    response = client.post(
        "/api/inspections/test-insp-001/upload-urls",
        json={
            "files": [
                {"filename": "doc.pdf", "content_type": "application/pdf"},
            ]
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    # Invalid types skipped
    assert len(data["upload_urls"]) == 0


def test_save_annotations(client, auth_headers):
    # Create image
    resp = client.post(
        "/api/inspections/test-insp-001/upload-urls",
        json={
            "files": [
                {"filename": "annotate.jpg", "content_type": "image/jpeg"},
            ]
        },
        headers=auth_headers,
    )
    image_id = resp.json()["upload_urls"][0]["image_id"]

    annotations = [
        {
            "annotation_id": "ann-001",
            "bbox": {"x": 10, "y": 20, "width": 100, "height": 50},
            "damage_type": "CR",
            "severity": 2,
            "component": "DT",
            "notes": "Hairline crack",
        },
        {
            "annotation_id": "ann-002",
            "bbox": {"x": 200, "y": 300, "width": 80, "height": 60},
        },
    ]

    response = client.put(
        f"/api/images/{image_id}/annotations",
        json={"annotations": annotations},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["num_annotations"] == 2
    assert data["annotation_status"] == "in_progress"
    assert len(data["annotations"]) == 2
    assert data["annotations"][0]["damage_type"] == "CR"
    assert data["annotations"][0]["severity"] == 2


def test_save_annotations_fully_labeled_marks_completed(client, auth_headers):
    resp = client.post(
        "/api/inspections/test-insp-001/upload-urls",
        json={
            "files": [
                {"filename": "complete.jpg", "content_type": "image/jpeg"},
            ]
        },
        headers=auth_headers,
    )
    image_id = resp.json()["upload_urls"][0]["image_id"]

    # Fully labeled annotations
    annotations = [
        {
            "annotation_id": "ann-003",
            "bbox": {"x": 10, "y": 20, "width": 100, "height": 50},
            "damage_type": "SP",
            "severity": 3,
            "component": "CP",
        },
    ]

    response = client.put(
        f"/api/images/{image_id}/annotations",
        json={"annotations": annotations},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["annotation_status"] == "completed"


def test_save_annotations_empty_resets_status(client, auth_headers):
    resp = client.post(
        "/api/inspections/test-insp-001/upload-urls",
        json={
            "files": [
                {"filename": "reset.jpg", "content_type": "image/jpeg"},
            ]
        },
        headers=auth_headers,
    )
    image_id = resp.json()["upload_urls"][0]["image_id"]

    # Empty annotations
    response = client.put(
        f"/api/images/{image_id}/annotations",
        json={"annotations": []},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["annotation_status"] == "not_started"
    assert data["num_annotations"] == 0


def test_save_annotations_nonexistent_image(client, auth_headers):
    response = client.put(
        "/api/images/does-not-exist/annotations",
        json={"annotations": []},
        headers=auth_headers,
    )
    assert response.status_code == 404
