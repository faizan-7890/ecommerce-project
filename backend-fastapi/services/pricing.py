"""
Pricing service — tax, shipping, and discount calculations.
"""
import os
from decimal import Decimal


def get_tax_rate() -> Decimal:
    return Decimal(os.getenv("TAX_RATE", "0.08"))


def get_free_shipping_threshold() -> Decimal:
    return Decimal(os.getenv("FREE_SHIPPING_THRESHOLD", "100"))


def get_flat_shipping_fee() -> Decimal:
    return Decimal(os.getenv("FLAT_SHIPPING_FEE", "10"))


def calculate_item_price(base_price: Decimal, discount_price: Decimal) -> Decimal:
    """Calculate the final unit price after applying the flat discount."""
    discount = Decimal(str(discount_price)) if discount_price else Decimal("0")
    final = Decimal(str(base_price)) - discount
    return max(final, Decimal("0"))


def calculate_order_totals(subtotal: Decimal, discount_amount: Decimal) -> dict:
    """Calculate tax, shipping, and final total."""
    after_discount = subtotal - discount_amount
    if after_discount < 0:
        after_discount = Decimal("0")

    tax_rate = get_tax_rate()
    tax_amount = (after_discount * tax_rate).quantize(Decimal("0.01"))

    threshold = get_free_shipping_threshold()
    flat_fee = get_flat_shipping_fee()
    shipping_amount = Decimal("0") if after_discount >= threshold else flat_fee

    final_total = after_discount + tax_amount + shipping_amount

    return {
        "tax_amount": tax_amount,
        "shipping_amount": shipping_amount,
        "final_total": final_total.quantize(Decimal("0.01")),
    }
