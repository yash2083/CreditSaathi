from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "creditsaathi-ml"
    assert "model_version" in data


def test_score_endpoint():
    payload = {
        "gst_filing_rate": 0.9,
        "gst_on_time_rate": 0.85,
        "avg_monthly_revenue": 500000,
        "revenue_growth_rate": 12.5,
        "avg_net_cash_flow": 200000,
        "cash_flow_volatility": 50000,
        "upi_volume_growth": 15.0,
        "cheque_bounce_rate": 0.05,
        "vendor_payment_score": 0.88,
        "nil_return_ratio": 0.1,
    }
    response = client.post("/score", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert 300 <= data["score"] <= 850
    assert data["risk_category"] in ["Low", "Medium", "High"]
    assert "shap_values" in data
    assert "model_version" in data


def test_score_validation_error():
    response = client.post("/score", json={"gst_filing_rate": 0.9})
    assert response.status_code == 422
