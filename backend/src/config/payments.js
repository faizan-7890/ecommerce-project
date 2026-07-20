const Razorpay = require('razorpay');

const PLACEHOLDER_MARKERS = [
  'placeholder',
  'change_in_production',
  'rzp_test_placeholder',
];

function isPlaceholder(value) {
  if (!value || typeof value !== 'string') return true;
  const lower = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((m) => lower.includes(m));
}

function getPaymentEnv() {
  return {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  };
}

/**
 * Mock payment paths are allowed only in test mode or when explicitly opted in.
 * Never enabled for production.
 */
function allowMockPayments() {
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.NODE_ENV === 'test' || process.env.ALLOW_MOCK_PAYMENTS === 'true';
}

/**
 * Production must have real Razorpay secrets. Call on server startup.
 */
function assertPaymentConfigForEnvironment() {
  if (process.env.NODE_ENV !== 'production') return;

  const { keyId, keySecret, webhookSecret } = getPaymentEnv();
  const missing = [];

  if (isPlaceholder(keyId)) missing.push('RAZORPAY_KEY_ID');
  if (isPlaceholder(keySecret)) missing.push('RAZORPAY_KEY_SECRET');
  if (isPlaceholder(webhookSecret)) missing.push('RAZORPAY_WEBHOOK_SECRET');

  if (missing.length > 0) {
    throw new Error(
      `Production payment configuration invalid. Set real values for: ${missing.join(', ')}. ` +
        'Placeholder secrets are not allowed in production.'
    );
  }
}

let razorpayClient = null;

function getRazorpayClient() {
  if (razorpayClient) return razorpayClient;

  const { keyId, keySecret } = getPaymentEnv();

  if (allowMockPayments() && (isPlaceholder(keyId) || isPlaceholder(keySecret))) {
    return null;
  }

  if (isPlaceholder(keyId) || isPlaceholder(keySecret)) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Razorpay client cannot start with placeholder credentials in production');
    }
    return null;
  }

  razorpayClient = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
  return razorpayClient;
}

module.exports = {
  isPlaceholder,
  getPaymentEnv,
  allowMockPayments,
  assertPaymentConfigForEnvironment,
  getRazorpayClient,
};
