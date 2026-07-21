"""
Inventory service — stock decrement/restore with full audit logging.
Uses SELECT ... FOR UPDATE for row-level locking on MySQL InnoDB.
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from models import ProductVariant, InventoryLog, Order


def decrement_variant_stock(
    db: Session,
    product_id: int,
    variant_id: int,
    quantity: int,
    user_id: int,
) -> None:
    """
    Atomically decrement variant stock with row-level locking.
    Raises ValueError if insufficient stock.
    """
    # Row-level lock using FOR UPDATE
    result = db.execute(
        text("SELECT id, stock FROM product_variants WHERE id = :vid FOR UPDATE"),
        {"vid": variant_id},
    )
    row = result.fetchone()

    if not row:
        raise ValueError(f"Variant {variant_id} not found")

    current_stock = row[1]
    if current_stock < quantity:
        raise ValueError(f"Insufficient stock for variant {variant_id}. Available: {current_stock}, Requested: {quantity}")

    new_stock = current_stock - quantity

    db.execute(
        text("UPDATE product_variants SET stock = :new_stock WHERE id = :vid"),
        {"new_stock": new_stock, "vid": variant_id},
    )

    # Audit log
    log = InventoryLog(
        product_id=product_id,
        variant_id=variant_id,
        previous_quantity=current_stock,
        new_quantity=new_stock,
        change_amount=-quantity,
        reason="checkout",
        updated_by=f"user_{user_id}",
    )
    db.add(log)


def restore_order_stock(
    db: Session,
    order: Order,
    reason: str,
    updated_by: str,
) -> None:
    """
    Restore stock for all items in an order (at most once via stockRestored flag).
    """
    if order.stock_restored:
        return

    for item in order.items:
        if item.variant_id:
            variant = db.query(ProductVariant).filter(
                ProductVariant.id == item.variant_id
            ).with_for_update().first()

            if variant:
                prev = variant.stock
                variant.stock += item.quantity

                log = InventoryLog(
                    product_id=item.product_id,
                    variant_id=item.variant_id,
                    previous_quantity=prev,
                    new_quantity=variant.stock,
                    change_amount=item.quantity,
                    reason=reason,
                    order_id=order.id,
                    updated_by=updated_by,
                )
                db.add(log)

    order.stock_restored = True
