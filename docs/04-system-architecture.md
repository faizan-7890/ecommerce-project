# 4. System Architecture

## 4.1 High-Level Architecture Diagram
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

## 4.2 Architectural Patterns
- **Separation of Concerns**: Decoupled presentation layer (Next.js) and API services (FastAPI).
- **Repository / ORM Pattern**: Database access managed exclusively through SQLAlchemy ORM sessions.
- **Optimistic UI & Client Contexts**: Local state management via React Contexts (`CartContext`, `WishlistContext`, `ToastContext`).
