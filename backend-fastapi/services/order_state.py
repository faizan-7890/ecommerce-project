"""
Order state machine — determines valid transitions and stock restore eligibility.
"""

PAID_ORDER_STATUS = "processing"

# States where stock can still be restored
RESTORABLE_STATUSES = {"pending", "cancelled"}


def can_restore_stock(order) -> bool:
    """Check if stock should be restored for this order."""
    if order.stock_restored:
        return False
    return True
