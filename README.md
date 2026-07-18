# ⚡ VELOCE - Production-Ready E-Commerce Application

Veloce is a production-ready, full-stack E-Commerce platform built with a modern **Next.js 16 (App Router) + Tailwind CSS** frontend and an **Express + PostgreSQL (Prisma ORM)** backend. It incorporates secure session rotations, transaction row-level locking, segregated status models, Stripe Checkout gateway, verified buyer reviews, and docker configurations.

---

## ✨ Core Features & Enhancements

### 🛡️ Security & Authentication
* **Session Rotations**: Utilizes short-lived (15 min) Access Tokens in memory and secure, HttpOnly, SameSite `strict` cookies for revocable 7-day Refresh Tokens stored as SHA-256 hashes in PostgreSQL.
* **Brute-Force Protection**: Endpoint rate-limiters protect authentication attempts.
* **Password Reset Flow**: Email verification triggers and secure password reset tokens checking 1-hour expirations.
* **Session Revocation**: Logging out revokes active session records in the database.
* **CSRF & CORS Origins**: Strict CORS configurations locking access only to trusted domains (`process.env.FRONTEND_URL`).

### 🛍️ Customer Experience
* **Product Variants**: Dynamic size, color, and price options mapped to distinct SKUs and stock quantities.
* **Address Book**: Add, edit, delete, and set default locations for multiple shipping/billing addresses (`/api/users/addresses`).
* **Promo Code Engine**: Real-time validation checking min-order pricing, expirations, and usage limits (e.g., `WELCOME10` or `SAVE20`).
* **Verified Customer Reviews**: Customers can submit rating stars (1-5) and comments only if they have a `delivered` order containing that item.
* **Wishlist Registry**: Save items, check stock status, and transfer items directly to the shopping cart.
* **Stripe Secure Checkout**: Complete secure element redirect to Stripe Checkout, avoiding card processing or storage inside our backend servers.

### 👑 Administrator Control Panel
* **Filtered Analytics**: Sales metrics reports filterable by range types (Today, Last 7 Days, Last 30 Days, This Year, or Custom Ranges).
* **Low-Stock Monitors**: Live alerts highlighting variant stocks falling below set thresholds.
* **Best Sellers & Audit Logs**: Grouped lists tracking best selling revenue drivers and audit trails logging admin actions.
* **Coupon & Variant Dialogs**: Panels to manage promotional coupons and configure size/color overrides on catalog items.

---

## 🏗️ Architecture & Folder Structure

```text
ecommerce-project/
├── backend/                  # Node.js + Express REST API
│   ├── prisma/
│   │   ├── schema.prisma     # PostgreSQL relational database models
│   │   └── seed.js           # Database seeder (Users, Categories, Variants, Coupons)
│   ├── src/
│   │   ├── config/db.js      # Prisma client initialization
│   │   ├── middleware/auth.js# Auth validators & Admin guards
│   │   └── routes/           # REST Router endpoints (Auth, Cart, Orders, Reviews...)
│   ├── tests/                # Automated Jest + Supertest integration tests
│   ├── .env                  # Environment files
│   └── server.js             # Server startup script
│
└── frontend/                 # Next.js Web App Client
    ├── src/
    │   ├── app/              # Next.js App Router (Marketplace, Profile, Wishlist, Checkout)
    │   ├── components/       # Premium UI components (Header, Footer, ProductCard)
    │   ├── context/          # Client state providers (Auth, Cart)
    │   └── lib/api.ts        # Axios-like credentials interceptor client
```

---

## 🚦 Quick Start Guide

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.0.0 or higher)
* [PostgreSQL](https://www.postgresql.org/) database running on port `5432`

---

### Step 1: Database Migration & Seeding
Go to the backend directory, run migrations to sync the schema, and seed test data:
```bash
cd backend

# Initialize and apply database migrations dev flow
npx prisma migrate dev --name init

# Re-generate Prisma Client typing declarations
npx prisma generate

# Seed sample categories, products, variants, users, and coupons
node prisma/seed.js
```

#### Seed Login Credentials
* **Customer Account**: `john@example.com` / Password: `password123`
* **Admin Account**: `admin@veloce.com` / Password: `admin123`
* **Seeded Promo Coupons**: `WELCOME10` (10% off percentage), `SAVE20` ($20.00 flat discount)

---

### Step 2: Running Automated Tests
Run integration test suites covering health checks, auth rotations, and transaction row locks:
```bash
cd backend
npm run test
```

---

### Step 3: Start Services
Start backend REST server:
```bash
cd backend

```
* **API URL**: `http://localhost:5000`

Start frontend client:
```bash
cd frontend
npm run dev
```
* **Client URL**: `http://localhost:3000`

---

## 📡 REST API Specifications

### System & Authentication
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/health` | Public | Verify server health status and timestamp |
| **POST** | `/api/auth/register` | Public | Register customer, initialize Cart, set HttpOnly Refresh cookie |
| **POST** | `/api/auth/login` | Public | Authenticate user, set HttpOnly cookie, return short-lived access JWT |
| **POST** | `/api/auth/refresh` | Public | Verify HttpOnly cookie, issue rotated new access & refresh tokens |
| **POST** | `/api/auth/logout` | Public | Revoke session in DB, clear cookie headers |
| **POST** | `/api/auth/forgot-password`| Public | Request simulated reset token link |
| **POST** | `/api/auth/reset-password` | Public | Apply password change using verification token |
| **POST** | `/api/auth/verify-email` | Private | Verify customer email address status |

### User Profile & Address Book
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/users/profile` | Private | Fetch details of the authenticated profile |
| **PUT** | `/api/users/profile` | Private | Update user details (Name, Email) |
| **PUT** | `/api/users/password` | Private | Change user password, revoke old sessions |
| **GET** | `/api/users/addresses` | Private | Fetch saved shipping/billing addresses |
| **POST** | `/api/users/addresses` | Private | Create shipping/billing address, enforces default checks |
| **PUT** | `/api/users/addresses/:id` | Private | Modify address card parameters |
| **DELETE**| `/api/users/addresses/:id` | Private | Delete address card (re-allocates defaults if removed) |

### Products, Variants & Categories
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/products` | Public | Search/filter catalog products with options |
| **GET** | `/api/products/:id` | Public | Retrieve product details (slug or ID) and variants |
| **POST** | `/api/products` | Admin | Register new product with variants and images |
| **PUT** | `/api/products/:id` | Admin | Update basic product details |
| **DELETE**| `/api/products/:id` | Admin | Disable/Soft-delete product |
| **POST** | `/api/products/:id/variants`| Admin | Create product variant (unique SKU, size, color, stock) |
| **PUT** | `/api/products/:id/variants/:vId`| Admin | Adjust variant details, triggers inventory logs |
| **DELETE**| `/api/products/:id/variants/:vId`| Admin | Remove variant option |
| **POST** | `/api/products/:id/images`| Admin | Add image to gallery |
| **DELETE**| `/api/products/:id/images/:imgId`| Admin | Delete image |
| **GET** | `/api/categories` | Public | Get all categories |
| **POST** | `/api/categories` | Admin | Create category |

### Cart, Wishlist & Reviews
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/cart` | Private | Fetch current user cart items and subtotals |
| **POST** | `/api/cart/items` | Private | Add item to cart (supports and validates variantId, stock checks) |
| **PUT** | `/api/cart/items/:id` | Private | Adjust cart item quantity |
| **DELETE**| `/api/cart/items/:id` | Private | Delete cart item |
| **GET** | `/api/wishlist` | Private | List wishlist items and product status |
| **POST** | `/api/wishlist/:pId` | Private | Add product to wishlist |
| **DELETE**| `/api/wishlist/:pId` | Private | Remove product from wishlist |
| **GET** | `/api/reviews/:pId` | Public | Load reviews for a product |
| **POST** | `/api/reviews` | Private | Write review (Verifies user ordered and received product) |
| **PUT** | `/api/reviews/:id` | Private | Update review comment/stars |
| **DELETE**| `/api/reviews/:id` | Private | Remove review (Admin or owner only) |

### Coupons, Payments & Checkout
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/coupons/validate` | Private | Validate coupon against cart subtotal, limits, dates |
| **GET** | `/api/coupons/admin` | Admin | List all active coupons |
| **POST** | `/api/coupons/admin` | Admin | Create a coupon |
| **PUT** | `/api/coupons/admin/:id`| Admin | Edit coupon parameters |
| **DELETE**| `/api/coupons/admin/:id`| Admin | Delete coupon |
| **POST** | `/api/orders` | Private | Checkout (Deducts variant stock in Postgres transaction, snaps addresses) |
| **GET** | `/api/orders` | Private | Fetch user order logs |
| **GET** | `/api/orders/:id` | Private | View specific order specifications |
| **PUT** | `/api/orders/:id/cancel`| Private | Cancel pending order (restores variant stock, logs inventory change) |
| **POST** | `/api/payments/create` | Private | Initialize Stripe Checkout session |
| **POST** | `/api/payments/verify` | Private | Verify card payments authorization status |
| **POST** | `/api/payments/webhook`| Public | Stripe-Signature checked webhook receiver (ignores duplicates) |
| **POST** | `/api/payments/:id/refund`| Admin | Process Stripe Refund, restores variant items stock |

### Analytics & Reports
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/admin/orders` | Admin | List all orders across all accounts |
| **PUT** | `/api/admin/orders/:id/status`| Admin | Modify order status (triggers stock restoration on cancellation) |
| **GET** | `/api/admin/stats` | Admin | Dashboard reports (Revenue, best-sellers, low-stock variants, audit trails) |
