"""
Test fixtures — runs the real FastAPI app against a throwaway SQLite database
with Clerk authentication replaced by a fixed test user.
"""
import os
import sys
import tempfile
from pathlib import Path

# Must be set before `database` is imported, since the engine is created at import time.
_DB_PATH = Path(tempfile.mkdtemp()) / "veloce_test.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_DB_PATH.as_posix()}"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi import Depends
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine, get_db
from dependencies import get_current_user
from main import app
from models import Address, Cart, Category, Product, ProductVariant, Role, User

_ENV_KEYS = (
    "APP_ENV", "NODE_ENV",
    "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET",
    "TAX_RATE", "FREE_SHIPPING_THRESHOLD", "FLAT_SHIPPING_FEE",
)


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    """Start every test in development mode with Razorpay in mock mode and default pricing."""
    for key in _ENV_KEYS:
        monkeypatch.delenv(key, raising=False)


@pytest.fixture
def db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        app.dependency_overrides.clear()


def _make_user(db: Session, email: str, role_name: str) -> User:
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        role = Role(name=role_name)
        db.add(role)
        db.flush()
    user = User(name=email.split("@")[0], email=email, password="x", role_id=role.id)
    db.add(user)
    db.flush()
    db.add(Cart(user_id=user.id))
    db.commit()
    return user


@pytest.fixture
def customer(db) -> User:
    return _make_user(db, "customer@example.com", "CUSTOMER")


@pytest.fixture
def admin(db) -> User:
    return _make_user(db, "admin@example.com", "ADMIN")


@pytest.fixture
def variant(db) -> ProductVariant:
    """A ₹500 product with one variant holding 5 units."""
    category = Category(name="Apparel")
    db.add(category)
    db.flush()
    product = Product(
        name="Tee", slug="tee", description="A tee", base_price=500, discount_price=0, category_id=category.id
    )
    db.add(product)
    db.flush()
    variant = ProductVariant(product_id=product.id, sku="TEE-M-BLK", stock=5, size="M", color="Black")
    db.add(variant)
    db.commit()
    return variant


@pytest.fixture
def address(db, customer) -> Address:
    address = Address(
        user_id=customer.id, full_name="Test Customer", phone_number="9999999999",
        address_line1="1 MG Road", city="Bengaluru", state="KA", postal_code="560001", country="IN",
    )
    db.add(address)
    db.commit()
    return address


@pytest.fixture
def client_as():
    """client_as(user) returns a TestClient whose requests are authenticated as that user."""
    def _client(user: User) -> TestClient:
        user_id = user.id

        def _current_user(session: Session = Depends(get_db)) -> User:
            return session.get(User, user_id)

        app.dependency_overrides[get_current_user] = _current_user
        # Not used as a context manager, so the lifespan (create_all + auto-seed) does not run.
        return TestClient(app)

    return _client


def stock_of(db: Session, variant_id: int) -> int:
    db.expire_all()
    return db.get(ProductVariant, variant_id).stock
