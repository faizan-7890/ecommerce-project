from decimal import Decimal

from services.pricing import calculate_item_price, calculate_order_totals


def test_item_price_applies_flat_discount():
    assert calculate_item_price(Decimal("500"), Decimal("50")) == Decimal("450")


def test_item_price_never_goes_negative():
    assert calculate_item_price(Decimal("20"), Decimal("50")) == Decimal("0")


def test_totals_below_free_shipping_threshold_add_flat_fee():
    totals = calculate_order_totals(Decimal("50.00"), Decimal("0"))
    assert totals["tax_amount"] == Decimal("4.00")
    assert totals["shipping_amount"] == Decimal("10")
    assert totals["final_total"] == Decimal("64.00")


def test_totals_apply_discount_before_tax_and_shipping_threshold():
    # 120 - 30 = 90 is under the 100 threshold, so shipping is charged on the discounted amount
    totals = calculate_order_totals(Decimal("120.00"), Decimal("30.00"))
    assert totals["tax_amount"] == Decimal("7.20")
    assert totals["shipping_amount"] == Decimal("10")
    assert totals["final_total"] == Decimal("107.20")


def test_totals_respect_env_configuration(monkeypatch):
    monkeypatch.setenv("TAX_RATE", "0.18")
    monkeypatch.setenv("FREE_SHIPPING_THRESHOLD", "1000")
    totals = calculate_order_totals(Decimal("500.00"), Decimal("0"))
    assert totals["tax_amount"] == Decimal("90.00")
    assert totals["shipping_amount"] == Decimal("10")
