"""
Cart router — add, update, remove, clear.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from dependencies import get_current_user
from models import Cart, CartItem, Product, ProductVariant, User
from schemas import CartItemCreate, CartItemUpdate, CartOut, CartItemOut, MessageResponse

router = APIRouter(prefix="/api/cart", tags=["Cart"])


def _get_or_create_cart(db: Session, user_id: int) -> Cart:
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


@router.get("", response_model=CartOut)
def get_cart(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cart = _get_or_create_cart(db, user.id)
    cart = (
        db.query(Cart)
        .options(
            joinedload(Cart.items).joinedload(CartItem.product).joinedload(Product.images),
            joinedload(Cart.items).joinedload(CartItem.variant),
        )
        .filter(Cart.id == cart.id)
        .first()
    )
    return cart


@router.post("/items", response_model=CartItemOut, status_code=201)
def add_to_cart(
    data: CartItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cart = _get_or_create_cart(db, user.id)

    product = db.query(Product).filter(Product.id == data.product_id, Product.status == "active").first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found or disabled")

    if data.variant_id:
        variant = db.query(ProductVariant).filter(
            ProductVariant.id == data.variant_id,
            ProductVariant.product_id == data.product_id,
        ).first()
        if not variant:
            raise HTTPException(status_code=404, detail="Variant not found")
        if variant.stock < data.quantity:
            raise HTTPException(status_code=400, detail="Insufficient stock")

    existing = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.product_id == data.product_id,
        CartItem.variant_id == data.variant_id,
    ).first()

    if existing:
        existing.quantity += data.quantity
        db.commit()
        db.refresh(existing)
        return existing
    else:
        item = CartItem(
            cart_id=cart.id,
            product_id=data.product_id,
            variant_id=data.variant_id,
            quantity=data.quantity,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item


@router.put("/items/{item_id}", response_model=CartItemOut)
def update_cart_item(
    item_id: int,
    data: CartItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cart = _get_or_create_cart(db, user.id)
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    if data.quantity <= 0:
        db.delete(item)
        db.commit()
        return {"id": item_id, "product_id": item.product_id, "quantity": 0}

    item.quantity = data.quantity
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}", response_model=MessageResponse)
def remove_cart_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    cart = _get_or_create_cart(db, user.id)
    item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.cart_id == cart.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    db.delete(item)
    db.commit()
    return {"message": "Item removed from cart"}


@router.delete("", response_model=MessageResponse)
def clear_cart(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cart = _get_or_create_cart(db, user.id)
    db.query(CartItem).filter(CartItem.cart_id == cart.id).delete()
    db.commit()
    return {"message": "Cart cleared"}
