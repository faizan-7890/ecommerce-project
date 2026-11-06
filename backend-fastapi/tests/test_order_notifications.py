import pytest

from models import Payment
from routers.payments import MOCK_SIGNATURE
from services import order_notifications


@pytest.fixture
def outbox(monkeypatch):
    """Captures every email the order notifications try to send."""
    sent = []
    monkeypatch.setattr(
        order_notifications, "send_email",
        lambda to, subject, text, html=None: sent.append({"to": to, "subject": subject, "text": text}) or True,
    )
    return sent


def _checkout(client, variant, address, method):
    client.post("/api/cart/items", json={"productId": variant.product_id, "variantId": variant.id, "quantity": 2})
    resp = client.post("/api/orders", json={"shippingAddressId": address.id, "paymentMethod": method})
    assert resp.status_code == 201, resp.text
    return resp.json()


def _pay(client, order_id, times=1):
    rzp = client.post("/api/payments/create-order", json={"orderId": order_id}).json()
    for _ in range(times):
        resp = client.post("/api/payments/verify", json={
            "razorpay_order_id": rzp["razorpayOrderId"],
            "razorpay_payment_id": "pay_123",
            "razorpay_signature": MOCK_SIGNATURE,
        })
        assert resp.status_code == 200, resp.text


def test_cod_order_is_confirmed_at_checkout_with_line_items_and_totals(outbox, customer, variant, address, client_as, monkeypatch):
    monkeypatch.setenv("FRONTEND_URL", "https://veloce.shop")
    order = _checkout(client_as(customer), variant, address, "cod")

    assert len(outbox) == 1
    mail = outbox[0]
    assert mail["to"] == "customer@example.com"
    assert mail["subject"] == f"Order {order['orderNumber']} confirmed"
    assert "Tee (M/Black) × 2: ₹1,000.00" in mail["text"]
    assert "Total: ₹1,080.00" in mail["text"]
    assert f"https://veloce.shop/orders/{order['id']}" in mail["text"]


def test_card_order_is_confirmed_only_once_payment_succeeds(outbox, customer, variant, address, client_as):
    client = client_as(customer)
    order = _checkout(client, variant, address, "card")
    assert outbox == []

    _pay(client, order["id"], times=2)  # a retried verify must not re-send

    assert [m["subject"] for m in outbox] == [f"Order {order['orderNumber']} confirmed"]


def test_shipped_email_sent_once_with_tracking_number(outbox, db, customer, admin, variant, address, client_as):
    order = _checkout(client_as(customer), variant, address, "cod")
    outbox.clear()
    admin_client = client_as(admin)
    url = f"/api/admin/orders/{order['id']}/status"

    admin_client.put(url, json={"orderStatus": "processing"})
    assert outbox == []
    admin_client.put(url, json={"shipmentStatus": "shipped", "trackingNumber": "DTDC123456"})
    admin_client.put(url, json={"orderStatus": "shipped"})  # second dropdown, same shipment

    assert len(outbox) == 1
    assert outbox[0]["subject"] == f"Order {order['orderNumber']} has shipped"
    assert "Tracking number: DTDC123456" in outbox[0]["text"]


def test_refund_email_states_amount_and_whether_full(outbox, db, customer, admin, variant, address, client_as):
    client = client_as(customer)
    order = _checkout(client, variant, address, "card")
    _pay(client, order["id"])
    outbox.clear()
    payment_id = db.query(Payment).filter(Payment.order_id == order["id"]).one().id
    admin_client = client_as(admin)

    admin_client.post("/api/payments/refund", json={"paymentId": payment_id, "amount": "80.00", "reason": "Late"})
    admin_client.post("/api/payments/refund", json={"paymentId": payment_id, "amount": "1000.00", "reason": "Returned"})

    assert [m["subject"] for m in outbox] == [f"Refund issued for order {order['orderNumber']}"] * 2
    assert "a partial refund of ₹80.00" in outbox[0]["text"]
    assert "a full refund of ₹1,000.00" in outbox[1]["text"]


def test_email_failure_does_not_fail_checkout(monkeypatch, customer, variant, address, client_as):
    monkeypatch.setenv("SMTP_HOST", "127.0.0.1")
    monkeypatch.setenv("SMTP_PORT", "1")  # nothing listens here, so the connection is refused

    order = _checkout(client_as(customer), variant, address, "cod")

    assert order["orderStatus"] == "pending"
