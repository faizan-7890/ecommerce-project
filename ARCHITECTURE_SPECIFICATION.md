# System Architecture & Technical Specification Document
## Project: Veloce E-Commerce Platform
**Version:** 2.0.0  
**Date:** July 22, 2026  
**Document Status:** Final Production Specification  

---

## 1. Executive Summary

### 1.1 Purpose & Scope
The **Veloce E-Commerce Platform** is a modern, high-performance, full-stack digital commerce web application designed to deliver an exceptional shopping experience for retail customers while empowering administrative personnel with real-time operational insights, inventory control, and order lifecycle management.

### 1.2 Key Objectives
- **Sub-Second Page Loads**: Deliver fast client-side rendering and static page optimization powered by Next.js 16 (App Router + Turbopack).
- **Scalable REST API**: Provide an asynchronous, asynchronous-first RESTful backend built with FastAPI, Python 3.12, and SQLAlchemy ORM.
- **Enterprise Security**: Integrate Clerk Auth keyless JWT security, OWASP security headers, CORS origin controls, and Pydantic v2 input validation.
- **Dual Payment Capability**: Provide native payment processing supporting Razorpay (India & International cards/UPI) with mock fallback modes for rapid developer iteration.
- **Production Containerization**: Enable multi-stage Docker builds featuring Next.js `output: 'standalone'` and Gunicorn + Uvicorn multi-worker process management.

---

## 2. Business Requirements (BRD)

### 2.1 Business Goals
1. **Maximize Conversion Rate**: Offer an intuitive user journey with debounced live search, interactive wishlist toggles, instant cart sliders, and a streamlined 3-step checkout process.
2. **Minimize Inventory Shrinkage**: Maintain strict stock locking across product size/color variants with real-time inventory validation prior to checkout completion.
3. **Automate Operational Workflows**: Streamline administrative status tracking across order states (`Pending` ➔ `Processing` ➔ `Shipped` ➔ `Delivered`).

### 2.2 User Personas
- **Guest / Shopper**: Browses catalog, searches products with debounced autocomplete, filters by category/price range, and views product reviews.
- **Authenticated Customer**: Manages saved wishlist items, maintains a multi-address shipping book, places orders via Razorpay, and tracks real-time shipment status timelines.
- **Store Administrator**: Monitors live revenue analytics, manages products/variants, creates discount coupons, sets low-stock threshold warnings, and updates order states.

### 2.3 Success Metrics
- **Catalog Page Load Time**: < 1.2 seconds (LCP).
- **Checkout Completion Time**: < 45 seconds for authenticated users.
- **System Uptime Target**: 99.9% availability under production load.

---

## 3. Software Requirements Specification (SRS)

### 3.1 Functional Requirements (FR)

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

### 3.2 Non-Functional Requirements (NFR)
- **NFR-01 (Performance)**: API endpoint response latency under 150ms for 95% of requests.
- **NFR-02 (Security)**: All endpoints protected against OWASP Top 10 risks (SQL Injection, XSS, CSRF, Unauthenticated Access).
- **NFR-03 (Compatibility)**: Fully responsive across Viewports from mobile 320px up to 4K desktop displays.
- **NFR-04 (Maintainability)**: 100% strict TypeScript type checking on frontend and Pydantic v2 schemas on backend.

---

## 4. System Architecture

### 4.1 High-Level Architecture Diagram
```
                     +---------------------------------+
                     |    Web Browser / Client Device  |
                     +---------------------------------+
                                      |
                                      v
                     +---------------------------------+
                     |       Next.js 16 Frontend       |
                     |  (Port 3000 | App Router / SSR) |
                     +---------------------------------+
                                      |
                           HTTPS / REST API Requests
                                      v
                     +---------------------------------+
                     |     FastAPI Backend Gateway     |
                     | (Port 8000 | Gunicorn + Uvicorn)|
                     +---------------------------------+
                        /             |             \
                       /              |              \
                      v               v               v
            +----------------+ +---------------+ +---------------+
            |  Clerk Auth    | |  MySQL 8 DB   | | Razorpay Gateway|
            | (JWKS Validation)| (PyMySQL/SQLAlchemy)|(SDK Signature Verification)|
            +----------------+ +---------------+ +---------------+
```

### 4.2 Architectural Patterns
- **Separation of Concerns**: Decoupled presentation layer (Next.js) and API services (FastAPI).
- **Repository / ORM Pattern**: Database access managed exclusively through SQLAlchemy ORM sessions.
- **Optimistic UI & Client Contexts**: Local state management via React Contexts (`CartContext`, `WishlistContext`, `ToastContext`).

---

## 5. Database Design

### 5.1 Entity Relationship Diagram (ERD) Overview
The platform uses a relational MySQL database schema designed around third normal form (3NF).

```
[User] 1---N [Order] 1---N [OrderItem] N---1 [ProductVariant] N---1 [Product]
  |            |                                                         |
  1---N        1---N [Payment]                                          1---N [ProductImage]
[Address]                                                               |
  |                                                                     1---N [WishlistItem]
  +---------------------------------------------------------------------+
```

### 5.2 Core Table Schemas

#### 1. `products`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT` | `PRIMARY KEY, AUTO_INCREMENT` | Unique product identifier |
| `name` | `VARCHAR(255)` | `NOT NULL, INDEX` | Product title |
| `slug` | `VARCHAR(255)` | `NOT NULL, UNIQUE, INDEX` | URL-friendly slug |
| `description` | `TEXT` | `NOT NULL` | Detailed specifications |
| `brand` | `VARCHAR(100)` | `NULLABLE` | Brand name |
| `base_price` | `DECIMAL(10,2)` | `NOT NULL` | Base price in INR (₹) |
| `discount_price` | `DECIMAL(10,2)` | `DEFAULT 0.00` | Flat discount amount |
| `category_id` | `INT` | `FOREIGN KEY (categories.id)` | Scoped category |
| `status` | `VARCHAR(20)` | `DEFAULT 'active'` | State (`active`, `disabled`) |

#### 2. `product_variants`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT` | `PRIMARY KEY, AUTO_INCREMENT` | Unique variant identifier |
| `product_id` | `INT` | `FOREIGN KEY (products.id)` | Parent product reference |
| `sku` | `VARCHAR(100)` | `NOT NULL, UNIQUE` | Stock Keeping Unit |
| `price` | `DECIMAL(10,2)` | `NULLABLE` | Overridden price if applicable |
| `stock` | `INT` | `NOT NULL, DEFAULT 0` | Available physical quantity |
| `size` | `VARCHAR(50)` | `NULLABLE` | Size option (e.g. S, M, L, XL) |
| `color` | `VARCHAR(50)` | `NULLABLE` | Color swatch (e.g. Black, Navy) |

#### 3. `orders`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT` | `PRIMARY KEY, AUTO_INCREMENT` | Internal order ID |
| `order_number` | `VARCHAR(100)` | `NOT NULL, UNIQUE` | Customer-facing order ref |
| `user_id` | `INT` | `FOREIGN KEY (users.id)` | Ordering customer |
| `order_status` | `VARCHAR(50)` | `DEFAULT 'pending'` | State (`pending`, `processing`, `shipped`, `delivered`, `cancelled`) |
| `payment_status` | `VARCHAR(50)` | `DEFAULT 'unpaid'` | State (`unpaid`, `paid`, `failed`) |
| `total` | `DECIMAL(10,2)` | `NOT NULL` | Total charged in INR (₹) |
| `shipping_address_snapshot` | `JSON` | `NOT NULL` | Frozen shipping address details |

---

## 6. API Specification

All REST API endpoints are prefixed with `/api` and utilize standard HTTP status codes (`200`, `201`, `400`, `401`, `403`, `404`, `500`).

### 6.1 Key Endpoints Summary

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | System and database health status |
| `GET` | `/api/products` | Public | List products with search, pagination, and filters |
| `GET` | `/api/products/slug/{slug}` | Public | Lookup product by URL-friendly slug |
| `GET` | `/api/categories` | Public | Retrieve product categories catalog |
| `GET` | `/api/cart` | User | Get current user's shopping cart |
| `POST` | `/api/cart/items` | User | Add item/variant to shopping cart |
| `DELETE` | `/api/cart/items/{id}` | User | Remove item from shopping cart |
| `GET` | `/api/wishlist` | User | Retrieve saved wishlist items |
| `POST` | `/api/wishlist` | User | Toggle product in/out of wishlist |
| `POST` | `/api/orders` | User | Create new purchase order from cart |
| `GET` | `/api/orders/{id}` | User | Retrieve order details & tracking status |
| `POST` | `/api/payments/razorpay/create-order` | User | Generate Razorpay order ID |
| `POST` | `/api/payments/razorpay/verify` | User | Cryptographic signature validation |
| `GET` | `/api/admin/stats` | Admin | Retrieve sales summaries, revenue & audit logs |

---

## 7. Frontend Design

### 7.1 Tech Stack & UI Libraries
- **Framework**: Next.js 16 (App Router + React 19)
- **Styling**: Vanilla CSS tokens + TailwindCSS v3
- **Animations**: Framer Motion
- **Icons & Images**: Next.js `<Image>` with webp/avif support and responsive `sizes`

### 7.2 Core Component Hierarchy
```
[RootLayout]
  ├── [ErrorBoundary]
  ├── [ToastProvider]
  ├── [WishlistProvider]
  └── [CartProvider]
        ├── [Header] (Logo, Live Search Autocomplete, Wishlist Badge, Cart Slider, User Profile Button)
        ├── [Page Content]
        │     ├── Home / Catalog Grid ([ProductCard])
        │     ├── Product Detail Page ([JSON-LD Schema], Variant Selectors, Reviews)
        │     ├── Wishlist Page (/wishlist)
        │     ├── Order Detail Page (/orders/[id] - 4-step Stepper)
        │     └── Admin Dashboard (/admin - Revenue Charts, Product Modals)
        └── [Footer]
```

---

## 8. Backend Design

### 8.1 Technology Choice & Rationale
- **FastAPI**: Asynchronous Python web framework delivering high performance (comparable to Node.js / Go) with automatic OpenAPI / Swagger documentation at `/docs`.
- **Pydantic v2**: High-speed C-extension schema validation with camelCase alias generation (`to_camel`).
- **SQLAlchemy 2.0**: Enterprise-grade Object-Relational Mapping providing clean eager loading (`joinedload`) to prevent N+1 query performance degradation.

### 8.2 Authentication & Verification Flow
1. Client signs in via Clerk Auth modal on frontend.
2. Next.js retrieves the JWT session token and attaches it to API requests via HTTP Header: `Authorization: Bearer <clerk_jwt>`.
3. FastAPI backend verifies the token using Clerk's JSON Web Key Set (JWKS) cached in-memory with a 1-hour TTL.

---

## 9. Security Specification

### 9.1 OWASP Hardening Measures
- **CORS Protection**: Explicit origin matching (`FRONTEND_URL`) preventing unauthorized cross-domain API invocation.
- **HTTP Security Headers**: Enforced via FastAPI middleware:
  - `X-Frame-Options: DENY` (Clickjacking defense)
  - `X-Content-Type-Options: nosniff` (MIME sniffing defense)
  - `X-XSS-Protection: 1; mode=block` (Cross-site scripting defense)
  - `Referrer-Policy: strict-origin-when-cross-origin`
- **SQL Injection Defense**: 100% parameter-bound queries enforced by SQLAlchemy ORM.
- **Cryptographic Signature Verification**: Razorpay payment HMAC SHA-256 signature verification preventing tampering.

---

## 10. DevOps & CI/CD

### 10.1 Production Docker Orchestration
The project includes a multi-stage `docker-compose.prod.yml` configuration:

```yaml
version: '3.8'

services:
  db:
    image: mysql:8.0
    container_name: veloce-db-prod
    restart: always
    volumes:
      - veloce_mysql_prod_data:/var/lib/mysql

  backend:
    build: ./backend-fastapi
    container_name: veloce-backend-prod
    command: gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build: ./frontend
    container_name: veloce-frontend-prod
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

---

## 11. Testing Strategy

### 11.1 Test Matrix
- **Unit & Integration Tests**: Verified via automated API test scripts (`scratch/api_check.py`) validating response status codes and JSON payload shapes.
- **TypeScript Type Safety**: Enforced via `npm run build` static type-checking pass (14/14 static pages compiled with zero errors).
- **Lighthouse / Web Vitals**: Verified image LCP optimization and dynamic `sizes` props.

---

## 12. Deployment

### 12.1 Target Deployment Architecture
- **Option A (Containerized Single-Host / AWS EC2)**: Launch via `docker-compose -f docker-compose.prod.yml up -d --build`.
- **Option B (Serverless Managed Platform)**:
  - **Frontend**: Deployed on Vercel Edge Network.
  - **Backend**: Deployed on Railway / Render / AWS App Runner.
  - **Database**: Managed MySQL (PlanetScale / Aiven / AWS RDS).

---

## 13. Operations & Maintenance

### 13.1 Health Monitoring & Telemetry
- Endpoint `GET /api/health` reports real-time database connectivity and application status.
- Telemetry header `X-Process-Time` is injected into every HTTP response for latency monitoring.

### 13.2 Database Backup Policy
- Automated daily `mysqldump` backups of `veloce_db` with 30-day point-in-time recovery retention.

---

## 14. Appendices

### 14.1 Environment Variable References

#### Backend (`.env.production.example`)
```ini
PORT=8000
NODE_ENV=production
DATABASE_URL=mysql+pymysql://user:pass@db-host:3306/veloce_db
FRONTEND_URL=https://veloce.yourdomain.com
CLERK_SECRET_KEY=sk_live_...
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=your_secret
```

#### Frontend (`.env.production.example`)
```ini
NEXT_PUBLIC_API_URL=https://api.veloce.yourdomain.com/api
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_...
```

---
*End of Specification Document.*
