# 9. Security Specification

## 9.1 OWASP Hardening Measures
- **CORS Protection**: Explicit origin matching (`FRONTEND_URL`) preventing unauthorized cross-domain API invocation.
- **HTTP Security Headers**: Enforced via FastAPI middleware:
  - `X-Frame-Options: DENY` (Clickjacking defense)
  - `X-Content-Type-Options: nosniff` (MIME sniffing defense)
  - `X-XSS-Protection: 1; mode=block` (Cross-site scripting defense)
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **SQL Injection Defense**: 100% parameter-bound queries enforced by SQLAlchemy ORM.
- **Cryptographic Signature Verification**: Razorpay payment HMAC SHA-256 signature verification preventing tampering.
