from models import Order
from tests.conftest import stock_of


def _add_to_cart(client, variant, quantity):
    resp = client.post("/api/cart/items", json={
        "productId": variant.product_id, "variantId": variant.id, "quantity": quantity,
    })
    assert resp.status_code == 201, resp.text


def test_checkout_decrements_stock_prices_order_and_clears_cart(db, customer, variant, address, client_as):
    client = client_as(customer)
    _add_to_cart(client, variant, 2)

    resp = client.post("/api/orders", json={"shippingAddressId": address.id, "paymentMethod": "cod"})

    assert resp.status_code == 201, resp.text
    order = resp.json()
    # 2 x ₹500 = 1000, 8% tax, free shipping above 100
    assert order["subtotal"] == "1000.00"
    assert order["taxAmount"] == "80.00"
    assert order["shippingAmount"] == "0.00"
    assert order["total"] == "1080.00"
    assert stock_of(db, variant.id) == 3
    assert client.get("/api/cart").json()["items"] == []


def test_checkout_rejects_quantity_beyond_stock(db, customer, variant, address, client_as):
    client = client_as(customer)
    _add_to_cart(client, variant, 4)
    _add_to_cart(client, variant, 4)  # cart now holds 8 of the 5 in stock

    resp = client.post("/api/orders", json={"shippingAddressId": address.id, "paymentMethod": "cod"})

    assert resp.status_code == 400
    assert "Insufficient stock" in resp.json()["detail"]
    assert stock_of(db, variant.id) == 5


def test_idempotency_key_returns_the_same_order(db, customer, variant, address, client_as):
    client = client_as(customer)
    _add_to_cart(client, variant, 1)
    headers = {"X-Idempotency-Key": "checkout-123"}
    body = {"shippingAddressId": address.id, "paymentMethod": "cod"}

    first = client.post("/api/orders", json=body, headers=headers)
    second = client.post("/api/orders", json=body, headers=headers)

    assert first.status_code == 201 and second.status_code == 201
    assert first.json()["id"] == second.json()["id"]
    assert stock_of(db, variant.id) == 4


def test_cancelling_pending_order_restores_stock_once(db, customer, variant, address, client_as):
    client = client_as(customer)
    _add_to_cart(client, variant, 2)
    order_id = client.post("/api/orders", json={"shippingAddressId": address.id, "paymentMethod": "cod"}).json()["id"]

    assert client.put(f"/api/orders/{order_id}/cancel").status_code == 200
    assert client.put(f"/api/orders/{order_id}/cancel").status_code == 400
    assert stock_of(db, variant.id) == 5


def test_timestamps_are_generated_per_row_not_at_import():
    # A non-callable default would stamp every row with the server start time
    assert Order.__table__.c.created_at.default.is_callable
    assert Order.__table__.c.updated_at.onupdate.is_callable
