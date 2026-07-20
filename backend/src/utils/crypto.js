const crypto = require('crypto');

/** SHA-256 hex digest of a string token. */
function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

/**
 * Constant-time string comparison (HMAC / signature safe).
 * Returns false when either side is missing or lengths differ.
 */
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Consume a comparison to reduce length-based timing signal
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { hashToken, safeEqual };
