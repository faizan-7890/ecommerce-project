/**
 * Centralized JWT configuration — never use a hardcoded fallback secret.
 * The application must fail fast if JWT_SECRET is not set.
 */
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Call once at server startup. Throws if JWT_SECRET is missing.
 */
function assertJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error(
      'FATAL: JWT_SECRET environment variable is not set. ' +
        'The server cannot start without a secure JWT secret.'
    );
  }
}

module.exports = { JWT_SECRET, assertJwtSecret };
