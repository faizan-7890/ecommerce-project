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

        print("Seeding database with sample products and images...")

        # 1. Categories
        categories_data = [
            ("Men's Fashion", "High quality men's clothing and accessories."),
            ("Women's Fashion", "Elegant and trendy women's apparel."),
            ("Electronics", "The latest gadgets and tech accessories."),
            ("Footwear", "Premium shoes, sneakers, and boots."),
            ("Accessories", "Watches, bags, and luxury accessories."),
        ]

        categories_map = {}
        for cat_name, cat_desc in categories_data:
            existing = db.query(Category).filter(Category.name == cat_name).first()
            if not existing:
                existing = Category(name=cat_name, description=cat_desc)
                db.add(existing)
                db.commit()
                db.refresh(existing)
            categories_map[cat_name] = existing

        # 2. Products Data
        sample_products = [
            {
                "name": "Premium Cotton T-Shirt",
                "slug": "premium-cotton-t-shirt",
                "description": "A high-quality 100% organic cotton t-shirt perfect for everyday wear. Super soft, breathable, and pre-shrunk.",
                "base_price": Decimal("29.99"),
                "discount_price": Decimal("24.99"),
                "brand": "Veloce Basics",
                "category": "Men's Fashion",
                "images": [
                    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?q=80&w=800&auto=format&fit=crop"
                ],
                "variants": [
                    {"sku": "TS-BLK-M", "color": "Black", "size": "M", "stock": 45, "price": Decimal("29.99")},
                    {"sku": "TS-BLK-L", "color": "Black", "size": "L", "stock": 30, "price": Decimal("29.99")},
                    {"sku": "TS-WHT-M", "color": "White", "size": "M", "stock": 4, "price": Decimal("29.99")},
                ]
            },
            {
                "name": "Vintage Leather Jacket",
                "slug": "vintage-leather-jacket",
                "description": "Classic vintage genuine leather jacket with modern styling. Features heavy-duty YKK zippers and satin lining.",
                "base_price": Decimal("199.99"),
                "discount_price": Decimal("169.99"),
                "brand": "Heritage Leather",
                "category": "Women's Fashion",
                "images": [
                    "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1520975954732-35dd22299614?q=80&w=800&auto=format&fit=crop"
                ],
                "variants": [
                    {"sku": "JKT-BRN-S", "color": "Brown", "size": "S", "stock": 15, "price": Decimal("199.99")},
                    {"sku": "JKT-BRN-M", "color": "Brown", "size": "M", "stock": 3, "price": Decimal("199.99")},
                ]
            },
            {
                "name": "Noise Cancelling Headphones",
                "slug": "wireless-headphones-nc",
                "description": "Industry-leading active noise cancellation, 30 hours of battery life, custom EQ tuning, and ultra-soft memory foam ear cushions.",
                "base_price": Decimal("349.00"),
                "discount_price": Decimal("299.00"),
                "brand": "AudioTech Pro",
                "category": "Electronics",
                "images": [
                    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1484704849700-f032a568e944?q=80&w=800&auto=format&fit=crop"
                ],
                "variants": [
                    {"sku": "HP-BLK", "color": "Midnight Black", "stock": 25, "price": Decimal("349.00")},
                    {"sku": "HP-SLV", "color": "Silver", "stock": 2, "price": Decimal("349.00")},
                ]
            },
            {
                "name": "Minimalist Chronograph Watch",
                "slug": "minimalist-chronograph-watch",
                "description": "Sleek stainless steel case with sapphire crystal glass and genuine Italian leather strap. Water resistant to 50 meters.",
                "base_price": Decimal("149.00"),
                "discount_price": Decimal("129.00"),
                "brand": "Krono Co.",
                "category": "Accessories",
                "images": [
                    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop"
                ],
                "variants": [
                    {"sku": "WCH-SLV", "color": "Silver / Tan", "stock": 18, "price": Decimal("149.00")},
                    {"sku": "WCH-BLK", "color": "Matte Black", "stock": 4, "price": Decimal("149.00")},
                ]
            },
            {
                "name": "Urban Canvas Backpack",
                "slug": "urban-canvas-backpack",
                "description": "Water-resistant heavy canvas pack featuring dedicated 15-inch laptop compartment, ergonomic padded straps, and hidden travel pocket.",
                "base_price": Decimal("89.99"),
                "discount_price": Decimal("69.99"),
                "brand": "Nomad Supply",
                "category": "Accessories",
                "images": [
                    "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?q=80&w=800&auto=format&fit=crop"
                ],
                "variants": [
                    {"sku": "BP-GRN", "color": "Olive Green", "stock": 35, "price": Decimal("89.99")},
                    {"sku": "BP-GRY", "color": "Charcoal Grey", "stock": 20, "price": Decimal("89.99")},
                ]
            },
            {
                "name": "Performance Running Sneakers",
                "slug": "performance-running-sneakers",
                "description": "Responsive nitrogen-infused foam midsole providing maximum energy return. Breathable engineered mesh upper.",
                "base_price": Decimal("129.99"),
                "discount_price": Decimal("99.99"),
                "brand": "Velocity Sport",
                "category": "Footwear",
                "images": [
                    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=800&auto=format&fit=crop"
                ],
                "variants": [
                    {"sku": "SNK-RED-9", "color": "Crimson Red", "size": "9", "stock": 12, "price": Decimal("129.99")},
                    {"sku": "SNK-RED-10", "color": "Crimson Red", "size": "10", "stock": 3, "price": Decimal("129.99")},
                ]
            },
            {
                "name": "Ergonomic Wireless Mouse",
                "slug": "ergonomic-wireless-mouse",
                "description": "Sculpted ergonomic design reducing wrist strain. High-precision 4000 DPI sensor works on any surface, including glass.",
                "base_price": Decimal("59.99"),
                "discount_price": Decimal("49.99"),
                "brand": "TechGear",
                "category": "Electronics",
                "images": [
                    "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=800&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?q=80&w=800&auto=format&fit=crop"
                ],
                "variants": [
                    {"sku": "MS-GRY", "color": "Graphite", "stock": 50, "price": Decimal("59.99")},
                ]
            },
            {
                "name": "Smart Fitness Band Pro",
                "slug": "smart-fitness-band-pro",
                "description": "Vibrant AMOLED display with continuous heart rate monitoring, SPO2 tracking, 14-day battery life, and 50m water resistance.",
                "base_price": Decimal("79.99"),
                "discount_price": Decimal("59.99"),
                "brand": "FitPulse",
                "category": "Electronics",
                "images": [
                    "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?q=80&w=800&auto=format&fit=crop",
                    "https://images.unsplash.com/photo-1510017803434-a899398421b3?q=80&w=800&auto=format&fit=crop"
                ],
                "variants": [
                    {"sku": "FB-BLK", "color": "Black", "stock": 40, "price": Decimal("79.99")},
                ]
            }
        ]

        for pdata in sample_products:
            prod = db.query(Product).filter(Product.slug == pdata["slug"]).first()
            if not prod:
                cat = categories_map[pdata["category"]]
                prod = Product(
                    name=pdata["name"],
                    slug=pdata["slug"],
                    description=pdata["description"],
                    base_price=pdata["base_price"],
                    discount_price=pdata.get("discount_price", Decimal("0")),
                    brand=pdata.get("brand", "Veloce"),
                    status="active",
                    category_id=cat.id
                )
                db.add(prod)
                db.commit()
                db.refresh(prod)
            else:
                # Update images if existing
                prod.name = pdata["name"]
                prod.description = pdata["description"]
                prod.base_price = pdata["base_price"]
                prod.discount_price = pdata.get("discount_price", Decimal("0"))
                db.commit()

            # Ensure product images exist
            existing_imgs = db.query(ProductImage).filter(ProductImage.product_id == prod.id).all()
            if not existing_imgs:
                for img_url in pdata["images"]:
                    img_obj = ProductImage(product_id=prod.id, url=img_url)
                    db.add(img_obj)
                db.commit()

            # Ensure product variants exist
            existing_vars = db.query(ProductVariant).filter(ProductVariant.product_id == prod.id).all()
            if not existing_vars:
                for vdata in pdata["variants"]:
                    var_obj = ProductVariant(
                        product_id=prod.id,
                        sku=vdata["sku"],
                        color=vdata.get("color"),
                        size=vdata.get("size"),
                        stock=vdata["stock"],
                        price=vdata.get("price")
                    )
                    db.add(var_obj)
                db.commit()

        print("[OK] Sample products and high-resolution Unsplash images seeded successfully!")

    except Exception as e:
        print(f"[ERROR] Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
