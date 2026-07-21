"""
Wishlist router — toggle wishlist items.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from dependencies import get_current_user
from models import WishlistItem, Product, User
from schemas import WishlistToggle, WishlistItemOut, MessageResponse

router = APIRouter(prefix="/api/wishlist", tags=["Wishlist"])


@router.get("", response_model=List[WishlistItemOut])
def get_wishlist(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = (
        db.query(WishlistItem)
        .options(joinedload(WishlistItem.product).joinedload(Product.images))
        .filter(WishlistItem.user_id == user.id)
        .order_by(WishlistItem.created_at.desc())
        .all()
    )
    return items


@router.post("", response_model=MessageResponse)
def toggle_wishlist(
    data: WishlistToggle,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = db.query(WishlistItem).filter(
        WishlistItem.user_id == user.id,
        WishlistItem.product_id == data.product_id,
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"message": "Removed from wishlist"}
    else:
        product = db.query(Product).filter(Product.id == data.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        item = WishlistItem(user_id=user.id, product_id=data.product_id)
        db.add(item)
        db.commit()
        return {"message": "Added to wishlist"}


@router.delete("/{product_id}", response_model=MessageResponse)
def remove_from_wishlist(
    product_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = db.query(WishlistItem).filter(
        WishlistItem.user_id == user.id,
        WishlistItem.product_id == product_id,
    ).first()

    if not existing:
        raise HTTPException(status_code=404, detail="Item not in wishlist")

    db.delete(existing)
    db.commit()
    return {"message": "Removed from wishlist"}
