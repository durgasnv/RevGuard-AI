"""Tests for CSV/Excel ingestion, summary, and edge-case endpoints."""

import io
import json
import csv

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestCSVIngest:
    def setup_method(self):
        client.post("/reset")

    def _make_csv(self, rows: list[dict]) -> str:
        buf = io.StringIO()
        writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
        return buf.getvalue()

    def test_csv_ingest_success(self):
        csv_content = self._make_csv([
            {
                "transaction_id": "txn_csv_001",
                "amount_inr": "500.00",
                "currency": "INR",
                "payment_method": "upi",
                "status": "failed",
                "failure_code": "bad_account",
                "failure_category": "customer_related",
                "timestamp": "2025-08-01T10:00:00",
                "retry_count": "1",
            },
            {
                "transaction_id": "txn_csv_002",
                "amount_inr": "1200.50",
                "currency": "INR",
                "payment_method": "card",
                "status": "success",
                "failure_code": "",
                "failure_category": "",
                "timestamp": "2025-08-01T11:00:00",
                "retry_count": "0",
            },
        ])
        resp = client.post(
            "/ingest/csv",
            content=csv_content.encode("utf-8"),
            headers={"Content-Type": "text/csv"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ingested"] == 2
        assert data["store_total"] == 2

    def test_csv_ingest_empty(self):
        resp = client.post(
            "/ingest/csv",
            content=b"transaction_id,amount_inr\n",
            headers={"Content-Type": "text/csv"},
        )
        assert resp.status_code == 422

    def test_csv_ingest_razorpay(self):
        razorpay_csv = (
            "payment_id,order_id,amount,currency,method,status,error_code,created_at,customer_contact\n"
            "pay_rp001,order_001,150000,INR,upi,failed,bad_account,2025-08-01 10:00:00,customer@test.com\n"
            "pay_rp002,order_002,250000,INR,card,captured,,2025-08-01 11:00:00,customer2@test.com\n"
        )
        resp = client.post(
            "/ingest/csv?razorpay=true",
            content=razorpay_csv.encode("utf-8"),
            headers={"Content-Type": "text/csv"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ingested"] == 2

    def test_csv_ingest_non_utf8(self):
        resp = client.post(
            "/ingest/csv",
            content=b"\xff\xfe invalid",
            headers={"Content-Type": "text/csv"},
        )
        assert resp.status_code == 400


class TestExcelIngest:
    def setup_method(self):
        client.post("/reset")

    def test_excel_ingest_success(self):
        try:
            import openpyxl
        except ImportError:
            pytest.skip("openpyxl not installed")

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["transaction_id", "amount_inr", "currency", "payment_method",
                    "status", "failure_code", "failure_category", "timestamp", "retry_count"])
        ws.append(["txn_xl_001", 750, "INR", "wallet", "failed", "insufficient_funds",
                    "customer_related", "2025-08-01T10:00:00", 0])
        ws.append(["txn_xl_002", 2000, "INR", "upi", "success", "", "",
                    "2025-08-01T11:00:00", 1])

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        resp = client.post(
            "/ingest/excel",
            content=buf.read(),
            headers={"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["ingested"] == 2
        assert data["store_total"] == 2

    def test_excel_empty_sheet(self):
        try:
            import openpyxl
        except ImportError:
            pytest.skip("openpyxl not installed")

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["col1", "col2"])
        # no data rows

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)

        resp = client.post(
            "/ingest/excel",
            content=buf.read(),
            headers={"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
        )
        assert resp.status_code == 422


class TestSummary:
    def setup_method(self):
        client.post("/reset")

    def test_summary_no_data(self):
        resp = client.post("/summary")
        assert resp.status_code == 409

    def test_summary_with_data(self):
        client.post("/ingest/synthetic?n_total=100")
        resp = client.post("/summary")
        assert resp.status_code == 200
        data = resp.json()
        assert "totals" in data
        assert "breakdowns" in data
        assert "by_category" in data["breakdowns"]
        assert data["totals"]["transactions"] == 100

    def test_summary_with_period(self):
        client.post("/ingest/synthetic?n_total=50")
        resp = client.post("/summary?period=weekly")
        assert resp.status_code == 200
        data = resp.json()
        assert data["period"] == "weekly"
        assert data["totals"]["transactions"] >= 1


class TestTransactions:
    def setup_method(self):
        client.post("/reset")

    def test_transactions_empty(self):
        resp = client.get("/transactions")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_transactions_with_filter(self):
        client.post("/ingest/synthetic?n_total=100")
        resp = client.get("/transactions?status=failed")
        assert resp.status_code == 200
        data = resp.json()
        assert all(t["status"] == "failed" for t in data)

    def test_transactions_no_filter(self):
        client.post("/ingest/synthetic?n_total=50")
        resp = client.get("/transactions")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
