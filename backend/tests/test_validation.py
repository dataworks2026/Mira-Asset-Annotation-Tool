"""Schema validation tests."""

import pytest
from app.auth.service import hash_password, create_access_token
from app.database import get_collection


@pytest.fixture(autouse=True)
def setup_and_cleanup():
    """Seed test user, clean up after."""
    users = get_collection("users")
    users.delete_many({"email": "validate@example.com"})
    users.insert_one({
        "email": "validate@example.com",
        "password": hash_password("testpass123"),
        "full_name": "Validate User",
        "role": "engineer",
    })
    yield
    users.delete_many({"email": "validate@example.com"})


@pytest.fixture
def auth_headers():
    token = create_access_token({
        "sub": "validate@example.com",
        "full_name": "Validate User",
        "role": "engineer",
    })
    return {"Authorization": f"Bearer {token}"}


# BoundingBox validation

class TestBoundingBoxValidation:
    def test_negative_x_rejected(self, client, auth_headers):
        response = client.put(
            "/api/images/fake-id/annotations",
            json={"annotations": [{
                "annotation_id": "a1",
                "bbox": {"x": -5, "y": 10, "width": 100, "height": 50},
            }]},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_zero_width_rejected(self, client, auth_headers):
        response = client.put(
            "/api/images/fake-id/annotations",
            json={"annotations": [{
                "annotation_id": "a1",
                "bbox": {"x": 10, "y": 10, "width": 0, "height": 50},
            }]},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_negative_height_rejected(self, client, auth_headers):
        response = client.put(
            "/api/images/fake-id/annotations",
            json={"annotations": [{
                "annotation_id": "a1",
                "bbox": {"x": 10, "y": 10, "width": 50, "height": -10},
            }]},
            headers=auth_headers,
        )
        assert response.status_code == 422


# AnnotationData validation

class TestAnnotationValidation:
    def test_severity_out_of_range_rejected(self, client, auth_headers):
        response = client.put(
            "/api/images/fake-id/annotations",
            json={"annotations": [{
                "annotation_id": "a1",
                "bbox": {"x": 10, "y": 10, "width": 50, "height": 50},
                "severity": 5,
            }]},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_severity_zero_rejected(self, client, auth_headers):
        response = client.put(
            "/api/images/fake-id/annotations",
            json={"annotations": [{
                "annotation_id": "a1",
                "bbox": {"x": 10, "y": 10, "width": 50, "height": 50},
                "severity": 0,
            }]},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_invalid_shape_type_rejected(self, client, auth_headers):
        response = client.put(
            "/api/images/fake-id/annotations",
            json={"annotations": [{
                "annotation_id": "a1",
                "bbox": {"x": 10, "y": 10, "width": 50, "height": 50},
                "shape_type": "triangle",
            }]},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_invalid_damage_type_rejected(self, client, auth_headers):
        response = client.put(
            "/api/images/fake-id/annotations",
            json={"annotations": [{
                "annotation_id": "a1",
                "bbox": {"x": 10, "y": 10, "width": 50, "height": 50},
                "damage_type": "XX",
            }]},
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_valid_annotation_accepted(self, client, auth_headers):
        response = client.put(
            "/api/images/fake-id/annotations",
            json={"annotations": [{
                "annotation_id": "a1",
                "bbox": {"x": 10, "y": 10, "width": 50, "height": 50},
                "shape_type": "rect",
                "damage_type": "CR",
                "severity": 2,
                "component": "DT",
            }]},
            headers=auth_headers,
        )
        # 404 not 422, validation passes
        assert response.status_code == 404


# InspectionCreate validation

class TestInspectionValidation:
    def test_invalid_date_format_rejected(self, client, auth_headers):
        response = client.post(
            "/api/inspections",
            json={
                "inspection_date": "30-01-2026",
                "asset_name": "Bridge",
                "asset_type": "bridge",
                "inspector_name": "Test",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_empty_asset_name_rejected(self, client, auth_headers):
        response = client.post(
            "/api/inspections",
            json={
                "inspection_date": "2026-01-30",
                "asset_name": "",
                "asset_type": "bridge",
                "inspector_name": "Test",
            },
            headers=auth_headers,
        )
        assert response.status_code == 422

    def test_valid_inspection_accepted(self, client, auth_headers):
        inspections = get_collection("inspections")
        response = client.post(
            "/api/inspections",
            json={
                "inspection_date": "2026-01-30",
                "asset_name": "Valid Bridge",
                "asset_type": "bridge",
                "inspector_name": "Test User",
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        # Cleanup
        data = response.json()
        inspections.delete_many({"inspection_id": data["inspection_id"]})


# LoginRequest validation

class TestLoginValidation:
    def test_invalid_email_rejected(self, client):
        response = client.post(
            "/api/auth/login",
            json={"email": "not-an-email", "password": "test"},
        )
        assert response.status_code == 422

    def test_empty_password_rejected(self, client):
        response = client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": ""},
        )
        assert response.status_code == 422
