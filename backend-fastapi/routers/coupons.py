"""
Coupons router — CRUD and validation.
"""
from typing import List
from decimal import Decimal
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_user, require_admin
from models import Coupon, CouponUsage, User
from schemas import CouponCreate, CouponOut, CouponValidate, MessageResponse

router = APIRouter(prefix="/api/coupons", tags=["Coupons"])


@router.post("/validate")
def validate_coupon(
    data: CouponValidate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    coupon = db.query(Coupon).filter(Coupon.code == data.code.upper()).first()
    if not coupon or not coupon.is_active:
        raise HTTPException(status_code=404, detail="Invalid or inactive coupon code")

    if coupon.expiration_date and coupon.expiration_date < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Coupon has expired")

    if coupon.usage_limit:
        usage_count = db.query(CouponUsage).filter(CouponUsage.coupon_id == coupon.id).count()
        if usage_count >= coupon.usage_limit:
            raise HTTPException(status_code=400, detail="Coupon usage limit reached")

    min_amount = Decimal(str(coupon.min_order_amount))
    if data.subtotal < min_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order amount of ${min_amount} required",
        )

    val = Decimal(str(coupon.discount_value))
    if coupon.discount_type == "percentage":
        discount = data.subtotal * (val / Decimal("100"))
    else:
        discount = val

    if discount > data.subtotal:
        discount = data.subtotal

    return {
        "valid": True,
        "code": coupon.code,
        "discount_type": coupon.discount_type,
        "discount_value": float(coupon.discount_value),
        "discount_amount": float(discount.quantize(Decimal("0.01"))),
    }


@router.get("", response_model=List[CouponOut])
def list_coupons(db: Session = Depends(get_db), user: User = Depends(require_admin)):
    return db.query(Coupon).order_by(Coupon.created_at.desc()).all()


@router.post("", response_model=CouponOut, status_code=201)
def create_coupon(
    data: CouponCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    existing = db.query(Coupon).filter(Coupon.code == data.code.upper()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")

    coupon = Coupon(
        code=data.code.upper(),
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        min_order_amount=data.min_order_amount,
        usage_limit=data.usage_limit,
        expiration_date=data.expiration_date,
        is_active=data.is_active,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)
    return coupon


@router.delete("/{coupon_id}", response_model=MessageResponse)
def delete_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    coupon.is_active = False
    db.commit()
    return {"message": "Coupon deactivated"}
