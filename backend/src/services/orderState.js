/**
 * Canonical order state machine (P0-C).
 *
 * orderStatus: pending → processing → shipped → delivered
 * Terminal: cancelled, returned
 *
 * Payment success moves pending → processing (never "confirmed").
 */

const ORDER_STATUSES = Object.freeze([
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
]);

const PAYMENT_STATUSES = Object.freeze([
  'unpaid',
  'authorized',
  'paid',
  'failed',
  'refunded',
  'partially_refunded',
]);

const SHIPMENT_STATUSES = Object.freeze([
  'unfulfilled',
  'label_created',
  'shipped',
  'in_transit',
  'delivered',
]);

const REFUND_STATUSES = Object.freeze(['none', 'pending', 'completed', 'failed']);

const TERMINAL_ORDER_STATUSES = Object.freeze(['cancelled', 'returned']);

/** Statuses from which stock was already reserved at checkout and may be restored once. */
function canRestoreStock(order) {
  if (!order) return false;
  if (order.stockRestored) return false;
  return !TERMINAL_ORDER_STATUSES.includes(order.orderStatus) || order.orderStatus === 'pending';
}

function isValidOrderStatus(status) {
  return ORDER_STATUSES.includes(status);
}

function isValidPaymentStatus(status) {
  return PAYMENT_STATUSES.includes(status);
}

function isValidShipmentStatus(status) {
  return SHIPMENT_STATUSES.includes(status);
}

function isValidRefundStatus(status) {
  return REFUND_STATUSES.includes(status);
}

/** Order status after successful payment capture. */
const PAID_ORDER_STATUS = 'processing';

module.exports = {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  SHIPMENT_STATUSES,
  REFUND_STATUSES,
  TERMINAL_ORDER_STATUSES,
  PAID_ORDER_STATUS,
  canRestoreStock,
  isValidOrderStatus,
  isValidPaymentStatus,
  isValidShipmentStatus,
  isValidRefundStatus,
};
