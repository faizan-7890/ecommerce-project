"""
Reviews router — product reviews.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from database import get_db
from dependencies import get_current_user
from models import Review, Product, User
from schemas import ReviewCreate, ReviewOut

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


@router.get("/{product_id}", response_model=List[ReviewOut])
def get_product_reviews(product_id: int, db: Session = Depends(get_db)):
    reviews = (
        db.query(Review)
        .options(joinedload(Review.user))
        .filter(Review.product_id == product_id, Review.is_hidden == False)
        .order_by(Review.created_at.desc())
        .all()
    )
    return reviews


@router.post("", response_model=ReviewOut, status_code=201)
def create_review(
    data: ReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = db.query(Review).filter(
        Review.user_id == user.id, Review.product_id == data.product_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already reviewed this product")

    review = Review(
        user_id=user.id,
        product_id=data.product_id,
        order_item_id=data.order_item_id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review
