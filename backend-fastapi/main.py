"""
Veloce E-Commerce Backend — FastAPI + MySQL
Main application entry point.
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import time

load_dotenv()

from database import engine, Base, get_db
from routers import products, categories, cart, orders, users, wishlist, reviews, coupons, payments, admin

# Create all tables on startup
# Table creation is deferred to startup event below

app = FastAPI(
    title="Veloce E-Commerce API",
    description="Production-grade e-commerce REST API built with FastAPI and MySQL",
    version="2.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": str(exc) if os.getenv("NODE_ENV") != "production" else "Internal Server Error"},
    )


@app.on_event("startup")
def on_startup():
    """Create database tables and auto-seed default products."""
    try:
        Base.metadata.create_all(bind=engine)
        print("[OK] Database tables created/verified successfully")
        try:
            from seed import seed_data
            seed_data()
        except Exception as se:
            print(f"[WARN] Auto-seeding skipped: {se}")
    except Exception as e:
        print(f"[WARN] Could not initialize database: {e}")


# ─── Health Check ────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"message": "Veloce E-Commerce REST API is running... (FastAPI + MySQL)"}


@app.get("/api/health")
def health_check():
    from sqlalchemy import text
    from database import SessionLocal

    payload = {
        "status": "healthy",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "framework": "FastAPI",
        "database": "up",
    }

    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return payload
    except Exception as e:
        payload["status"] = "unhealthy"
        payload["database"] = "down"
        payload["message"] = "MySQL is unavailable"
        return JSONResponse(status_code=503, content=payload)


# ─── Mount Routers ───────────────────────────────────────────────────────────
app.include_router(products.router)
app.include_router(categories.router)
app.include_router(cart.router)
app.include_router(orders.router)
app.include_router(users.router)
app.include_router(wishlist.router)
app.include_router(reviews.router)
app.include_router(coupons.router)
app.include_router(payments.router)
app.include_router(admin.router)


# ─── 404 Handler ─────────────────────────────────────────────────────────────
@app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def catch_all(request: Request, path_name: str):
    return JSONResponse(
        status_code=404,
        content={"message": f"Route not found - /{path_name}"},
    )


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
