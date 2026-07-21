"""
Payments router — Razorpay integration, verification, webhooks, refunds.
"""
import os
import hmac
import hashlib
import random
import string
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user, require_admin
from models import Order, Payment, Refund, ProcessedWebhookEvent, User
from schemas import PaymentCreateOrder, PaymentVerify, AdminRefundCreate, MessageResponse
from services.inventory import restore_order_stock
from services.order_state import PAID_ORDER_STATUS

router = APIRouter(prefix="/api/payments", tags=["Payments"])

MOCK_SIGNATURE = "mock_valid_signature_veloce_2026"


def _is_placeholder(val: str) -> bool:
    return not val or val.startswith("rzp_test_...") or val == "your_secret_..."


def _get_razorpay_client():
    key_id = os.getenv("RAZORPAY_KEY_ID", "")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")

    if _is_placeholder(key_id) or _is_placeholder(key_secret):
        return None  # Use mock mode

    try:
        import razorpay
        return razorpay.Client(auth=(key_id, key_secret))
    except Exception:
        return None


def _build_mock_order(amount_paise: int, order_id: int) -> dict:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=9))
    return {
        "id": f"rzp_order_mock_{suffix}",
        "amount": amount_paise,
        "currency": "INR",
        "notes": {"orderId": str(order_id)},
    }


def _mark_payment_paid(db: Session, payment: Payment, razorpay_payment_id: str, razorpay_order_id: str):
    if payment.status == "paid":
        return

    payment.status = "paid"
    payment.razorpay_payment_id = razorpay_payment_id
    if razorpay_order_id:
        payment.razorpay_order_id = razorpay_order_id

    order = db.query(Order).filter(Order.id == payment.order_id).first()
    if order:
        order.payment_status = "paid"
        order.order_status = PAID_ORDER_STATUS
        order.expires_at = None


# ─── Create Razorpay Order ───────────────────────────────────────────────────
@router.post("/create-order")
def create_payment_order(
    data: PaymentCreateOrder,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    order = db.query(Order).filter(Order.id == data.order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Order already paid")

    amount_paise = int(float(order.total) * 100)
    client = _get_razorpay_client()

    if client:
        try:
            rzp_order = client.order.create({
                "amount": amount_paise,
                "currency": "INR",
                "notes": {"orderId": str(order.id)},
            })
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Razorpay error: {str(e)}")
    else:
        rzp_order = _build_mock_order(amount_paise, order.id)

    # Link Razorpay order to payment record
    payment = db.query(Payment).filter(Payment.order_id == order.id).first()
    if payment:
        payment.razorpay_order_id = rzp_order["id"]
        db.commit()

    return {
        "razorpayOrderId": rzp_order["id"],
        "amount": rzp_order["amount"],
        "currency": rzp_order.get("currency", "INR"),
        "orderId": order.id,
        "orderNumber": order.order_number,
        "keyId": os.getenv("RAZORPAY_KEY_ID", ""),
    }


# ─── Verify Payment ─────────────────────────────────────────────────────────
@router.post("/verify")
def verify_payment(
    data: PaymentVerify,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    payment = db.query(Payment).filter(Payment.razorpay_order_id == data.razorpay_order_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Mock mode check
    if data.razorpay_signature == MOCK_SIGNATURE:
        _mark_payment_paid(db, payment, data.razorpay_payment_id, data.razorpay_order_id)
        db.commit()
        return {"verified": True, "message": "Payment verified (mock mode)"}

    # Real signature verification
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
    body = f"{data.razorpay_order_id}|{data.razorpay_payment_id}"
    expected = hmac.new(
        key_secret.encode("utf-8"),
        body.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, data.razorpay_signature):
        raise HTTPException(status_code=400, detail="Payment verification failed")

    _mark_payment_paid(db, payment, data.razorpay_payment_id, data.razorpay_order_id)
    db.commit()

    return {"verified": True, "message": "Payment verified successfully"}


# ─── Webhook ─────────────────────────────────────────────────────────────────
@router.post("/webhook")
async def payment_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

    if webhook_secret and signature:
        expected = hmac.new(
            webhook_secret.encode("utf-8"),
            body,
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    import json
    payload = json.loads(body)
    event_type = payload.get("event", "")
    event_id = payload.get("payload", {}).get("payment", {}).get("entity", {}).get("id", "")

    event_key = f"{event_type}:{event_id}"

    # Idempotency check
    existing = db.query(ProcessedWebhookEvent).filter(ProcessedWebhookEvent.event_key == event_key).first()
    if existing:
        return {"status": "already_processed"}

    db.add(ProcessedWebhookEvent(event_key=event_key, event_type=event_type))

    if event_type == "payment.captured":
        entity = payload["payload"]["payment"]["entity"]
        rzp_order_id = entity.get("order_id")
        rzp_payment_id = entity.get("id")

        payment = db.query(Payment).filter(Payment.razorpay_order_id == rzp_order_id).first()
        if payment:
            _mark_payment_paid(db, payment, rzp_payment_id, rzp_order_id)

    db.commit()
    return {"status": "ok"}


# ─── Admin: Process Refund ───────────────────────────────────────────────────
@router.post("/refund", status_code=201)
def process_refund(
    data: AdminRefundCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    payment = db.query(Payment).filter(Payment.id == data.payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    order = db.query(Order).filter(Order.id == payment.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    client = _get_razorpay_client()
    razorpay_refund_id = None

    if client and payment.razorpay_payment_id:
        try:
            rzp_refund = client.payment.refund(payment.razorpay_payment_id, {
                "amount": int(float(data.amount) * 100),
            })
            razorpay_refund_id = rzp_refund.get("id")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Razorpay refund error: {str(e)}")

    refund = Refund(
        payment_id=payment.id,
        order_id=order.id,
        amount=data.amount,
        reason=data.reason,
        status="completed",
        razorpay_refund_id=razorpay_refund_id,
    )
    db.add(refund)

    order.refund_status = "completed"
    order.payment_status = "refunded"

    # Restore stock
    from sqlalchemy.orm import joinedload as jl
    order_with_items = db.query(Order).options(jl(Order.items)).filter(Order.id == order.id).first()
    if order_with_items and not order_with_items.stock_restored:
        restore_order_stock(db, order_with_items, "refund", f"admin_{user.id}")

    db.commit()

    return {
        "message": "Refund processed successfully",
        "refund_id": refund.id,
        "razorpay_refund_id": razorpay_refund_id,
    }
