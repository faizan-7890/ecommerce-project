import random
from decimal import Decimal
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import Category, Product, ProductVariant, ProductImage

def seed_data():
    db: Session = SessionLocal()
    
    try:
        # Create tables just in case they don't exist yet
        Base.metadata.create_all(bind=engine)
        
        # Check if we already have products
        if db.query(Product).count() > 0:
            print("Database already seeded with products!")
            return

        print("Seeding database with sample products...")

        # 1. Categories
        cat_mens = Category(name="Men's Fashion", description="High quality men's clothing and accessories.")
        cat_womens = Category(name="Women's Fashion", description="Elegant and trendy women's apparel.")
        cat_electronics = Category(name="Electronics", description="The latest gadgets and tech accessories.")
        
        db.add_all([cat_mens, cat_womens, cat_electronics])
        db.commit()
        db.refresh(cat_mens)
        db.refresh(cat_womens)
        db.refresh(cat_electronics)

        # 2. Products
        p1 = Product(
            name="Premium Cotton T-Shirt",
            description="A high-quality, 100% organic cotton t-shirt perfect for everyday wear. Super soft and breathable.",
            slug="premium-cotton-t-shirt",
            base_price=Decimal("29.99"),
            discount_price=Decimal("24.99"),
            status="active",
            category_id=cat_mens.id
        )

        p2 = Product(
            name="Vintage Leather Jacket",
            description="Classic vintage leather jacket with modern styling. Built to last a lifetime.",
            slug="vintage-leather-jacket",
            base_price=Decimal("199.99"),
            status="active",
            category_id=cat_womens.id
        )

        p3 = Product(
            name="Noise Cancelling Wireless Headphones",
            description="Industry-leading noise cancellation, up to 30 hours of battery life, and crystal clear sound.",
            slug="wireless-headphones-nc",
            base_price=Decimal("349.00"),
            discount_price=Decimal("299.00"),
            status="active",
            category_id=cat_electronics.id
        )

        db.add_all([p1, p2, p3])
        db.commit()
        db.refresh(p1)
        db.refresh(p2)
        db.refresh(p3)

        # 3. Variants
        # T-Shirt Variants
        v1 = ProductVariant(product_id=p1.id, sku="TS-BLK-M", color="Black", size="M", stock=50, price=Decimal("29.99"))
        v2 = ProductVariant(product_id=p1.id, sku="TS-BLK-L", color="Black", size="L", stock=50, price=Decimal("29.99"))
        v3 = ProductVariant(product_id=p1.id, sku="TS-WHT-M", color="White", size="M", stock=50, price=Decimal("29.99"))

        # Jacket Variants
        v4 = ProductVariant(product_id=p2.id, sku="JKT-BRN-S", color="Brown", size="S", stock=20, price=Decimal("199.99"))
        v5 = ProductVariant(product_id=p2.id, sku="JKT-BRN-M", color="Brown", size="M", stock=20, price=Decimal("199.99"))

        # Headphones Variants
        v6 = ProductVariant(product_id=p3.id, sku="HP-BLK", color="Midnight Black", stock=40, price=Decimal("349.00"))
        v7 = ProductVariant(product_id=p3.id, sku="HP-SLV", color="Silver", stock=35, price=Decimal("349.00"))

        db.add_all([v1, v2, v3, v4, v5, v6, v7])

        # 4. Images
        i1 = ProductImage(product_id=p1.id, url="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=800")
        i2 = ProductImage(product_id=p2.id, url="https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=800")
        i3 = ProductImage(product_id=p3.id, url="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=800")

        db.add_all([i1, i2, i3])

        db.commit()
        print("[OK] Sample products added successfully!")

    except Exception as e:
        print(f"[ERROR] Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
