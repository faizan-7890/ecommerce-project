# 🛒 Veloce — Premium E-Commerce Platform

<div align="center">

**A full-stack, production-grade e-commerce application built with modern web technologies.**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-5.2-000000?logo=express)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.8-2D3748?logo=prisma)](https://www.prisma.io/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?logo=clerk)](https://clerk.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://docker.com/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payments-072654?logo=razorpay)](https://razorpay.com/)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Authentication](#-authentication)
- [Payment Integration](#-payment-integration)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [License](#-license)

---

## 🌟 Overview

**Veloce** is a premium, full-stack e-commerce platform designed for real-world production use. It features a stunning glassmorphic dark-mode storefront, a comprehensive admin analytics dashboard, concurrency-safe checkout with row-level database locking, Razorpay payment integration (INR ₹), and externalized authentication via Clerk.

This project was built as part of the **BITS Pilani** coursework, demonstrating enterprise-grade patterns including idempotent APIs, inventory auditing, multi-status order lifecycle management, and Docker-based deployment.

---

## ✨ Key Features

### 🛍️ Customer Experience
- **Product Catalog** — Browse, search, filter by category/price, and sort products with pagination
- **Product Variants** — Size, color, and material options per product with independent stock tracking
- **Shopping Cart** — Persistent server-side cart with animated mini-cart slide-out panel
- **Wishlist** — Save products for later with one-click add-to-cart
- **Order Management** — Full order history with real-time status tracking (pending → processing → shipped → delivered)
- **Reviews & Ratings** — 1–5 star reviews tied to purchased order items
- **Coupon System** — Percentage or fixed-amount discount codes with usage limits and expiration dates
- **User Profile** — Manage multiple shipping/billing addresses

### 🔐 Security & Auth
- **Clerk Authentication** — Externalized sign-up, sign-in, and session management
- **Role-Based Access Control** — `CUSTOMER` and `ADMIN` roles stored in the database
- **Auto User Provisioning** — First-time Clerk users are automatically synced to the local PostgreSQL database with a shopping cart created on the fly

### 📊 Admin Dashboard
- **Revenue Analytics** — Interactive charts powered by Recharts showing revenue trends over time
- **Product Management** — Full CRUD for products, variants, images, and categories
- **Order Management** — View all orders, update statuses, process refunds
- **Coupon Management** — Create, disable, and track coupon usage
- **Inventory Logs** — Complete audit trail of every stock change (checkout, cancellation, manual adjustment)

### 💳 Payments
- **Razorpay Integration** — Supports live and test modes for card payments (INR ₹)
- **Cash on Delivery (COD)** — Alternative payment method
- **Webhook Processing** — Idempotent webhook handler with duplicate event protection
- **Refund System** — Full and partial refund support with automatic stock restoration

### ⚡ Concurrency & Reliability
- **Row-Level Locking** — `SELECT ... FOR UPDATE` on variants and coupons during checkout to prevent overselling
- **Idempotent Checkout** — `X-Idempotency-Key` header prevents duplicate orders from double-clicks or network retries
- **Stock Restoration Guards** — `stockRestored` flag ensures inventory is restored at most once per order (cancel/refund)
- **Order Expiry** — Unpaid card orders expire after a configurable window, releasing reserved inventory

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.2 | React framework with App Router, SSR, and static generation |
| **React** | 19.2 | UI component library |
| **TypeScript** | 5.x | Type-safe development |
| **Tailwind CSS** | 4.x | Utility-first styling with dark mode |
| **Framer Motion** | 12.x | Page transitions, animations, and micro-interactions |
| **Recharts** | 3.x | Admin analytics charts |
| **Clerk Next.js SDK** | 7.x | Authentication components (`<SignIn>`, `<UserButton>`) |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 20+ | JavaScript runtime |
| **Express** | 5.2 | REST API framework |
| **Prisma ORM** | 7.8 | Type-safe database client with migrations |
| **PostgreSQL** | 15 | Relational database with ACID transactions |
| **Clerk SDK** | 4.x | JWT verification and user management |
| **Razorpay** | 2.x | Payment gateway integration |
| **bcryptjs** | 3.x | Password hashing |
| **jsonwebtoken** | 9.x | JWT utilities |

### DevOps & Testing
| Technology | Purpose |
|---|---|
| **Docker & Docker Compose** | Containerized PostgreSQL and backend services |
| **Jest + Supertest** | Backend integration and concurrency testing |
| **Nodemon** | Hot-reload during development |

---

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│         Frontend (Next.js)      │
│    Port 3000 • App Router       │
│   Clerk Auth • Tailwind CSS     │
└──────────────┬──────────────────┘
               │  REST API calls
               │  (Authorization: Bearer <Clerk JWT>)
               ▼
┌─────────────────────────────────┐
│        Backend (Express 5)      │
│    Port 5000 • REST API         │
│   Clerk JWT Verification        │
│   Prisma ORM • Business Logic   │
└──────────────┬──────────────────┘
               │  Prisma Client
               ▼
┌─────────────────────────────────┐
│      PostgreSQL 15 (Docker)     │
│    Port 5432 • ACID Txns        │
│   Row-level locks (FOR UPDATE)  │
└─────────────────────────────────┘
```

**Key Architectural Decisions:**
- **Externalized Auth**: Clerk handles all user registration, login, MFA, and session management. The backend validates Clerk JWTs and syncs users to the local database.
- **Financial Precision**: All monetary values use `Decimal(10,2)` in PostgreSQL to avoid floating-point rounding errors.
- **Soft Deletion**: Products are disabled (status → `disabled`) rather than deleted, preserving historical order data.
- **Address Snapshots**: Orders store JSON snapshots of shipping/billing addresses at checkout time, so address edits don't retroactively change order records.

---

## 📁 Project Structure

```
ecommerce-project/
├── frontend/                          # Next.js 16 Application
│   ├── src/
│   │   ├── app/                       # App Router pages
│   │   │   ├── page.tsx               # Home page (hero, categories, featured products)
│   │   │   ├── products/              # Product listing & detail pages
│   │   │   ├── cart/                   # Shopping cart page
│   │   │   ├── checkout/              # Checkout flow
│   │   │   ├── orders/                # Order history
│   │   │   ├── wishlist/              # Wishlist page
│   │   │   ├── profile/               # User profile & addresses
│   │   │   ├── admin/                 # Admin dashboard (analytics, CRUD)
│   │   │   ├── privacy-policy/        # Legal pages
│   │   │   └── terms/                 # Terms of service
│   │   ├── components/                # Reusable UI components
│   │   │   ├── Header.tsx             # Navigation with Clerk UserButton
│   │   │   ├── Footer.tsx             # Site footer
│   │   │   ├── ProductCard.tsx        # Product grid card with cart actions
│   │   │   ├── MiniCart.tsx           # Slide-out mini cart panel
│   │   │   ├── AdminChart.tsx         # Recharts revenue analytics
│   │   │   └── skeletons/             # Loading skeleton components
│   │   └── lib/
│   │       ├── api.ts                 # Axios-like API client with Clerk auth
│   │       └── currency.ts            # INR currency formatting utility
│   └── package.json
│
├── backend/                           # Express 5 REST API
│   ├── server.js                      # App entry point, middleware, route mounting
│   ├── prisma/
│   │   └── schema.prisma              # Database schema (20 models, 312 lines)
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                  # Prisma client initialization
│   │   │   ├── jwt.js                 # JWT secret validation
│   │   │   └── payments.js            # Razorpay configuration & environment detection
│   │   ├── middleware/
│   │   │   └── auth.js                # Clerk JWT verification + user sync
│   │   ├── routes/
│   │   │   ├── products.js            # Product CRUD, variants, images
│   │   │   ├── orders.js              # Concurrency-safe checkout, cancellation
│   │   │   ├── payments.js            # Razorpay order creation, verification, webhooks, refunds
│   │   │   ├── cart.js                # Cart add/update/remove/clear
│   │   │   ├── users.js               # User profile, addresses
│   │   │   ├── admin.js               # Admin analytics, order management
│   │   │   ├── categories.js          # Category CRUD
│   │   │   ├── coupons.js             # Coupon CRUD, validation
│   │   │   ├── wishlist.js            # Wishlist toggle
│   │   │   ├── reviews.js             # Product reviews
│   │   │   └── auth.js                # Clerk-based auth routes
│   │   ├── services/
│   │   │   ├── inventory.js           # Stock decrement/restore with audit logging
│   │   │   ├── orderState.js          # Order state machine & stock restore guards
│   │   │   └── pricing.js             # Tax, shipping, and discount calculations
│   │   └── utils/
│   │       └── crypto.js              # Timing-safe signature comparison
│   ├── tests/                         # Jest integration tests
│   ├── Dockerfile                     # Multi-stage production build
│   └── package.json
│
├── docker-compose.yml                 # PostgreSQL + Backend orchestration
├── HOW_TO_RUN.md                      # Quick start guide
└── README.md                          # ← You are here
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20
- **Docker Desktop** (for PostgreSQL)
- **Clerk Account** — [Sign up at clerk.com](https://clerk.com/)
- **Razorpay Account** (optional, for payments) — [Sign up at razorpay.com](https://razorpay.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/faizan-7890/ecommerce-project.git
cd ecommerce-project
```

### 2. Start PostgreSQL via Docker

```bash
docker-compose up -d db
```

This spins up a PostgreSQL 15 container on port `5432` with:
- **User**: `postgres`
- **Password**: `postgres`
- **Database**: `ecommerce`

### 3. Setup Backend

```bash
cd backend
npm install

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your Clerk and Razorpay keys

# Run Prisma migrations to create database tables
npx prisma migrate dev --name init

# Seed the database (optional)
npx prisma db seed

# Start the development server
npm run dev
```

The backend API will be running at **http://localhost:5000**.

### 4. Setup Frontend

```bash
cd frontend
npm install

# Create .env.local with your Clerk publishable key
echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_..." > .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" >> .env.local

# Start the development server
npm run dev
```

The storefront will be running at **http://localhost:3000**.

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public` |
| `JWT_SECRET` | Secret key for token operations | `your_high_entropy_secret` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:3000` |
| `CLERK_SECRET_KEY` | Clerk backend secret key | `sk_test_...` |
| `TAX_RATE` | Tax rate (decimal) | `0.08` |
| `FREE_SHIPPING_THRESHOLD` | Free shipping above this amount | `100` |
| `FLAT_SHIPPING_FEE` | Shipping fee when below threshold | `10` |
| `RAZORPAY_KEY_ID` | Razorpay API key | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay API secret | `your_secret` |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature verification | `your_webhook_secret` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk frontend key | `pk_test_...` |
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:5000/api` |

---

## 📡 API Documentation

### Base URL: `http://localhost:5000/api`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| **Products** ||||
| `GET` | `/products` | Public | List products (search, filter, paginate) |
| `GET` | `/products/:id` | Public | Product detail (by ID or slug) |
| `POST` | `/products` | Admin | Create product |
| `PUT` | `/products/:id` | Admin | Update product |
| `DELETE` | `/products/:id` | Admin | Soft-delete (disable) product |
| `POST` | `/products/:id/variants` | Admin | Add variant |
| `PUT` | `/products/:id/variants/:vid` | Admin | Update variant |
| `DELETE` | `/products/:id/variants/:vid` | Admin | Delete variant |
| `POST` | `/products/:id/images` | Admin | Add product image |
| `DELETE` | `/products/:id/images/:imgId` | Admin | Delete product image |
| **Cart** ||||
| `GET` | `/cart` | User | Get user's cart |
| `POST` | `/cart` | User | Add item to cart |
| `PUT` | `/cart/:itemId` | User | Update cart item quantity |
| `DELETE` | `/cart/:itemId` | User | Remove item from cart |
| `DELETE` | `/cart` | User | Clear entire cart |
| **Orders** ||||
| `POST` | `/orders` | User | Create order (concurrency-safe checkout) |
| `GET` | `/orders` | User | Get user's order history |
| `GET` | `/orders/:id` | User | Get order details |
| `PUT` | `/orders/:id/cancel` | User | Cancel pending unpaid order |
| **Payments** ||||
| `POST` | `/payments/create-order` | User | Create Razorpay payment order |
| `POST` | `/payments/verify` | User | Verify payment signature |
| `POST` | `/payments/webhook` | Public | Razorpay webhook handler |
| **Users** ||||
| `GET` | `/users/profile` | User | Get user profile |
| `PUT` | `/users/profile` | User | Update profile |
| `GET` | `/users/addresses` | User | List addresses |
| `POST` | `/users/addresses` | User | Create address |
| **Wishlist** ||||
| `GET` | `/wishlist` | User | Get wishlist |
| `POST` | `/wishlist` | User | Toggle wishlist item |
| **Reviews** ||||
| `GET` | `/reviews/product/:id` | Public | Get product reviews |
| `POST` | `/reviews` | User | Create review |
| **Coupons** ||||
| `POST` | `/coupons/validate` | User | Validate coupon code |
| `GET` | `/coupons` | Admin | List all coupons |
| `POST` | `/coupons` | Admin | Create coupon |
| **Admin** ||||
| `GET` | `/admin/dashboard` | Admin | Analytics dashboard data |
| `GET` | `/admin/orders` | Admin | All orders |
| `PUT` | `/admin/orders/:id/status` | Admin | Update order status |
| **Health** ||||
| `GET` | `/health` | Public | System health check (includes DB) |

---

## 🗄️ Database Schema

The Prisma schema defines **20 models** across 312 lines:

```
User ─┬─ Cart ── CartItem ─┬─ Product ── ProductVariant
      │                     │             ProductImage
      ├─ Order ── OrderItem ┘
      │    ├── Payment ── Refund
      │    └── InventoryLog
      ├─ Review
      ├─ WishlistItem
      ├─ Address
      └─ AuditLog

Category ── Product
Coupon ── CouponUsage
Role ── User
ProcessedWebhookEvent (idempotency)
```

**Key Design Decisions:**
- `Decimal(10,2)` for all financial fields — no floating-point money bugs
- `@@unique([cartId, productId, variantId])` — prevents duplicate cart entries
- `@@unique([userId, productId])` — one wishlist entry per product per user
- `onDelete: Cascade` on child records, `onDelete: SetNull` on optional references
- JSON `shippingAddressSnapshot` / `billingAddressSnapshot` — immutable order history

---

## 🔐 Authentication

Authentication is fully externalized to **[Clerk](https://clerk.com/)**:

1. **Frontend**: The `<ClerkProvider>` wraps the app. `<SignIn>`, `<SignUp>`, and `<UserButton>` components handle all auth UI.
2. **Backend**: The `ClerkExpressRequireAuth()` middleware validates the JWT on every protected request.
3. **User Sync**: On first API call, the middleware automatically:
   - Looks up the Clerk user in the local database by `clerkId`
   - If not found, fetches the user's email from Clerk and either links an existing account or creates a new one
   - Assigns the `CUSTOMER` role and provisions an empty shopping cart
4. **Role Management**: Admin roles are managed in the PostgreSQL database (`Role` table), not in Clerk metadata.

---

## 💳 Payment Integration

Veloce integrates with **[Razorpay](https://razorpay.com/)** for INR (₹) payments:

1. **Create Order** → Frontend calls `/payments/create-order` → Backend creates a Razorpay order
2. **Checkout Modal** → Razorpay's client-side SDK opens the payment modal
3. **Verify Signature** → After payment, `/payments/verify` validates the Razorpay signature using HMAC-SHA256
4. **Webhook Fallback** → Razorpay sends webhook events to `/payments/webhook` for server-to-server confirmation
5. **Idempotency** → The `ProcessedWebhookEvent` model prevents duplicate webhook processing

**Mock Mode**: In development, if Razorpay keys are placeholder values, the system automatically falls back to mock payment responses for testing.

---

## 🐳 Deployment

### Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f backend
```

This starts:
- **PostgreSQL 15** on port `5432` with a health check
- **Backend API** on port `5000` (waits for DB to be healthy)

### Production Checklist

- [ ] Set `NODE_ENV=production` in backend environment
- [ ] Use real Clerk production keys (`sk_live_...` / `pk_live_...`)
- [ ] Use real Razorpay production keys (`rzp_live_...`)
- [ ] Set a high-entropy `JWT_SECRET`
- [ ] Configure `FRONTEND_URL` to your production domain
- [ ] Enable SSL/TLS termination via reverse proxy (Nginx/Caddy)
- [ ] Set up Prisma connection pooling (PgBouncer or Prisma Accelerate) for serverless deployments
- [ ] Configure Razorpay webhook URL to your production endpoint

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
npm test
```

Tests use **Jest** and **Supertest** for:
- **Concurrency Tests** — Simulates parallel checkout requests to verify row-level locking prevents overselling
- **Integration Tests** — End-to-end API testing with a test database

### Frontend Build Verification

```bash
cd frontend
npm run build
```

The Next.js build runs a full TypeScript type-check on all pages and components, catching errors before deployment.

---

## 👨‍💻 Author

**Faizan J** — BITS Pilani

- GitHub: [@faizan-7890](https://github.com/faizan-7890)

---

## 📄 License

This project is licensed under the **ISC License**.

---

<div align="center">

**Built with ❤️ using Next.js, Express, PostgreSQL, Clerk, and Razorpay**

</div>
