# 🛒 Veloce — Premium E-Commerce Platform

<div align="center">

**A full-stack, production-grade e-commerce application built with modern web technologies.**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
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
- [License](#-license)

---

## 🌟 Overview

**Veloce** is a premium, full-stack e-commerce platform designed for real-world production use. It features a stunning glassmorphic dark-mode storefront, a comprehensive admin analytics dashboard, concurrency-safe checkout with row-level database locking, Razorpay payment integration (INR ₹), and externalized authentication via Clerk.

This project was built as part of the **BITS Pilani** coursework, demonstrating enterprise-grade patterns including idempotent APIs, inventory auditing, multi-status order lifecycle management, and Docker-based deployment. The backend was recently modernized and fully rewritten in Python using **FastAPI** and **MySQL**.

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
- **Auto User Provisioning** — First-time Clerk users are automatically synced to the local MySQL database with a shopping cart created on the fly
- **Manual JWT Verification** — Uses python-jose to fetch JWKS public keys and manually verify tokens for zero-trust security

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
| **Python** | 3.12 | Core programming language |
| **FastAPI** | 0.115 | Asynchronous REST API framework |
| **SQLAlchemy** | 2.0 | ORM for database modeling and queries |
| **Pydantic** | 2.11 | Data validation and schema generation |
| **MySQL** | 8.0 | Relational database with ACID transactions |
| **Uvicorn** | 0.34 | High-performance ASGI web server |
| **python-jose** | 3.4 | JWT verification and JWKS parsing |
| **Razorpay** | 1.4 | Payment gateway integration |

### DevOps & Tools
| Technology | Purpose |
|---|---|
| **Docker & Docker Compose** | Containerized MySQL and FastAPI backend |
| **Swagger UI** | Auto-generated interactive API documentation |

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
│       Backend (FastAPI)         │
│    Port 8000 • REST API         │
│   Manual JWT Verification       │
│   SQLAlchemy ORM • Pydantic     │
└──────────────┬──────────────────┘
               │  PyMySQL
               ▼
┌─────────────────────────────────┐
│        MySQL 8.0 (Docker)       │
│    Port 3306 • ACID Txns        │
│   Row-level locks (FOR UPDATE)  │
└─────────────────────────────────┘
```

**Key Architectural Decisions:**
- **Externalized Auth**: Clerk handles all user registration, login, MFA, and session management. The FastAPI backend validates Clerk JWTs manually (fetching public keys dynamically) and syncs users to the local database.
- **Financial Precision**: All monetary values use `Numeric(10,2)` in MySQL to avoid floating-point rounding errors.
- **Concurrency Control**: Complex transactions like checkout utilize SQLAlchemy raw queries for `SELECT ... FOR UPDATE` to lock inventory rows temporarily.
- **Address Snapshots**: Orders store JSON snapshots of shipping/billing addresses at checkout time, so address edits don't retroactively change order records.

---

## 📁 Project Structure

```
ecommerce-project/
├── frontend/                          # Next.js 16 Application
│   ├── src/
│   │   ├── app/                       # App Router pages
│   │   ├── components/                # Reusable UI components
│   │   └── lib/                       # Utilities and API client
│   └── package.json
│
├── backend-fastapi/                   # FastAPI Backend
│   ├── main.py                        # App entry point, CORS, startup events
│   ├── database.py                    # SQLAlchemy engine & session maker
│   ├── models.py                      # SQLAlchemy declarative database models
│   ├── schemas.py                     # Pydantic schemas (Request/Response)
│   ├── dependencies.py                # JWT Auth, User sync, DB injection
│   ├── make_admin.py                  # CLI script to promote users to ADMIN
│   ├── routers/                       # API Route modules
│   │   ├── products.py                # Product CRUD, variants, images
│   │   ├── orders.py                  # Checkout logic, idempotency, cancellation
│   │   ├── payments.py                # Razorpay order creation, webhooks, refunds
│   │   └── (cart, users, admin, etc.)
│   ├── services/                      # Extracted business logic
│   │   ├── inventory.py               # Stock tracking and logging
│   │   └── pricing.py                 # Tax, shipping, discount calculations
│   ├── Dockerfile                     # Multi-stage production build
│   └── requirements.txt               # Python dependencies
│
├── docker-compose.yml                 # MySQL + FastAPI orchestration
└── README.md                          # ← You are here
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20 (for frontend)
- **Python** ≥ 3.12 (if running backend without docker)
- **Docker & Docker Compose** (required for MySQL database)
- **Clerk Account** — [Sign up at clerk.com](https://clerk.com/)
- **Razorpay Account** (optional, for payments) — [Sign up at razorpay.com](https://razorpay.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/faizan-7890/ecommerce-project.git
cd ecommerce-project
```

### 2. Start Backend & Database via Docker

```bash
# Start MySQL and the FastAPI backend in detached mode
docker-compose up -d --build
```

This spins up:
- **MySQL 8.0** container on port `3306`
- **FastAPI** container on port `8000`

*Note: On the first startup, FastAPI will automatically connect to MySQL and create all the necessary database tables.*

### 3. Setup Frontend

```bash
cd frontend
npm install

# Create .env.local with your Clerk publishable key
echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_..." > .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" >> .env.local

# Start the development server
npm run dev
```

The storefront will be running at **http://localhost:3000**.

### 4. Admin Access
Authentication is handled by Clerk, so there are no default admin credentials.
1. Sign in to the frontend using your real email/Google via Clerk.
2. Promote yourself to Admin by running a script in the backend folder:
```bash
cd backend-fastapi
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python make_admin.py <your-email@example.com>
```

---

## 🔑 Environment Variables

### Backend (`backend-fastapi/.env`)

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `8000` |
| `NODE_ENV` | Environment mode | `development` |
| `DATABASE_URL` | MySQL connection string | `mysql+pymysql://root:root@db:3306/ecommerce` |
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
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8000/api` |

---

## 📡 API Documentation

FastAPI automatically generates interactive OpenAPI documentation based on Pydantic schemas. 

Once the backend is running, visit:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### Base URL: `http://localhost:8000/api`

The API includes 11 main routers:
- `/products` — Product catalog, variants, images
- `/cart` — User shopping cart
- `/orders` — Checkout, order history, cancellation
- `/payments` — Razorpay generation, validation, webhooks
- `/users` — Profile, addresses
- `/wishlist` — Product wishlists
- `/reviews` — Product ratings
- `/coupons` — Validation and admin management
- `/admin` — Revenue dashboard, overarching CRUD operations

---

## 🗄️ Database Schema

The database consists of 20 tables mapped via SQLAlchemy models:

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
- `Numeric(10,2)` for all financial fields — no floating-point money bugs
- Unique Constraints — prevents duplicate cart entries and wishlist duplication
- `ondelete="CASCADE"` — Enforces referential integrity at the database level
- JSON columns — Stores immutable snapshots of shipping/billing addresses on Orders

---

## 🔐 Authentication

Authentication is fully externalized to **[Clerk](https://clerk.com/)**:

1. **Frontend**: The `<ClerkProvider>` wraps the app. `<SignIn>`, `<SignUp>`, and `<UserButton>` components handle all auth UI.
2. **Backend**: The `get_current_user` FastAPI dependency validates the JWT on protected endpoints using `python-jose` by fetching Clerk's JWKS public keys.
3. **User Sync**: During authentication, the dependency automatically:
   - Looks up the Clerk user in MySQL by `clerk_id`
   - If not found, fetches the user's email from Clerk and either links an existing account or creates a new one
   - Assigns the `CUSTOMER` role and provisions an empty shopping cart
4. **Role Management**: Admin roles are managed natively in the MySQL database (`Role` table).

---

## 💳 Payment Integration

Veloce integrates with **[Razorpay](https://razorpay.com/)** for INR (₹) payments:

1. **Create Order** → Frontend calls `/payments/create-order` → Backend creates a Razorpay order
2. **Checkout Modal** → Razorpay's client-side SDK opens the payment modal
3. **Verify Signature** → After payment, `/payments/verify` validates the Razorpay signature using Python's `hmac-sha256`
4. **Webhook Fallback** → Razorpay sends webhook events to `/payments/webhook` for server-to-server confirmation
5. **Idempotency** → The `ProcessedWebhookEvent` model prevents duplicate webhook processing

**Mock Mode**: In development, if Razorpay keys are placeholder values, the FastAPI server automatically falls back to mock payment responses and validates mock signatures for local testing.

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
- **MySQL 8.0** on port `3306` with a health check
- **FastAPI Backend** on port `8000` (waits for DB to be healthy)

### Production Checklist

- [ ] Use real Clerk production keys (`sk_live_...` / `pk_live_...`)
- [ ] Use real Razorpay production keys (`rzp_live_...`)
- [ ] Configure `FRONTEND_URL` to your production domain for CORS
- [ ] Disable Uvicorn reload mode in production
- [ ] Configure Razorpay webhook URL to your production endpoint

---

## 👨‍💻 Author

**Faizan J** — BITS Pilani

- GitHub: [@faizan-7890](https://github.com/faizan-7890)

---

## 📄 License

This project is licensed under the **ISC License**.

---

<div align="center">

**Built with ❤️ using Next.js, FastAPI, MySQL, Clerk, and Razorpay**

</div>
