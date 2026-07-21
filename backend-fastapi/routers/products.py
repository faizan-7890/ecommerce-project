"""
Products router — CRUD, variants, images.
"""
import re
import time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from database import get_db
from dependencies import get_current_user, require_admin
from models import Product, ProductVariant, ProductImage, InventoryLog, User
from schemas import (
    ProductCreate, ProductUpdate, ProductOut, ProductListResponse,
    ProductVariantCreate, ProductVariantUpdate, ProductVariantOut,
    ProductImageCreate, ProductImageOut, MessageResponse,
)

router = APIRouter(prefix="/api/products", tags=["Products"])


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"\s+", "-", text)
    text = re.sub(r"[^\w\-]", "", text)
    text = re.sub(r"\-\-+", "-", text)
    text = text.strip("-")
    return text


# ─── List Products ───────────────────────────────────────────────────────────
@router.get("", response_model=ProductListResponse)
def list_products(
    search: Optional[str] = None,
    category_id: Optional[int] = Query(None, alias="categoryId"),
    min_price: Optional[float] = Query(None, alias="minPrice"),
    max_price: Optional[float] = Query(None, alias="maxPrice"),
    sort_by: str = Query("createdAt", alias="sortBy"),
    sort_order: str = Query("desc", alias="sortOrder"),
    page: int = 1,
    limit: int = 12,
    db: Session = Depends(get_db),
):
    query = db.query(Product).filter(Product.status == "active")

    if search:
        like = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(like)) |
            (Product.description.ilike(like)) |
            (Product.brand.ilike(like))
        )

    if category_id:
        query = query.filter(Product.category_id == category_id)

    if min_price is not None:
        query = query.filter(Product.base_price >= min_price)
    if max_price is not None:
        query = query.filter(Product.base_price <= max_price)

    if sort_by == "price":
        order_col = Product.base_price.asc() if sort_order == "asc" else Product.base_price.desc()
    else:
        order_col = Product.created_at.asc() if sort_order == "asc" else Product.created_at.desc()

    total = query.count()
    skip = (page - 1) * limit
    products = (
        query.options(joinedload(Product.images), joinedload(Product.category), joinedload(Product.variants))
        .order_by(order_col)
        .offset(skip)
        .limit(limit)
        .all()
    )

    # Deduplicate due to joinedload
    seen = set()
    unique_products = []
    for p in products:
        if p.id not in seen:
            seen.add(p.id)
            unique_products.append(p)

    return ProductListResponse(
        products=unique_products,
        page=page,
        limit=limit,
        total_pages=(total + limit - 1) // limit,
        total_products=total,
    )


# ─── Get Product Detail ─────────────────────────────────────────────────────
@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: str, db: Session = Depends(get_db)):
    try:
        pid = int(product_id)
        product = (
            db.query(Product)
            .options(joinedload(Product.images), joinedload(Product.category), joinedload(Product.variants))
            .filter(Product.id == pid)
            .first()
        )
    except ValueError:
        product = (
            db.query(Product)
            .options(joinedload(Product.images), joinedload(Product.category), joinedload(Product.variants))
            .filter(Product.slug == product_id)
            .first()
        )

    if not product or product.status != "active":
        raise HTTPException(status_code=404, detail="Product not found")

    return product


# ─── Create Product ──────────────────────────────────────────────────────────
@router.post("", response_model=ProductOut, status_code=201)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    slug = slugify(data.name)
    existing = db.query(Product).filter(Product.slug == slug).first()
    final_slug = f"{slug}-{int(time.time())}" if existing else slug

    product = Product(
        name=data.name,
        slug=final_slug,
        description=data.description,
        brand=data.brand,
        base_price=data.base_price,
        discount_price=data.discount_price,
        category_id=data.category_id,
        low_stock_threshold=data.low_stock_threshold,
        weight=data.weight,
        dimensions=data.dimensions,
        status="active",
    )
    db.add(product)
    db.flush()

    if data.images:
        for url in data.images:
            db.add(ProductImage(product_id=product.id, url=url))

    if data.variants:
        for v in data.variants:
            variant = ProductVariant(
                product_id=product.id,
                sku=v.sku,
                price=v.price,
                stock=v.stock,
                size=v.size,
                color=v.color,
                material=v.material,
            )
            db.add(variant)
            db.flush()

            db.add(InventoryLog(
                product_id=product.id,
                variant_id=variant.id,
                previous_quantity=0,
                new_quantity=variant.stock,
                change_amount=variant.stock,
                reason="manual_adjustment",
                updated_by=f"admin_{user.id}",
            ))

    db.commit()
    db.refresh(product)
    return product


# ─── Update Product ──────────────────────────────────────────────────────────
@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    update_data = data.model_dump(exclude_unset=True)
    if "name" in update_data:
        update_data["slug"] = slugify(update_data["name"])

    for key, value in update_data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


# ─── Delete (Soft) Product ───────────────────────────────────────────────────
@router.delete("/{product_id}", response_model=MessageResponse)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.status = "disabled"
    db.commit()
    return {"message": "Product successfully disabled"}


# ─── Add Variant ─────────────────────────────────────────────────────────────
@router.post("/{product_id}/variants", response_model=ProductVariantOut, status_code=201)
def add_variant(
    product_id: int,
    data: ProductVariantCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    existing = db.query(ProductVariant).filter(ProductVariant.sku == data.sku).first()
    if existing:
        raise HTTPException(status_code=400, detail="SKU code already exists")

    variant = ProductVariant(
        product_id=product_id,
        sku=data.sku,
        price=data.price,
        stock=data.stock,
        size=data.size,
        color=data.color,
        material=data.material,
    )
    db.add(variant)
    db.flush()

    db.add(InventoryLog(
        product_id=product_id,
        variant_id=variant.id,
        previous_quantity=0,
        new_quantity=variant.stock,
        change_amount=variant.stock,
        reason="manual_adjustment",
        updated_by=f"admin_{user.id}",
    ))

    db.commit()
    db.refresh(variant)
    return variant


# ─── Update Variant ──────────────────────────────────────────────────────────
@router.put("/{product_id}/variants/{variant_id}", response_model=ProductVariantOut)
def update_variant(
    product_id: int,
    variant_id: int,
    data: ProductVariantUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    variant = db.query(ProductVariant).filter(
        ProductVariant.id == variant_id, ProductVariant.product_id == product_id
    ).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    update_data = data.model_dump(exclude_unset=True)

    if "sku" in update_data and update_data["sku"] != variant.sku:
        sku_exists = db.query(ProductVariant).filter(ProductVariant.sku == update_data["sku"]).first()
        if sku_exists:
            raise HTTPException(status_code=400, detail="SKU already in use")

    if "stock" in update_data and update_data["stock"] != variant.stock:
        db.add(InventoryLog(
            product_id=product_id,
            variant_id=variant_id,
            previous_quantity=variant.stock,
            new_quantity=update_data["stock"],
            change_amount=update_data["stock"] - variant.stock,
            reason="manual_adjustment",
            updated_by=f"admin_{user.id}",
        ))

    for key, value in update_data.items():
        setattr(variant, key, value)

    db.commit()
    db.refresh(variant)
    return variant


# ─── Delete Variant ──────────────────────────────────────────────────────────
@router.delete("/{product_id}/variants/{variant_id}", response_model=MessageResponse)
def delete_variant(
    product_id: int,
    variant_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    variant = db.query(ProductVariant).filter(
        ProductVariant.id == variant_id, ProductVariant.product_id == product_id
    ).first()
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")

    db.delete(variant)
    db.commit()
    return {"message": "Variant deleted successfully"}


# ─── Add Image ───────────────────────────────────────────────────────────────
@router.post("/{product_id}/images", response_model=ProductImageOut, status_code=201)
def add_image(
    product_id: int,
    data: ProductImageCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    image = ProductImage(product_id=product_id, url=data.url)
    db.add(image)
    db.commit()
    db.refresh(image)
    return image


# ─── Delete Image ────────────────────────────────────────────────────────────
@router.delete("/{product_id}/images/{image_id}", response_model=MessageResponse)
def delete_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    image = db.query(ProductImage).filter(
        ProductImage.id == image_id, ProductImage.product_id == product_id
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    db.delete(image)
    db.commit()
    return {"message": "Image deleted successfully"}
