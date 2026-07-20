/** Canonical storefront currency is INR (Razorpay). */
export const CURRENCY_CODE = 'INR';
export const CURRENCY_SYMBOL = '₹';

export function formatCurrency(amount: number | string): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(value)) return `${CURRENCY_SYMBOL}0.00`;
  return `${CURRENCY_SYMBOL}${value.toFixed(2)}`;
}
