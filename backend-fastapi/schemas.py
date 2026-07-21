"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ─── Shared / Generic ────────────────────────────────────────────────────────
class MessageResponse(BaseModel):
    message: str


# ─── Role ────────────────────────────────────────────────────────────────────
class RoleOut(BaseModel):
    id: int
    name: str
    model_config = {"from_attributes": True}


# ─── User ────────────────────────────────────────────────────────────────────
class UserOut(BaseModel):
    id: int
    clerk_id: Optional[str] = None
    name: str
    email: str
    role: RoleOut
    email_verified: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


# ─── Address ─────────────────────────────────────────────────────────────────
class AddressCreate(BaseModel):
    full_name: str
    phone_number: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str
    address_type: str = "shipping"
    is_default: bool = False


class AddressOut(BaseModel):
    id: int
    full_name: str
    phone_number: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str
    address_type: str
    is_default: bool
    model_config = {"from_attributes": True}


# ─── Category ────────────────────────────────────────────────────────────────
class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None


class CategoryOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    model_config = {"from_attributes": True}


# ─── Product Image ───────────────────────────────────────────────────────────
class ProductImageOut(BaseModel):
    id: int
    url: str
    product_id: int
    model_config = {"from_attributes": True}


class ProductImageCreate(BaseModel):
    url: str


# ─── Product Variant ─────────────────────────────────────────────────────────
class ProductVariantCreate(BaseModel):
    sku: str
    price: Optional[Decimal] = None
    stock: int = 0
    size: Optional[str] = None
    color: Optional[str] = None
    material: Optional[str] = None


class ProductVariantUpdate(BaseModel):
    sku: Optional[str] = None
    price: Optional[Decimal] = None
    stock: Optional[int] = None
    size: Optional[str] = None
    color: Optional[str] = None
    material: Optional[str] = None


class ProductVariantOut(BaseModel):
    id: int
    product_id: int
    sku: str
    price: Optional[Decimal] = None
    stock: int
    size: Optional[str] = None
    color: Optional[str] = None
    material: Optional[str] = None
    model_config = {"from_attributes": True}


# ─── Product ─────────────────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str
    description: str
    brand: str = "Generic"
    base_price: Decimal
    discount_price: Decimal = Decimal("0.00")
    category_id: int
    low_stock_threshold: int = 5
    weight: Optional[Decimal] = None
    dimensions: Optional[str] = None
    images: Optional[List[str]] = None
    variants: Optional[List[ProductVariantCreate]] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    brand: Optional[str] = None
    base_price: Optional[Decimal] = None
    discount_price: Optional[Decimal] = None
    category_id: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    weight: Optional[Decimal] = None
    dimensions: Optional[str] = None
    status: Optional[str] = None


class ProductOut(BaseModel):
    id: int
    name: str
    slug: str
    description: str
    brand: str
    base_price: Decimal
    discount_price: Decimal
    category_id: int
    category: Optional[CategoryOut] = None
    low_stock_threshold: int
    weight: Optional[Decimal] = None
    dimensions: Optional[str] = None
    status: str
    images: List[ProductImageOut] = []
    variants: List[ProductVariantOut] = []
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    products: List[ProductOut]
    page: int
    limit: int
    total_pages: int
    total_products: int


# ─── Cart ────────────────────────────────────────────────────────────────────
class CartItemCreate(BaseModel):
    product_id: int
    variant_id: Optional[int] = None
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemOut(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int] = None
    quantity: int
    product: Optional[ProductOut] = None
    variant: Optional[ProductVariantOut] = None
    model_config = {"from_attributes": True}


class CartOut(BaseModel):
    id: int
    user_id: int
    items: List[CartItemOut] = []
    model_config = {"from_attributes": True}


# ─── Order ───────────────────────────────────────────────────────────────────
class OrderCreate(BaseModel):
    shipping_address_id: int
    billing_address_id: Optional[int] = None
    coupon_code: Optional[str] = None
    payment_method: str = "cod"


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    variant_id: Optional[int] = None
    product_name_snapshot: str
    product_price_snapshot: Decimal
    quantity: int
    product: Optional[ProductOut] = None
    variant: Optional[ProductVariantOut] = None
    model_config = {"from_attributes": True}


class PaymentOut(BaseModel):
    id: int
    order_id: int
    amount: Decimal
    status: str
    method: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class RefundOut(BaseModel):
    id: int
    payment_id: int
    order_id: int
    amount: Decimal
    reason: str
    status: str
    razorpay_refund_id: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    order_number: str
    user_id: int
    order_status: str
    payment_status: str
    shipment_status: str
    refund_status: str
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    shipping_amount: Decimal
    total: Decimal
    shipping_address_snapshot: dict
    billing_address_snapshot: dict
    tracking_number: Optional[str] = None
    items: List[OrderItemOut] = []
    payments: List[PaymentOut] = []
    refunds: List[RefundOut] = []
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Review ──────────────────────────────────────────────────────────────────
class ReviewCreate(BaseModel):
    product_id: int
    order_item_id: Optional[int] = None
    rating: int  # 1 to 5
    comment: Optional[str] = None


class ReviewOut(BaseModel):
    id: int
    user_id: int
    product_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    user: Optional[UserOut] = None
    model_config = {"from_attributes": True}


# ─── Wishlist ────────────────────────────────────────────────────────────────
class WishlistToggle(BaseModel):
    product_id: int


class WishlistItemOut(BaseModel):
    id: int
    product_id: int
    product: Optional[ProductOut] = None
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Coupon ──────────────────────────────────────────────────────────────────
class CouponCreate(BaseModel):
    code: str
    discount_type: str  # "percentage" or "fixed"
    discount_value: Decimal
    min_order_amount: Decimal = Decimal("0.00")
    usage_limit: Optional[int] = None
    expiration_date: Optional[datetime] = None
    is_active: bool = True


class CouponOut(BaseModel):
    id: int
    code: str
    discount_type: str
    discount_value: Decimal
    min_order_amount: Decimal
    usage_limit: Optional[int] = None
    expiration_date: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class CouponValidate(BaseModel):
    code: str
    subtotal: Decimal


# ─── Payment ─────────────────────────────────────────────────────────────────
class PaymentCreateOrder(BaseModel):
    order_id: int


class PaymentVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# ─── Admin ───────────────────────────────────────────────────────────────────
class OrderStatusUpdate(BaseModel):
    order_status: Optional[str] = None
    payment_status: Optional[str] = None
    shipment_status: Optional[str] = None
    tracking_number: Optional[str] = None


class AdminRefundCreate(BaseModel):
    payment_id: int
    amount: Decimal
    reason: str
