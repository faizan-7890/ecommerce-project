"""
Orders router — concurrency-safe checkout with row-level locking, cancellation.
"""
import time
import os
import random
import string
from decimal import Decimal
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from database import get_db
from dependencies import get_current_user
from models import (
    Order, OrderItem, Cart, CartItem, Address, Payment, Coupon, CouponUsage,
    InventoryLog, User,
)
from schemas import OrderCreate, OrderOut, MessageResponse
from services.inventory import decrement_variant_stock, restore_order_stock
from services.pricing import calculate_item_price, calculate_order_totals
from services.order_state import can_restore_stock
from typing import List, Optional

router = APIRouter(prefix="/api/orders", tags=["Orders"])

ORDER_EXPIRY_MINUTES = int(os.getenv("ORDER_EXPIRY_MINUTES", "30"))


def _generate_order_number() -> str:
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"ORD-{int(time.time())}-{suffix}"


# ─── Create Order (Concurrency-Safe Checkout) ───────────────────────────────
@router.post("", response_model=OrderOut, status_code=201)
def create_order(
    data: OrderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    x_idempotency_key: Optional[str] = Header(None, alias="X-Idempotency-Key"),
):
    # 1. Idempotency check
    if x_idempotency_key:
        existing = db.query(Order).filter(Order.idempotency_key == x_idempotency_key).first()
        if existing:
            if existing.user_id != user.id:
                raise HTTPException(status_code=409, detail="Idempotency key conflict")
            return existing

    # 2. Validate shipping address
    ship_addr = db.query(Address).filter(
        Address.id == data.shipping_address_id, Address.user_id == user.id
    ).first()
    if not ship_addr:
        raise HTTPException(status_code=400, detail="Invalid shippingAddressId")

    bill_addr = ship_addr
    if data.billing_address_id:
        ba = db.query(Address).filter(
            Address.id == data.billing_address_id, Address.user_id == user.id
        ).first()
        if ba:
            bill_addr = ba

    def _format_snapshot(addr):
        return {
            "fullName": addr.full_name,
            "phoneNumber": addr.phone_number,
            "addressLine1": addr.address_line1,
            "addressLine2": addr.address_line2,
            "city": addr.city,
            "state": addr.state,
            "postalCode": addr.postal_code,
            "country": addr.country,
            "addressType": addr.address_type,
        }

    # 3. Fetch cart with items
    cart = (
        db.query(Cart)
        .options(
            joinedload(Cart.items).joinedload(CartItem.product),
            joinedload(Cart.items).joinedload(CartItem.variant),
        )
        .filter(Cart.user_id == user.id)
        .first()
    )
    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Your shopping cart is empty")

    # Calculate subtotal
    subtotal = Decimal("0")
    for item in cart.items:
        base = Decimal(str(item.variant.price)) if item.variant and item.variant.price else Decimal(str(item.product.base_price))
        final = calculate_item_price(base, item.product.discount_price)
        subtotal += final * item.quantity

    # 4. Pre-load coupon
    coupon = None
    if data.coupon_code:
        coupon = db.query(Coupon).filter(Coupon.code == data.coupon_code.upper()).first()

    # 5. Row-level locked transaction
    try:
        # Lock and decrement variant stock
        for item in cart.items:
            if item.variant_id:
                decrement_variant_stock(db, item.product_id, item.variant_id, item.quantity, user.id)

        # Coupon validation under lock
        discount_amount = Decimal("0")
        applied_coupon = None

        if coupon and coupon.is_active:
            result = db.execute(
                text('SELECT id, discount_type, discount_value, min_order_amount, usage_limit, expiration_date, is_active FROM coupons WHERE id = :cid FOR UPDATE'),
                {"cid": coupon.id},
            )
            locked = result.fetchone()
            if locked and locked[6]:  # is_active
                min_amount = Decimal(str(locked[3]))
                meets_min = subtotal >= min_amount
                not_expired = not locked[5] or locked[5] > datetime.utcnow()

                under_limit = True
                if locked[4] is not None:  # usage_limit
                    usage_count = db.query(CouponUsage).filter(CouponUsage.coupon_id == locked[0]).count()
                    under_limit = usage_count < locked[4]

                if meets_min and not_expired and under_limit:
                    val = Decimal(str(locked[2]))
                    if locked[1] == "percentage":
                        discount_amount = subtotal * (val / Decimal("100"))
                    else:
                        discount_amount = val
                    if discount_amount > subtotal:
                        discount_amount = subtotal
                    applied_coupon = locked

        totals = calculate_order_totals(subtotal, discount_amount)

        expires_at = None
        if data.payment_method != "cod":
            expires_at = datetime.utcnow() + timedelta(minutes=ORDER_EXPIRY_MINUTES)

        # Create order
        order = Order(
            order_number=_generate_order_number(),
            user_id=user.id,
            subtotal=subtotal.quantize(Decimal("0.01")),
            discount_amount=discount_amount.quantize(Decimal("0.01")),
            tax_amount=totals["tax_amount"],
            shipping_amount=totals["shipping_amount"],
            total=totals["final_total"],
            shipping_address_snapshot=_format_snapshot(ship_addr),
            billing_address_snapshot=_format_snapshot(bill_addr),
            shipping_address_id=ship_addr.id,
            billing_address_id=bill_addr.id,
            order_status="pending",
            payment_status="unpaid",
            shipment_status="unfulfilled",
            refund_status="none",
            stock_restored=False,
            expires_at=expires_at,
            idempotency_key=x_idempotency_key,
        )
        db.add(order)
        db.flush()

        # Create order items
        for item in cart.items:
            base = Decimal(str(item.variant.price)) if item.variant and item.variant.price else Decimal(str(item.product.base_price))
            final_price = calculate_item_price(base, item.product.discount_price)

            name_snapshot = item.product.name
            if item.variant:
                name_snapshot = f"{item.product.name} ({item.variant.size or ''}/{item.variant.color or ''})"

            oi = OrderItem(
                order_id=order.id,
                product_id=item.product_id,
                variant_id=item.variant_id,
                product_name_snapshot=name_snapshot,
                product_price_snapshot=final_price.quantize(Decimal("0.01")),
                quantity=item.quantity,
            )
            db.add(oi)

        # Link inventory logs
        db.query(InventoryLog).filter(
            InventoryLog.reason == "checkout",
            InventoryLog.updated_by == f"user_{user.id}",
            InventoryLog.order_id == None,
        ).update({"order_id": order.id})

        # Register coupon usage
        if applied_coupon and discount_amount > 0:
            db.add(CouponUsage(
                coupon_id=applied_coupon[0],
                user_id=user.id,
                order_id=order.id,
            ))

        # Clear cart
        db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()

        # Create payment record
        db.add(Payment(
            order_id=order.id,
            amount=totals["final_total"],
            method=data.payment_method,
            status="pending",
        ))

        db.commit()
        db.refresh(order)
        return order

    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


# ─── Get User Orders ────────────────────────────────────────────────────────
@router.get("", response_model=List[OrderOut])
def get_orders(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    orders = (
        db.query(Order)
        .options(
            joinedload(Order.items).joinedload(OrderItem.product).joinedload("images"),
            joinedload(Order.items).joinedload(OrderItem.variant),
            joinedload(Order.payments),
            joinedload(Order.refunds),
        )
        .filter(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    # Deduplicate
    seen = set()
    unique = []
    for o in orders:
        if o.id not in seen:
            seen.add(o.id)
            unique.append(o)
    return unique


# ─── Get Order Detail ────────────────────────────────────────────────────────
@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = (
        db.query(Order)
        .options(
            joinedload(Order.items).joinedload(OrderItem.product),
            joinedload(Order.items).joinedload(OrderItem.variant),
            joinedload(Order.payments),
            joinedload(Order.refunds),
        )
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != user.id and (not user.role or user.role.name != "ADMIN"):
        raise HTTPException(status_code=403, detail="Unauthorized")

    return order


# ─── Cancel Order ────────────────────────────────────────────────────────────
@router.put("/{order_id}/cancel", response_model=MessageResponse)
def cancel_order(order_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != user.id and (not user.role or user.role.name != "ADMIN"):
        raise HTTPException(status_code=403, detail="Unauthorized")
    if order.order_status == "cancelled":
        raise HTTPException(status_code=400, detail="Already cancelled")
    if order.order_status != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot cancel orders with status '{order.order_status}'")
    if order.payment_status == "paid":
        raise HTTPException(status_code=400, detail="Paid orders cannot be cancelled; request a refund instead")

    order.order_status = "cancelled"
    order.payment_status = "failed"

    if can_restore_stock(order):
        restore_order_stock(db, order, "cancellation", f"user_{user.id}")

    db.query(Payment).filter(Payment.order_id == order_id).update({"status": "failed"})
    db.commit()

    return {"message": "Order successfully cancelled"}
