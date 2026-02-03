import io
import pytest
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
from PIL import Image
from app.auth.service import hash_password, create_access_token
from app.database import get_collection


def _tiny_jpeg() -> bytes:
    """Create test JPEG."""
    img = Image.new("RGB", (200, 200), color=(128, 128, 128))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture(autouse=True)
def setup_and_cleanup():
    """Seed user, cleanup after."""
    users = get_collection("users")
    inspections = get_collection("inspections")
    images = get_collection("images")

    # Clean leftover test data
    images.delete_many({"image_id": {"$regex": "^test-"}})

    users.delete_many({"email": "test@example.com"})
    users.insert_one({
        "email": "test@example.com",
        "password": hash_password("testpass123"),
        "full_name": "Test User",
        "role": "engineer",
    })
    yield
    users.delete_many({"email": "test@example.com"})
    # Delete test user images
    test_inspection_ids = [
        doc["inspection_id"]
        for doc in inspections.find({"user_email": "test@example.com"})
    ]
    if test_inspection_ids:
        images.delete_many({"inspection_id": {"$in": test_inspection_ids}})
    images.delete_many({"image_id": {"$regex": "^test-"}})
    inspections.delete_many({"user_email": "test@example.com"})


@pytest.fixture
def auth_headers():
    token = create_access_token({
        "sub": "test@example.com",
        "full_name": "Test User",
        "role": "engineer",
    })
    return {"Authorization": f"Bearer {token}"}


def test_create_inspection(client, auth_headers):
    response = client.post(
        "/api/inspections",
        json={
            "inspection_date": "2026-01-30",
            "asset_name": "Test Bridge",
            "asset_type": "bridge",
            "inspector_name": "Test User",
        },
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["asset_name"] == "Test Bridge"
    assert data["asset_type"] == "bridge"
    assert data["status"] == "in_progress"
    assert data["total_images"] == 0
    assert "inspection_id" in data


def test_create_inspection_without_auth(client):
    response = client.post(
        "/api/inspections",
        json={
            "inspection_date": "2026-01-30",
            "asset_name": "Test Bridge",
            "asset_type": "bridge",
            "inspector_name": "Test User",
        },
    )
    assert response.status_code == 401


def test_list_inspections(client, auth_headers):
    # Create two
    client.post(
        "/api/inspections",
        json={
            "inspection_date": "2026-01-30",
            "asset_name": "Bridge A",
            "asset_type": "bridge",
            "inspector_name": "Test User",
        },
        headers=auth_headers,
    )
    client.post(
        "/api/inspections",
        json={
            "inspection_date": "2026-01-31",
            "asset_name": "Pier B",
            "asset_type": "pier",
            "inspector_name": "Test User",
        },
        headers=auth_headers,
    )

    response = client.get("/api/inspections", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["inspections"]) == 2


def test_get_inspection_by_id(client, auth_headers):
    create_resp = client.post(
        "/api/inspections",
        json={
            "inspection_date": "2026-01-30",
            "asset_name": "Seawall C",
            "asset_type": "seawall",
            "inspector_name": "Test User",
        },
        headers=auth_headers,
    )
    inspection_id = create_resp.json()["inspection_id"]

    response = client.get(
        f"/api/inspections/{inspection_id}", headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["inspection_id"] == inspection_id
    assert data["asset_name"] == "Seawall C"


def test_get_nonexistent_inspection(client, auth_headers):
    response = client.get(
        "/api/inspections/does-not-exist", headers=auth_headers
    )
    assert response.status_code == 404


def test_complete_inspection(client, auth_headers):
    """Sets status, sends SQS."""
    create_resp = client.post(
        "/api/inspections",
        json={
            "inspection_date": "2026-01-30",
            "asset_name": "Test Bridge",
            "asset_type": "bridge",
            "inspector_name": "Test User",
        },
        headers=auth_headers,
    )
    inspection_id = create_resp.json()["inspection_id"]

    # Mock SQS and S3
    mock_sqs = MagicMock()
    mock_sqs.send_completion_message.return_value = "msg-123"
    mock_s3 = MagicMock()
    with patch("app.inspections.service.get_sqs_service", return_value=mock_sqs), \
         patch("app.inspections.service.get_s3_service", return_value=mock_s3):
        response = client.post(
            f"/api/inspections/{inspection_id}/complete",
            headers=auth_headers,
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["completed_at"] is not None
    mock_sqs.send_completion_message.assert_called_once()


def test_complete_inspection_with_annotations(client, auth_headers):
    """Includes annotations in SQS."""
    images = get_collection("images")

    create_resp = client.post(
        "/api/inspections",
        json={
            "inspection_date": "2026-01-30",
            "asset_name": "Annotated Bridge",
            "asset_type": "bridge",
            "inspector_name": "Test User",
        },
        headers=auth_headers,
    )
    inspection_id = create_resp.json()["inspection_id"]

    # Insert annotated image
    images.insert_one({
        "image_id": "test-img-001",
        "inspection_id": inspection_id,
        "filename": "crack.jpg",
        "s3_key": "Annotated Bridge/2026-01-30/Raw/crack.jpg",
        "content_type": "image/jpeg",
        "annotation_status": "completed",
        "annotations": [
            {
                "annotation_id": "ann-001",
                "bbox": {"x": 10, "y": 20, "width": 100, "height": 50},
                "damage_type": "CR",
                "severity": 2,
                "component": "DT",
            }
        ],
        "num_annotations": 1,
        "uploaded_at": datetime(2026, 1, 30, tzinfo=timezone.utc),
    })

    mock_sqs = MagicMock()
    mock_sqs.send_completion_message.return_value = "msg-456"
    mock_s3 = MagicMock()
    # Return test JPEG
    mock_s3.download_object.return_value = _tiny_jpeg()
    with patch("app.inspections.service.get_sqs_service", return_value=mock_sqs), \
         patch("app.inspections.service.get_s3_service", return_value=mock_s3):
        response = client.post(
            f"/api/inspections/{inspection_id}/complete",
            headers=auth_headers,
        )

    assert response.status_code == 200
    assert response.json()["status"] == "completed"

    # Verify render and upload
    mock_s3.download_object.assert_called_once()
    mock_s3.upload_object.assert_called_once()
    upload_call = mock_s3.upload_object.call_args
    assert "/Annotated/" in upload_call[0][0]
    assert upload_call[0][2] == "image/jpeg"

    # Verify SQS annotations
    call_args = mock_sqs.send_completion_message.call_args
    annotations_summary = call_args[0][1]
    assert len(annotations_summary) == 1
    assert annotations_summary[0]["damage_type"] == "CR"
    assert annotations_summary[0]["image_id"] == "test-img-001"


def test_complete_inspection_already_completed(client, auth_headers):
    """Re-completing returns without error."""
    create_resp = client.post(
        "/api/inspections",
        json={
            "inspection_date": "2026-01-30",
            "asset_name": "Already Done Bridge",
            "asset_type": "bridge",
            "inspector_name": "Test User",
        },
        headers=auth_headers,
    )
    inspection_id = create_resp.json()["inspection_id"]

    # First completion
    mock_sqs = MagicMock()
    mock_sqs.send_completion_message.return_value = "msg-789"
    mock_s3 = MagicMock()
    with patch("app.inspections.service.get_sqs_service", return_value=mock_sqs), \
         patch("app.inspections.service.get_s3_service", return_value=mock_s3):
        client.post(
            f"/api/inspections/{inspection_id}/complete",
            headers=auth_headers,
        )

    # Second completion, no SQS
    mock_sqs2 = MagicMock()
    mock_s3_2 = MagicMock()
    with patch("app.inspections.service.get_sqs_service", return_value=mock_sqs2), \
         patch("app.inspections.service.get_s3_service", return_value=mock_s3_2):
        response = client.post(
            f"/api/inspections/{inspection_id}/complete",
            headers=auth_headers,
        )

    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    mock_sqs2.send_completion_message.assert_not_called()


def test_complete_nonexistent_inspection(client, auth_headers):
    """Nonexistent returns 404."""
    mock_sqs = MagicMock()
    with patch("app.inspections.service.get_sqs_service", return_value=mock_sqs):
        response = client.post(
            "/api/inspections/does-not-exist/complete",
            headers=auth_headers,
        )
    assert response.status_code == 404
