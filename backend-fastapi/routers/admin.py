"""
Admin router — analytics dashboard, order management.
"""
from typing import List, Optional
from decimal import Decimal
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from database import get_db
from dependencies import require_admin
from models import (
    Order, OrderItem, Product, Category, User, Coupon, CouponUsage,
    Payment, InventoryLog,
)
from schemas import OrderOut, OrderStatusUpdate, MessageResponse
from services.inventory import restore_order_stock

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ─── Dashboard Analytics ────────────────────────────────────────────────────
@router.get("/stats")
def get_dashboard(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    # Total revenue
    total_revenue = db.query(func.sum(Order.total)).filter(Order.payment_status == "paid").scalar() or 0

    # Total orders
    total_orders = db.query(Order).count()
    pending_orders = db.query(Order).filter(Order.order_status == "pending").count()

    # Total products
    total_products = db.query(Product).filter(Product.status == "active").count()

    # Total users
    total_users = db.query(User).count()

    # Revenue over time (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    daily_revenue = (
        db.query(
            func.date(Order.created_at).label("date"),
            func.sum(Order.total).label("revenue"),
            func.count(Order.id).label("orders"),
        )
        .filter(Order.payment_status == "paid", Order.created_at >= thirty_days_ago)
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
        .all()
    )

    revenue_chart = [
        {"date": str(r[0]), "revenue": float(r[1] or 0), "orders": r[2]}
        for r in daily_revenue
    ]

    # Recent orders
    recent_orders = (
        db.query(Order)
        .options(joinedload(Order.user))
        .order_by(Order.created_at.desc())
        .limit(10)
        .all()
    )

    return {
        "totalRevenue": float(total_revenue),
        "totalOrders": total_orders,
        "pendingOrders": pending_orders,
        "totalProducts": total_products,
        "totalUsers": total_users,
        "revenueChart": revenue_chart,
        "recentOrders": [
            {
                "id": o.id,
                "orderNumber": o.order_number,
                "total": float(o.total),
                "orderStatus": o.order_status,
                "paymentStatus": o.payment_status,
                "createdAt": o.created_at.isoformat(),
                "userName": o.user.name if o.user else "Unknown",
            }
            for o in recent_orders
        ],
    }


# ─── All Orders (Admin) ─────────────────────────────────────────────────────
@router.get("/orders")
def list_all_orders(
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    query = db.query(Order).options(
        joinedload(Order.user),
        joinedload(Order.items),
        joinedload(Order.payments),
    )

    if status:
        query = query.filter(Order.order_status == status)

    total = query.count()
    orders = (
        query.order_by(Order.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    # Deduplicate
    seen = set()
    unique = []
    for o in orders:
        if o.id not in seen:
            seen.add(o.id)
            unique.append(o)

    return {
        "orders": [
            {
                "id": o.id,
                "orderNumber": o.order_number,
                "user": {"name": o.user.name, "email": o.user.email} if o.user else None,
                "total": float(o.total),
                "orderStatus": o.order_status,
                "paymentStatus": o.payment_status,
                "shipmentStatus": o.shipment_status,
                "itemCount": len(o.items),
                "createdAt": o.created_at.isoformat(),
            }
            for o in unique
        ],
        "total": total,
        "page": page,
        "totalPages": (total + limit - 1) // limit,
    }


# ─── Update Order Status ────────────────────────────────────────────────────
@router.put("/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    order = db.query(Order).options(joinedload(Order.items)).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    update_data = data.model_dump(exclude_unset=True)

    # Handle cancellation with stock restore
    if update_data.get("order_status") == "cancelled" and not order.stock_restored:
        restore_order_stock(db, order, "admin_cancellation", f"admin_{user.id}")

    for key, value in update_data.items():
        setattr(order, key, value)

    db.commit()
    db.refresh(order)

    return {"message": "Order status updated", "orderId": order.id}


# ─── All Products (Admin, including disabled) ───────────────────────────────
@router.get("/products")
def list_all_products(
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    products = (
        db.query(Product)
        .options(
            joinedload(Product.images),
            joinedload(Product.category),
            joinedload(Product.variants),
        )
        .order_by(Product.created_at.desc())
        .all()
    )
    seen = set()
    unique = []
    for p in products:
        if p.id not in seen:
            seen.add(p.id)
            unique.append(p)
    return unique


# ─── All Categories with product count ───────────────────────────────────────
@router.get("/categories")
def list_categories_admin(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    cats = db.query(Category).all()
    result = []
    for c in cats:
        count = db.query(Product).filter(Product.category_id == c.id).count()
        result.append({
            "id": c.id,
            "name": c.name,
            "description": c.description,
            "_count": {"products": count},
        })
    return result


# ─── All Coupons with usage count ────────────────────────────────────────────
@router.get("/coupons")
def list_coupons_admin(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    coupons = db.query(Coupon).order_by(Coupon.created_at.desc()).all()
    result = []
    for c in coupons:
        usage_count = db.query(CouponUsage).filter(CouponUsage.coupon_id == c.id).count()
        result.append({
            "id": c.id,
            "code": c.code,
            "discountType": c.discount_type,
            "discountValue": float(c.discount_value),
            "minOrderAmount": float(c.min_order_amount),
            "usageLimit": c.usage_limit,
            "expirationDate": c.expiration_date.isoformat() if c.expiration_date else None,
            "isActive": c.is_active,
            "_count": {"usages": usage_count},
        })
    return result
