"""Unit tests for V1 Forensics API endpoints."""

import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_v1_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "modalities" in data


def test_v1_audio_sample():
    response = client.get("/api/v1/audio/sample")
    assert response.status_code == 200
    data = response.json()
    assert "prediction" in data
    assert "timeline" in data


def test_v1_video_sample():
    response = client.get("/api/v1/video/sample")
    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] == "FAKE"
    assert data["risk_level"] == "HIGH"
    assert len(data["suspicious_intervals"]) > 0


def test_v1_image_analyze_demo_data():
    fake_img = io.BytesIO(b"fake_image_bytes_for_testing")
    response = client.post(
        "/api/v1/image/analyze",
        files={"file": ("test_portrait.png", fake_img, "image/png")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["media_type"] == "image"
    assert data["prediction"] == "FAKE"
    assert data["risk_level"] == "HIGH"
    assert data["deepfake"]["probability"] > 0.90
    assert "Grad-CAM" in data["explainability"]["summary"]


def test_cors_headers_present():
    headers = {"Origin": "http://localhost:3000"}
    response = client.get("/api/v1/health", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert response.headers.get("access-control-allow-credentials") == "true"
