import hashlib
import hmac

import pytest

from models import Order, Payment
from routers.payments import MOCK_SIGNATURE
from tests.conftest import stock_of


@pytest.fixture
def card_order(db, customer, variant, address, client_as):
    """A ₹540 (500 + 8% tax) unpaid card order for one unit, with its Razorpay order created."""
    client = client_as(customer)
    client.post("/api/cart/items", json={"productId": variant.product_id, "variantId": variant.id, "quantity": 1})
    order = client.post("/api/orders", json={"shippingAddressId": address.id, "paymentMethod": "card"}).json()
    rzp = client.post("/api/payments/create-order", json={"orderId": order["id"]}).json()
    return {"id": order["id"], "razorpay_order_id": rzp["razorpayOrderId"], "client": client}


def _verify(card_order, signature, payment_id="pay_123"):
    return card_order["client"].post("/api/payments/verify", json={
        "razorpay_order_id": card_order["razorpay_order_id"],
        "razorpay_payment_id": payment_id,
        "razorpay_signature": signature,
    })


def _payment_status(db, order_id):
    db.expire_all()
    return db.get(Order, order_id).payment_status


def test_mock_signature_accepted_in_mock_mode(db, card_order):
    resp = _verify(card_order, MOCK_SIGNATURE)

    assert resp.status_code == 200
    assert _payment_status(db, card_order["id"]) == "paid"


def test_mock_signature_rejected_when_real_keys_configured(db, card_order, monkeypatch):
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_realkey")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "real_secret")

    resp = _verify(card_order, MOCK_SIGNATURE)

    assert resp.status_code == 400
    assert _payment_status(db, card_order["id"]) == "unpaid"


def test_mock_signature_rejected_in_production(db, card_order, monkeypatch):
    monkeypatch.setenv("NODE_ENV", "production")

    resp = _verify(card_order, MOCK_SIGNATURE)

    assert resp.status_code == 400
    assert _payment_status(db, card_order["id"]) == "unpaid"


def test_genuine_razorpay_signature_accepted(db, card_order, monkeypatch):
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_realkey")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "real_secret")
    body = f"{card_order['razorpay_order_id']}|pay_123".encode()
    signature = hmac.new(b"real_secret", body, hashlib.sha256).hexdigest()

    resp = _verify(card_order, signature)

    assert resp.status_code == 200
    assert _payment_status(db, card_order["id"]) == "paid"


def test_partial_refund_keeps_stock_and_full_refund_restores_it(db, admin, variant, card_order, client_as):
    assert _verify(card_order, MOCK_SIGNATURE).status_code == 200
    payment_id = db.query(Payment).filter(Payment.order_id == card_order["id"]).one().id
    admin_client = client_as(admin)

    partial = admin_client.post("/api/payments/refund", json={"paymentId": payment_id, "amount": "100.00", "reason": "Late delivery"})
    assert partial.status_code == 201, partial.text
    assert _payment_status(db, card_order["id"]) == "partially_refunded"
    assert stock_of(db, variant.id) == 4

    rest = admin_client.post("/api/payments/refund", json={"paymentId": payment_id, "amount": "440.00", "reason": "Returned"})
    assert rest.status_code == 201, rest.text
    assert _payment_status(db, card_order["id"]) == "refunded"
    assert stock_of(db, variant.id) == 5


def test_refund_cannot_exceed_amount_paid(db, admin, card_order, client_as):
    _verify(card_order, MOCK_SIGNATURE)
    payment_id = db.query(Payment).filter(Payment.order_id == card_order["id"]).one().id

    resp = client_as(admin).post("/api/payments/refund", json={"paymentId": payment_id, "amount": "540.01", "reason": "x"})

    assert resp.status_code == 400


def test_customers_cannot_issue_refunds(db, customer, card_order, client_as):
    _verify(card_order, MOCK_SIGNATURE)
    payment_id = db.query(Payment).filter(Payment.order_id == card_order["id"]).one().id

    resp = client_as(customer).post("/api/payments/refund", json={"paymentId": payment_id, "amount": "10", "reason": "x"})

    assert resp.status_code == 403
