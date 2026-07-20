const TAX_RATE = parseFloat(process.env.TAX_RATE || '0.08');
const FREE_SHIPPING_THRESHOLD = parseFloat(process.env.FREE_SHIPPING_THRESHOLD || '100');
const FLAT_SHIPPING_FEE = parseFloat(process.env.FLAT_SHIPPING_FEE || '10');

function calculateItemPrice(basePrice, discountPrice) {
  const flatDiscount = parseFloat(discountPrice || 0);
  let finalPrice = basePrice - flatDiscount;
  if (finalPrice < 0) finalPrice = 0;
  return finalPrice;
}

function calculateOrderTotals(subtotal, discountAmount) {
  const taxableSubtotal = subtotal - discountAmount;
  const taxAmount = taxableSubtotal * TAX_RATE;
  const shippingAmount = taxableSubtotal >= FREE_SHIPPING_THRESHOLD ? 0.0 : FLAT_SHIPPING_FEE;
  const finalTotal = taxableSubtotal + taxAmount + shippingAmount;

  return {
    taxableSubtotal,
    taxAmount,
    shippingAmount,
    finalTotal,
  };
}

module.exports = {
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
  FLAT_SHIPPING_FEE,
  calculateItemPrice,
  calculateOrderTotals,
};
