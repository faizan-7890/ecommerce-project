"""
Order notification emails — confirmation, shipped and refunded.
Each notify_* function takes IDs rather than ORM objects and opens its own
session, because it runs as a FastAPI background task after the request's
session has been closed.
"""
import os
from decimal import Decimal
from html import escape

from sqlalchemy.orm import joinedload

from database import SessionLocal
from models import Order
from services.email import send_email


def _money(value) -> str:
    return f"₹{Decimal(str(value or 0)):,.2f}"


def _order_url(order: Order) -> str:
    base = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return f"{base}/orders/{order.id}"


def _load_order(order_id: int):
    db = SessionLocal()
    order = (
        db.query(Order)
        .options(joinedload(Order.user), joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    return db, order


def _html(heading: str, paragraphs: list[str], order: Order, rows: list[tuple[str, str]]) -> str:
    body = "".join(f"<p>{escape(p)}</p>" for p in paragraphs)
    table = "".join(
        f'<tr><td style="padding:4px 12px 4px 0">{escape(label)}</td>'
        f'<td style="padding:4px 0;text-align:right">{escape(value)}</td></tr>'
        for label, value in rows
    )
    return (
        '<div style="font-family:Arial,sans-serif;max-width:560px;color:#0f172a">'
        f"<h2>{escape(heading)}</h2>{body}"
        f'<table style="border-collapse:collapse;width:100%">{table}</table>'
        f'<p><a href="{escape(_order_url(order))}">View your order</a></p>'
        "<p style=\"color:#64748b\">Veloce</p></div>"
    )


def _text(paragraphs: list[str], order: Order, rows: list[tuple[str, str]]) -> str:
    lines = paragraphs + [""] + [f"{label}: {value}" for label, value in rows]
    return "\n".join(lines + ["", f"View your order: {_order_url(order)}", "", "Veloce"])


def _send(order: Order, subject: str, heading: str, paragraphs: list[str], rows: list[tuple[str, str]]) -> bool:
    return send_email(
        order.user.email,
        subject,
        _text(paragraphs, order, rows),
        _html(heading, paragraphs, order, rows),
    )


def notify_order_confirmed(order_id: int) -> bool:
    db, order = _load_order(order_id)
    try:
        if not order:
            return False
        rows = [
            (f"{item.product_name_snapshot} × {item.quantity}", _money(item.product_price_snapshot * item.quantity))
            for item in order.items
        ]
        if order.discount_amount:
            rows.append(("Discount", f"-{_money(order.discount_amount)}"))
        rows += [
            ("Tax", _money(order.tax_amount)),
            ("Shipping", _money(order.shipping_amount)),
            ("Total", _money(order.total)),
        ]
        name = order.user.name or "there"
        return _send(
            order,
            f"Order {order.order_number} confirmed",
            "Thanks for your order",
            [f"Hi {name}, we've received order {order.order_number} and are getting it ready."],
            rows,
        )
    finally:
        db.close()


def notify_order_shipped(order_id: int) -> bool:
    db, order = _load_order(order_id)
    try:
        if not order:
            return False
        rows = [("Order", order.order_number)]
        if order.tracking_number:
            rows.append(("Tracking number", order.tracking_number))
        return _send(
            order,
            f"Order {order.order_number} has shipped",
            "Your order is on its way",
            [f"Hi {order.user.name or 'there'}, order {order.order_number} has been shipped."],
            rows,
        )
    finally:
        db.close()


def notify_order_refunded(order_id: int, amount: Decimal, full: bool) -> bool:
    db, order = _load_order(order_id)
    try:
        if not order:
            return False
        kind = "a full" if full else "a partial"
        return _send(
            order,
            f"Refund issued for order {order.order_number}",
            "Your refund is on its way",
            [
                f"Hi {order.user.name or 'there'}, we've issued {kind} refund of {_money(amount)} "
                f"for order {order.order_number}. It goes back to your original payment method."
            ],
            [("Order", order.order_number), ("Refund amount", _money(amount))],
        )
    finally:
        db.close()
