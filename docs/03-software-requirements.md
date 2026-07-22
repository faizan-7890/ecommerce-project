# 3. Software Requirements Specification (SRS)

## 3.1 Functional Requirements (FR)

| Req ID | Module | Description | Priority |
|---|---|---|---|
| **FR-01** | **Auth** | Single Sign-On (SSO) and JWT session validation via Clerk Auth. | High |
| **FR-02** | **Catalog** | Paginated product listing with full-text search, price filtering, and category scoping. | High |
| **FR-03** | **Product Detail** | SKU variant selection (size, color, material), gallery images, and `schema.org/Product` JSON-LD microdata. | High |
| **FR-04** | **Cart & Checkout** | Persistent server-side cart, coupon code validation, and shipping address snapshotting. | High |
| **FR-05** | **Payments** | Order creation and cryptographic signature verification via Razorpay SDK. | High |
| **FR-06** | **Wishlist** | Optimistic UI heart toggling and persistent `/wishlist` management page. | Medium |
| **FR-07** | **Order Tracking** | 4-step delivery status timeline stepper (`/orders/[id]`) and printable PDF invoice view. | Medium |
| **FR-08** | **Admin Panel** | Analytics dashboard with revenue charts, low-stock warnings, and product/variant CRUD modals. | High |

## 3.2 Non-Functional Requirements (NFR)
- **NFR-01 (Performance)**: API endpoint response latency under 150ms for 95% of requests.
- **NFR-02 (Security)**: All endpoints protected against OWASP Top 10 risks (SQL Injection, XSS, CSRF, Unauthenticated Access).
- **NFR-03 (Compatibility)**: Fully responsive across viewports from mobile 320px up to 4K desktop displays.
- **NFR-04 (Maintainability)**: 100% strict TypeScript type checking on frontend and Pydantic v2 schemas on backend.
