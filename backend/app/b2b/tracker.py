"""B2B Receivables & Promise-to-Pay (PTP) Engine.

Tracks overdue corporate invoices across aging buckets (1-30d, 31-60d, 61-90d, 90+d),
manages Promise-to-Pay commitments, and orchestrates escalating AI dunning workflows.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class AgingBucket(str, Enum):
    BUCKET_1_30 = "1_30_days"
    BUCKET_31_60 = "31_60_days"
    BUCKET_61_90 = "61_90_days"
    BUCKET_90_PLUS = "90_plus_days"


class InvoiceStatus(str, Enum):
    OVERDUE = "overdue"
    PROMISED_TO_PAY = "promised_to_pay"
    RECOVERED = "recovered"
    ESCALATED_LEGAL = "escalated_legal"


class DunningStage(str, Enum):
    GENTLE_NUDGE = "gentle_nudge"           # Friendly WhatsApp / Email
    INVOICE_LINK = "invoice_link"           # 1-Click Razorpay Corporate Link
    FINANCE_DIRECTOR = "finance_director"   # Formal CFO / Controller Escalation
    LEGAL_NOTICE = "legal_notice"           # Policy-bounded formal notice


class PTPCommitment(BaseModel):
    promised_date: str
    promised_amount_inr: float
    recorded_at: str
    notes: str = ""


class B2BInvoice(BaseModel):
    invoice_id: str
    client_name: str
    client_contact: str
    client_email: str
    amount_inr: float
    due_date: str
    overdue_days: int
    aging_bucket: AgingBucket
    status: InvoiceStatus = InvoiceStatus.OVERDUE
    dunning_stage: DunningStage = DunningStage.GENTLE_NUDGE
    ptp: PTPCommitment | None = None
    payment_link: str
    timeline: list[str] = Field(default_factory=list)


# In-memory store for B2B Invoices
_B2B_STORE: list[B2BInvoice] = []


def seed_b2b_invoices() -> list[B2BInvoice]:
    """Generate realistic corporate B2B invoices with varying aging buckets."""
    global _B2B_STORE
    
    clients = [
        ("Zomato Media Pvt Ltd", "Rajesh Khanna", "rajesh.k@zomato.corp", 185000.0, 12, AgingBucket.BUCKET_1_30, DunningStage.GENTLE_NUDGE),
        ("Swiggy Bundl Technologies", "Ananya Deshmukh", "ananya.d@swiggy.corp", 420000.0, 24, AgingBucket.BUCKET_1_30, DunningStage.GENTLE_NUDGE),
        ("Razorpay Software Labs", "Vikram Malhotra", "vikram.m@razorpay.partner", 95000.0, 38, AgingBucket.BUCKET_31_60, DunningStage.INVOICE_LINK),
        ("Delhivery Logistics Ltd", "Karan Singhania", "karan.s@delhivery.corp", 650000.0, 45, AgingBucket.BUCKET_31_60, DunningStage.INVOICE_LINK),
        ("PhonePe Payments Pvt Ltd", "Pooja Reddy", "pooja.r@phonepe.merchants", 280000.0, 68, AgingBucket.BUCKET_61_90, DunningStage.FINANCE_DIRECTOR),
        ("Nykaa E-Retail Corp", "Aditi Sharma", "aditi.s@nykaa.vendor", 145000.0, 75, AgingBucket.BUCKET_61_90, DunningStage.FINANCE_DIRECTOR),
        ("BigBasket Supermarket", "Siddharth Verma", "siddharth.v@bigbasket.supply", 890000.0, 102, AgingBucket.BUCKET_90_PLUS, DunningStage.LEGAL_NOTICE),
        ("Zepto Quick Commerce", "Sneha Patel", "sneha.p@zepto.partners", 340000.0, 115, AgingBucket.BUCKET_90_PLUS, DunningStage.LEGAL_NOTICE),
    ]

    invoices: list[B2BInvoice] = []
    base_date = datetime.now(timezone.utc)

    for i, (cname, contact, email, amt, days, bucket, dstage) in enumerate(clients, 101):
        inv_id = f"INV-2026-{i}"
        due_dt = (base_date - timedelta(days=days)).strftime("%Y-%m-%d")
        link = f"https://rzp.io/i/corp_{hash(inv_id) % 10000000:07d}"
        
        status = InvoiceStatus.OVERDUE
        ptp = None
        timeline = [
            f"{due_dt} — Invoice generated and sent to {email}",
            f"{(base_date - timedelta(days=days-5)).strftime('%Y-%m-%d')} — Due date elapsed without settlement",
        ]

        if days == 38:
            status = InvoiceStatus.PROMISED_TO_PAY
            ptp_dt = (base_date + timedelta(days=4)).strftime("%Y-%m-%d")
            ptp = PTPCommitment(
                promised_date=ptp_dt,
                promised_amount_inr=amt,
                recorded_at=(base_date - timedelta(days=2)).strftime("%Y-%m-%d"),
                notes="Client confirmed payment batch run on Friday post-board approval."
            )
            timeline.append(f"Promise-to-Pay registered for {ptp_dt} (₹{amt:,.0f})")

        inv = B2BInvoice(
            invoice_id=inv_id,
            client_name=cname,
            client_contact=contact,
            client_email=email,
            amount_inr=amt,
            due_date=due_dt,
            overdue_days=days,
            aging_bucket=bucket,
            status=status,
            dunning_stage=dstage,
            ptp=ptp,
            payment_link=link,
            timeline=timeline,
        )
        invoices.append(inv)

    _B2B_STORE = invoices
    return _B2B_STORE


def get_all_invoices() -> list[B2BInvoice]:
    global _B2B_STORE
    if not _B2B_STORE:
        seed_b2b_invoices()
    return _B2B_STORE


def record_ptp(invoice_id: str, promised_date: str, promised_amount: float, notes: str = "") -> B2BInvoice | None:
    for inv in get_all_invoices():
        if inv.invoice_id == invoice_id:
            now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            inv.status = InvoiceStatus.PROMISED_TO_PAY
            inv.ptp = PTPCommitment(
                promised_date=promised_date,
                promised_amount_inr=promised_amount,
                recorded_at=now_str,
                notes=notes or "Promise to Pay recorded via merchant desk",
            )
            inv.timeline.append(f"{now_str} — Promise-to-Pay committed for {promised_date} (₹{promised_amount:,.0f})")
            return inv
    return None


def chase_invoice(invoice_id: str) -> dict | None:
    for inv in get_all_invoices():
        if inv.invoice_id == invoice_id:
            now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            
            # Advance dunning stage
            if inv.dunning_stage == DunningStage.GENTLE_NUDGE:
                inv.dunning_stage = DunningStage.INVOICE_LINK
                action_taken = "Dispatched 1-Click Corporate Payment Link via WhatsApp & Email"
            elif inv.dunning_stage == DunningStage.INVOICE_LINK:
                inv.dunning_stage = DunningStage.FINANCE_DIRECTOR
                action_taken = "Escalated to Corporate Controller & Finance Director"
            else:
                inv.dunning_stage = DunningStage.LEGAL_NOTICE
                action_taken = "Issued Formal Demand Notice with policy compliance lock"

            inv.timeline.append(f"{now_str} — AI Chaser: {action_taken}")
            return {
                "invoice": inv,
                "action_taken": action_taken,
                "dunning_stage": inv.dunning_stage.value,
            }
    return None


def mark_recovered(invoice_id: str) -> B2BInvoice | None:
    for inv in get_all_invoices():
        if inv.invoice_id == invoice_id:
            now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
            inv.status = InvoiceStatus.RECOVERED
            inv.timeline.append(f"{now_str} — Payment settled in full! ₹{inv.amount_inr:,.0f} recovered via Razorpay Corporate.")
            return inv
    return None
