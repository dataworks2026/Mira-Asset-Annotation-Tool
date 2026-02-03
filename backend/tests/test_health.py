def test_health_endpoint_returns_200(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "mongodb" in data


def test_health_endpoint_reports_mongodb_status(client):
    response = client.get("/api/health")
    data = response.json()
    assert data["mongodb"] in ("connected", "disconnected")
    if data["mongodb"] == "connected":
        assert data["status"] == "healthy"
    else:
        assert data["status"] == "degraded"
