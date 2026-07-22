# 5. Database Design & ERD

## 5.1 Entity Relationship Diagram (ERD) Overview
The platform uses a relational MySQL database schema designed around third normal form (3NF).

```
[User] 1---N [Order] 1---N [OrderItem] N---1 [ProductVariant] N---1 [Product]
  |            |                                                         |
  1---N        1---N [Payment]                                          1---N [ProductImage]
[Address]                                                               |
  |                                                                     1---N [WishlistItem]
  +---------------------------------------------------------------------+
```

## 5.2 Core Table Schemas

### 1. `products`
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

### 2. `product_variants`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT` | `PRIMARY KEY, AUTO_INCREMENT` | Unique variant identifier |
| `product_id` | `INT` | `FOREIGN KEY (products.id)` | Parent product reference |
| `sku` | `VARCHAR(100)` | `NOT NULL, UNIQUE` | Stock Keeping Unit |
| `price` | `DECIMAL(10,2)` | `NULLABLE` | Overridden price if applicable |
| `stock` | `INT` | `NOT NULL, DEFAULT 0` | Available physical quantity |
| `size` | `VARCHAR(50)` | `NULLABLE` | Size option (e.g. S, M, L, XL) |
| `color` | `VARCHAR(50)` | `NULLABLE` | Color swatch (e.g. Black, Navy) |

### 3. `orders`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `INT` | `PRIMARY KEY, AUTO_INCREMENT` | Internal order ID |
| `order_number` | `VARCHAR(100)` | `NOT NULL, UNIQUE` | Customer-facing order ref |
| `user_id` | `INT` | `FOREIGN KEY (users.id)` | Ordering customer |
| `order_status` | `VARCHAR(50)` | `DEFAULT 'pending'` | State (`pending`, `processing`, `shipped`, `delivered`, `cancelled`) |
| `payment_status` | `VARCHAR(50)` | `DEFAULT 'unpaid'` | State (`unpaid`, `paid`, `failed`) |
| `total` | `DECIMAL(10,2)` | `NOT NULL` | Total charged in INR (₹) |
| `shipping_address_snapshot` | `JSON` | `NOT NULL` | Frozen shipping address details |
