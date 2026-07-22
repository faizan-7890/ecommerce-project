# 8. Backend Design

## 8.1 Technology Choice & Rationale
- **FastAPI**: Asynchronous Python web framework delivering high performance with automatic Swagger documentation.
- **Pydantic v2**: High-speed C-extension schema validation with camelCase alias generation (`to_camel`).
- **SQLAlchemy 2.0**: Enterprise-grade Object-Relational Mapping providing clean eager loading (`joinedload`) to prevent N+1 query performance degradation.

## 8.2 Authentication & Verification Flow
1. Client signs in via Clerk Auth modal on frontend.
2. Next.js retrieves the JWT session token and attaches it to API requests via HTTP Header: `Authorization: Bearer <clerk_jwt>`.
3. FastAPI backend verifies the token using Clerk's JSON Web Key Set (JWKS) cached in-memory with a 1-hour TTL.
