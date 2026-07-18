# ⚡ VELOCE - Full-Stack Premium E-Commerce Application

Veloce is a full-stack, state-of-the-art E-Commerce application utilizing a **Next.js 16 (App Router) + Tailwind CSS** frontend and an **Express + PostgreSQL (Prisma ORM)** backend.

---

## ✨ Features Implemented

### 🛍️ Client Experience
* **Dynamic Product Catalog**: Features filtering by categories, search keywords, price ranges, and sorting by relevance or pricing.
* **Shopping Cart System**: Live quantity updates, deletion, subtotal calculations, and stock checks.
* **Transaction Checkout**: Mock payments (COD / Credit Card) that reduce product inventory and log order records.
* **Order History Tracker**: Dynamic order listing, status tracking (pending, processing, delivered, cancelled), and order cancellations.
* **User Authentication**: Secure JWT sessions with password hashing.

### 👑 Administrator Dashboard
* **Sales Analytics**: Sales metrics cards for total revenue, total orders, product catalog depth, and customer counts.
* **Catalog Manager**: Full CRUD forms to add, edit, or remove products and associate them with specific categories.
* **Category Registry**: Registration panels to add new departments and product scopes.
* **Transaction Overrides**: Select fields to change order status across the entire database (e.g. from `pending` to `shipped` or `cancelled`).

---

## 🏗️ Architecture & Folder Structure

```text
ecommerce-project/
├── backend/                  # Node.js + Express REST API
│   ├── prisma/
│   │   ├── schema.prisma     # PostgreSQL schemas (Prisma 7 structure)
│   │   └── seed.js           # Database seeder (Roles & sample values)
│   ├── src/
│   │   ├── config/db.js      # Prisma Client pool configurations
│   │   ├── middleware/auth.js# JWT & Admin route guards
│   │   └── routes/           # REST Endpoint routers
│   ├── .env                  # Environment configurations
│   └── server.js             # Express start script
│
└── frontend/                 # Next.js Frontend Web Application
    ├── src/
    │   ├── app/              # Routing pages and layouts (App Router)
    │   ├── components/       # Shared UI blocks (Header, Footer, ProductCard)
    │   ├── context/          # State managers (AuthProvider, CartProvider)
    │   └── lib/api.ts        # Axios-like token injection API client
```

---

## 🚦 Quick Start Guide

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.0.0 or higher)
* [PostgreSQL](https://www.postgresql.org/) database server running locally on port `5432`

---

### Step 1: Database Synchronization & Seeding

Go to the backend directory, push the schemas to PostgreSQL, and seed the default roles:
```bash
cd backend

# Sync Prisma Schema with your local database
npx prisma db push

# Run the seeding script to populate CUSTOMER and ADMIN roles
node prisma/seed.js
```

---

### Step 2: Start the Backend Server

Start the Node development server:
```bash
cd backend
npm run dev
```
* **API base URL**: `http://localhost:5000`

---

### Step 3: Start the Frontend Client

In a separate terminal tab, run the Next.js development server:
```bash
cd frontend
npm run dev
```
* **Web app URL**: `http://localhost:3000`

---

## 📡 REST API Specifications

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | Public | Register a new customer and initialize a Cart |
| **POST** | `/api/auth/login` | Public | Authenticate user and return JWT session |
| **GET** | `/api/users/profile` | Protected | Fetch the logged-in user profile details |
| **PUT** | `/api/users/profile` | Protected | Update profile details (Name, Email, Password) |
| **GET** | `/api/products` | Public | List products (Supports search, filter, sorting) |
| **GET** | `/api/products/:id` | Public | Retrieve individual product specifications |
| **POST** | `/api/products` | Admin | Register a new product with images |
| **PUT** | `/api/products/:id` | Admin | Modify product attributes or stock |
| **DELETE**| `/api/products/:id` | Admin | Delete a product from the database |
| **GET** | `/api/categories` | Public | Retrieve all categories with product counts |
| **POST** | `/api/categories` | Admin | Create a new product category |
| **GET** | `/api/cart` | Protected | Fetch current user's shopping cart details |
| **POST** | `/api/cart/items` | Protected | Add a product item to the shopping cart |
| **PUT** | `/api/cart/items/:id` | Protected | Adjust the quantity of an item in the cart |
| **DELETE**| `/api/cart/items/:id` | Protected | Remove an item from the cart |
| **POST** | `/api/orders` | Protected | Complete checkout, record order, and deduct stock |
| **GET** | `/api/orders` | Protected | Fetch order history logs for the user |
| **PUT** | `/api/orders/:id/cancel`| Protected | Cancel order (restores stock if pending) |
| **GET** | `/api/admin/stats` | Admin | Fetch system analytics (Revenue, orders, counts) |
| **GET** | `/api/admin/orders` | Admin | List all orders across all user accounts |
| **PUT** | `/api/admin/orders/:id/status`| Admin | Manually update order status (restores stock if cancelled) |
