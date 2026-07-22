# 6. API Specification

All REST API endpoints are prefixed with `/api` and utilize standard HTTP status codes (`200`, `201`, `400`, `401`, `403`, `404`, `500`). Automatic OpenAPI / Swagger UI is available at `/docs` when backend server is running.

## 6.1 Core API Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | System and database health status |
| `GET` | `/api/products` | Public | List products with search, pagination, and filters |
| `GET` | `/api/products/{id}` | Public | Retrieve product details by ID |
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
