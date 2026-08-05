"""
Admin router — analytics dashboard, order management.
"""
from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func
from database import get_db
from dependencies import require_admin
from models import (
    Order, OrderItem, Product, ProductVariant, Category, User, Coupon, CouponUsage,
    Payment, InventoryLog, AuditLog,
)
from schemas import OrderOut, OrderStatusUpdate, MessageResponse
from services.inventory import restore_order_stock

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ─── Dashboard Analytics ────────────────────────────────────────────────────
@router.get("/stats")
def get_dashboard(
    range_type: str = Query("last30days", alias="rangeType"),
    start_date: Optional[date] = Query(None, alias="startDate"),
    end_date: Optional[date] = Query(None, alias="endDate"),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Return the complete analytics contract consumed by the admin dashboard."""
    now = datetime.now(timezone.utc)
    period_end = now

    if range_type == "today":
        period_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif range_type == "last7days":
        period_start = now - timedelta(days=7)
    elif range_type == "thisyear":
        period_start = datetime(now.year, 1, 1, tzinfo=timezone.utc)
    elif range_type == "custom":
        if not start_date or not end_date or start_date > end_date:
            raise HTTPException(status_code=400, detail="A valid custom date range is required")
        period_start = datetime.combine(start_date, datetime.min.time(), tzinfo=timezone.utc)
        period_end = datetime.combine(end_date + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
    else:
        period_start = now - timedelta(days=30)

    period_filter = [Order.created_at >= period_start, Order.created_at < period_end]
    paid_period_filter = [*period_filter, Order.payment_status == "paid"]

    total_revenue = db.query(func.coalesce(func.sum(Order.total), 0)).filter(*paid_period_filter).scalar() or 0
    total_orders = db.query(Order).filter(*period_filter).count()
    pending_orders = db.query(Order).filter(*period_filter, Order.order_status == "pending").count()
    total_products = db.query(Product).filter(Product.status == "active").count()
    total_users = db.query(User).count()

    daily_revenue = (
        db.query(
            func.date(Order.created_at).label("date"),
            func.sum(Order.total).label("revenue"),
            func.count(Order.id).label("orders"),
        )
        .filter(*paid_period_filter)
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
        .all()
    )

    low_stock_rows = (
        db.query(Product.name, ProductVariant.sku, ProductVariant.stock, Product.low_stock_threshold)
        .join(ProductVariant, ProductVariant.product_id == Product.id)
        .filter(Product.status == "active", ProductVariant.stock <= Product.low_stock_threshold)
        .order_by(ProductVariant.stock.asc(), Product.name.asc())
        .all()
    )

    revenue_expression = func.sum(OrderItem.quantity * OrderItem.product_price_snapshot)
    best_seller_rows = (
        db.query(
            OrderItem.product_id,
            OrderItem.product_name_snapshot,
            func.sum(OrderItem.quantity).label("total_qty"),
            revenue_expression.label("revenue"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .filter(*paid_period_filter)
        .group_by(OrderItem.product_id, OrderItem.product_name_snapshot)
        .order_by(revenue_expression.desc())
        .limit(10)
        .all()
    )

    audit_logs = (
        db.query(AuditLog)
        .options(joinedload(AuditLog.user))
        .order_by(AuditLog.timestamp.desc())
        .limit(20)
        .all()
    )

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
        "revenueChart": [
            {"date": str(row[0]), "revenue": float(row[1] or 0), "orders": row[2]}
            for row in daily_revenue
        ],
        "lowStockProducts": [
            {"name": row[0], "sku": row[1], "stock": row[2], "threshold": row[3]}
            for row in low_stock_rows
        ],
        "bestSellers": [
            {
                "id": row[0],
                "name": row[1],
                "totalQty": row[2],
                "revenue": float(row[3] or 0),
            }
            for row in best_seller_rows
        ],
        "auditLogs": [
            {
                "id": log.id,
                "action": log.action,
                "description": log.description,
                "timestamp": log.timestamp.isoformat(),
                "user": {"name": log.user.name} if log.user else None,
            }
            for log in audit_logs
        ],
        "recentOrders": [
            {
                "id": order.id,
                "orderNumber": order.order_number,
                "total": float(order.total),
                "orderStatus": order.order_status,
                "paymentStatus": order.payment_status,
                "createdAt": order.created_at.isoformat(),
                "userName": order.user.name if order.user else "Unknown",
            }
            for order in recent_orders
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
        selectinload(Order.items),
        selectinload(Order.payments),
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
                "items": [
                    {
                        "id": item.id,
                        "productNameSnapshot": item.product_name_snapshot,
                        "quantity": item.quantity,
                    }
                    for item in o.items
                ],
                "createdAt": o.created_at.isoformat(),
            }
            for o in orders
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
            selectinload(Product.images),
            selectinload(Product.category),
            selectinload(Product.variants),
        )
        .order_by(Product.created_at.desc())
        .all()
    )
    return products


# ─── All Categories with product count ───────────────────────────────────────
@router.get("/categories")
def list_categories_admin(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    # Single aggregated query — avoids N+1 COUNT queries
    rows = (
        db.query(Category, func.count(Product.id).label("product_count"))
        .outerjoin(Product, Product.category_id == Category.id)
        .group_by(Category.id)
        .all()
    )
    return [
        {
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "productCount": count,
        }
        for cat, count in rows
    ]


# ─── All Coupons with usage count ────────────────────────────────────────────
@router.get("/coupons")
def list_coupons_admin(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    from models import CouponUsage
    # Single aggregated query — avoids N+1 COUNT queries
    rows = (
        db.query(Coupon, func.count(CouponUsage.id).label("usage_count"))
        .outerjoin(CouponUsage, CouponUsage.coupon_id == Coupon.id)
        .group_by(Coupon.id)
        .order_by(Coupon.created_at.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "code": c.code,
            "discountType": c.discount_type,
            "discountValue": float(c.discount_value),
            "minOrderAmount": float(c.min_order_amount),
            "usageLimit": c.usage_limit,
            "expirationDate": c.expiration_date.isoformat() if c.expiration_date else None,
            "isActive": c.is_active,
            "usageCount": usage_count,
        }
        for c, usage_count in rows
    ]
