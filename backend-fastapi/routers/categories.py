"""
Categories router — CRUD operations.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from dependencies import require_admin
from models import Category, Product, User
from schemas import CategoryCreate, CategoryOut, CategoryWithCountOut, CategoryCount, MessageResponse

router = APIRouter(prefix="/api/categories", tags=["Categories"])


@router.get("", response_model=List[CategoryWithCountOut])
def list_categories(db: Session = Depends(get_db)):
    """List all categories with their active product counts."""
    # Query categories with a LEFT JOIN count of active products
    results = (
        db.query(Category, func.count(Product.id).label("product_count"))
        .outerjoin(Product, (Product.category_id == Category.id) & (Product.status == "active"))
        .group_by(Category.id)
        .all()
    )

    categories_out = []
    for cat, count in results:
        categories_out.append(CategoryWithCountOut(
            id=cat.id,
            name=cat.name,
            description=cat.description,
            _count=CategoryCount(products=count),
        ))
    return categories_out


@router.get("/{category_id}", response_model=CategoryOut)
def get_category(category_id: int, db: Session = Depends(get_db)):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    existing = db.query(Category).filter(Category.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")

    cat = Category(name=data.name, description=data.description)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{category_id}", response_model=MessageResponse)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    cat = db.query(Category).filter(Category.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    from models import Product
    product_count = db.query(Product).filter(Product.category_id == category_id).count()
    if product_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category with {product_count} associated product(s). Reassign or remove them first.",
        )

    db.delete(cat)
    db.commit()
    return {"message": "Category deleted successfully"}
