# Veloce Ecommerce Stabilization PRD

**Status:** Draft
**Date:** 2026-07-19
**Product:** Veloce anime apparel ecommerce platform
**Purpose:** Define the work required to make the current implementation reliable, secure, consistent, and deployable.

## 1. Executive summary

Veloce already contains a substantial Express/Prisma backend and a working Next.js storefront. The backend integration tests pass and the frontend production build compiles, but the product is not ready for production because frontend lint is failing, several frontend/backend contracts are inconsistent, payments contain test fallbacks, and deployment/security behavior is incomplete.

This PRD prioritizes stabilization of the existing product. It does not redesign the storefront or add unrelated ecommerce features.

## 2. Goals

1. Make all customer and admin flows work end-to-end against the current API.
2. Make payment, refund, webhook, session, and password-reset flows safe for production.
3. Establish one canonical order, payment, currency, and inventory model.
4. Make the project pass its required quality gates.
5. Make a clean deployment reproducible from Docker and documented setup steps.

## 3. Non-goals

- New visual redesign or branding work.
- Shipping-provider integration.
- Real email delivery provider selection.
- Replacing Razorpay with another payment provider.
- Building a native mobile application.

## 4. Current quality baseline

- Backend tests: currently passing, 4 suites and 14 tests.
- Frontend production build: currently passing.
- Frontend lint: currently failing with 87 errors and 25 warnings.
- Payment integration: test/mock behavior exists but must not be allowed in production.

## 5. User stories

### Customer

- As a customer, I can register, log in, refresh my session, and log out safely.
- As a customer, I can browse only active products, select a valid variant, and see accurate stock and price information.
- As a customer, I can add products to a cart, check out, pay, and see the correct order status.
- As a customer, I can cancel an eligible order without duplicate stock restoration.
- As a customer, I can apply a valid coupon and see the same totals that the server charges.
- As a delivered customer, I can see and submit the verified review form for the purchased product.
- As a customer, I can request and complete a password reset without receiving a debug token in the API response.

### Administrator

- As an administrator, I can manage products, variants, categories, coupons, orders, and refunds using valid API states.
- As an administrator, I can view reliable analytics and audit records.
- As an administrator, I cannot accidentally put the system into an invalid payment, order, or inventory state.

### Operator/developer

- As an operator, I can start the application with documented, reproducible database setup.
- As a developer, I can run lint, type checking, build, and backend tests successfully before release.

## 6. Requirements and priority

Priority definitions:

- **P0:** Must be fixed before any production deployment.
- **P1:** Must be fixed before public beta.
- **P2:** Important quality improvement after stabilization.

### P0-A — Payment and webhook safety

1. Remove automatic mock-order fallback from production code paths. Mock payment behavior may exist only behind an explicit `NODE_ENV=test` or dedicated test adapter.
2. Require `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in production. Startup must fail clearly when required secrets are missing or still contain placeholder values.
3. Store both identifiers separately:
   - `razorpayOrderId` when the Razorpay order is created.
   - `razorpayPaymentId` after successful payment capture.
4. Verify the HMAC signature using a constant-time comparison.
5. Webhooks must fail closed when the secret, signature, or raw request body is missing or invalid.
6. Webhook processing must be idempotent. Duplicate events must not create duplicate refunds, status transitions, or stock restoration.
7. Refunds must call Razorpay with the captured payment ID, not the Razorpay order ID.
8. Refund validation must use the remaining refundable amount, not only the original payment amount.
9. A payment failure or abandoned checkout must have a defined stock policy. The initial implementation should add an explicit order expiration/reconciliation path and must not leave inventory reserved indefinitely.

**Acceptance criteria**

- Production configuration cannot create or verify a mock payment.
- A real successful payment persists both Razorpay IDs and updates the order exactly once.
- A real refund succeeds using the captured payment ID.
- Replaying the same webhook does not change stock or create another refund.
- Invalid webhook requests return 400 and do not modify the database.

### P0-B — Authentication and password reset

1. Keep access tokens in memory rather than `localStorage`.
2. Continue using the HttpOnly refresh cookie, with `secure` enabled in production and an explicit cookie domain/same-site policy documented for deployment.
3. On application startup, use the refresh endpoint to restore a session when the access token is absent or expired.
4. Replace the password-reset JWT/debug-token response with a one-time, hashed reset token stored in the database.
5. The forgot-password endpoint must always return the same public message for known and unknown email addresses.
6. Add frontend pages for forgot password and reset password.
7. Revoke all refresh sessions after password reset or password change.
8. Add rate limiting to forgot-password and reset-password endpoints.

**Acceptance criteria**

- No access token or reset token is written to browser storage or returned as `debugToken`.
- Reloading the application restores a valid session through the refresh cookie.
- A reset token works once, expires, and cannot be reused.
- Password reset tests cover unknown email, expired token, reused token, and successful reset.

### P0-C — Canonical order, payment, and inventory states

1. Define and document one canonical order state machine:

   `pending → processing → shipped → delivered`

   Allowed terminal states: `cancelled`, `returned`.

2. Remove the undocumented `confirmed` state, or formally add it everywhere. Recommended choice: use `processing` after successful payment.
3. Align backend validation, frontend select options, schema comments, README, terms page, and tests with the same states.
4. Make cancellation and refund transitions explicit and idempotent.
5. Every stock mutation must happen inside a transaction and write an accurate inventory log with the real previous and new quantities.
6. Scope idempotency keys to the authenticated user. A key created by one user must never return another user’s order.
7. Make coupon usage reservation atomic so concurrent checkouts cannot exceed the usage limit.

**Acceptance criteria**

- No API or UI emits `confirmed` unless it is part of the documented state machine.
- Concurrent checkout never produces negative stock.
- Repeated cancellation, refund, or webhook requests do not restore stock twice.
- An idempotency key cannot expose or return an order belonging to another user.

### P0-D — Frontend/API contract fixes

1. Change the verified-buyer check from `order.status` to the backend field `orderStatus`.
2. Add shared TypeScript types for users, products, variants, carts, orders, payments, coupons, and API errors. Remove application-level `any` types.
3. Fix the admin data-loading hooks so functions are declared/memoized correctly and included in dependency arrays.
4. Fix refresh-queue retry behavior so a failed retry is treated as an error rather than returned as a successful JSON response.
5. Add loading, error, empty, and success states that do not rely on blocking browser `alert()` calls.
6. Replace raw `<img>` elements with `next/image` where appropriate, or document the intentional exception for external image URLs.
7. Wire footer links to `/privacy-policy` and `/terms`.
8. Add a proper wishlist-to-cart flow for products with variants. The current action should route to product selection rather than pretending to move an unselected variant to the cart.

**Acceptance criteria**

- A delivered user sees the review form and can submit a valid review.
- `npm run lint` completes with zero errors; warnings are either removed or explicitly approved.
- Admin tabs load without hook-order or stale-function behavior.
- Footer legal links open the existing pages.

### P1-A — Catalog and stock correctness

1. Choose one supported inventory model. Recommended: every active product must have at least one product variant; all stock is held on variants.
2. Reject active products without variants, or add a real product-level stock field if base products must remain supported.
3. Remove mock stock values such as `99` and `lowStockThreshold` fallbacks from cart and wishlist behavior.
4. Validate all numeric fields server-side: prices, stock, thresholds, quantities, page, limit, coupon values, and dates.
5. Public product detail routes must not expose disabled products.
6. Price filters and displayed prices must use the same effective price model as cart and checkout, including variant overrides and product discounts.

### P1-B — Currency and content consistency

1. Select INR as the product currency because Razorpay is configured for INR.
2. Display `₹` or a centrally configured currency formatter throughout the frontend.
3. Update coupon messages, shipping thresholds, checkout summaries, README, privacy policy, and terms to use INR.
4. Replace all Stripe references with Razorpay.
5. Confirm tax and shipping thresholds with the product owner before release; then centralize them in one backend pricing module.

### P1-C — Deployment and operations

1. Add a database health check to `/api/health`; it must report unhealthy when PostgreSQL is unavailable.
2. Add a PostgreSQL health check to Docker Compose and make backend startup wait for a healthy database.
3. Run `prisma migrate deploy` during deployment/startup using a controlled entrypoint. Do not seed production automatically.
4. Provide a separate development/test seed command.
5. Ensure the production Docker image can generate/use the Prisma client without relying on an unavailable dev dependency.
6. Replace hard-coded compose secrets with environment-variable references and an `.env.example` file containing safe placeholders.
7. Add structured logging for payment, webhook, inventory, and authentication events without logging secrets or reset tokens.

## 7. Technical design direction

### Shared pricing service

Create one backend pricing module that calculates:

- effective item price;
- subtotal;
- coupon discount;
- tax;
- shipping;
- final total.

The checkout API remains the source of truth. The frontend may preview totals, but it must render the totals returned by the server after order creation.

### Payment data model

Add a dedicated Razorpay order ID and Razorpay payment ID field, or a provider reference structure, rather than overloading `Payment.transactionId`. Persist provider event IDs for webhook idempotency.

### State transitions

Centralize legal order/payment/refund transitions in backend functions. Route handlers should call those functions instead of assigning arbitrary strings in multiple files.

### API client

Create typed response helpers and a typed `ApiError`. Keep token refresh logic in one place and ensure all retry paths validate HTTP status before parsing the response.

## 8. Testing requirements

### Backend

Keep the existing passing tests and add coverage for:

- invalid and missing production payment configuration;
- real signature verification and invalid signatures;
- payment ID persistence and refund ID usage;
- duplicate webhook and refund events;
- cross-user idempotency-key protection;
- coupon usage races;
- disabled product detail access;
- no-variant inventory rejection;
- password reset lifecycle;
- database-unhealthy health response.

### Frontend

Add focused tests or browser smoke tests for:

- login/session restoration;
- cart and checkout totals;
- delivered-user review visibility;
- card-payment success/failure/cancel paths;
- footer legal links;
- admin status updates;
- variant wishlist behavior.

### Release gates

The release is blocked unless all of the following pass:

```text
npm run lint
npm run build
cd backend && npm test
```

For staging, also run a Docker deployment smoke test with a clean PostgreSQL volume and a Razorpay test account.

## 9. Delivery phases

### Phase 1 — P0 safety and correctness

- Payment/webhook hardening.
- Access-token and reset-token changes.
- Canonical order states.
- Frontend/API contract fixes.
- Regression tests.

### Phase 2 — P1 reliability and deployment

- Inventory model cleanup.
- Currency/content consistency.
- Docker migration/health-check flow.
- Typed API client and frontend error states.

### Phase 3 — P2 polish

- UI notification system replacing remaining alerts.
- Image optimization.
- Expanded frontend automation and accessibility review.
- Operational dashboards and log retention.

## 10. Definition of done

The stabilization work is complete when:

1. All P0 and P1 acceptance criteria pass.
2. Backend tests remain green and new regression tests are committed.
3. Frontend lint and production build pass.
4. A clean Docker deployment migrates the database and starts only after PostgreSQL is healthy.
5. Razorpay test payments, failed payments, duplicate webhooks, partial refunds, and full refunds are verified in staging.
6. The README and legal/product copy accurately describe the implemented behavior.
7. No mock payment, debug token, placeholder secret, or test-only bypass is reachable in production mode.

## 11. Decisions required from product owner

- Confirm INR as the single storefront currency.
- Confirm whether every product must have variants, or whether product-level stock is required.
- Confirm tax rate and free-shipping threshold.
- Confirm cancellation policy for paid orders before shipment.
- Select an email provider for password-reset and verification emails.
