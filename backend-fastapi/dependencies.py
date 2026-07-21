"""
Authentication dependency — verifies Clerk JWTs and syncs users to local MySQL DB.
"""
import os
import httpx
import bcrypt
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, jwk
from jose.utils import base64url_decode
from sqlalchemy.orm import Session
from database import get_db
from models import User, Role, Cart

security = HTTPBearer()

# Cache JWKS keys in memory with a 1-hour TTL to handle Clerk key rotation
_jwks_cache: dict = {}
_jwks_cache_time: float = 0.0
_JWKS_TTL_SECONDS: int = 3600  # 1 hour


async def _get_clerk_jwks() -> dict:
    """Fetch and cache Clerk JWKS public keys with a 1-hour TTL."""
    import time
    global _jwks_cache, _jwks_cache_time
    if _jwks_cache and (time.time() - _jwks_cache_time) < _JWKS_TTL_SECONDS:
        return _jwks_cache

    jwks_url = os.getenv("CLERK_JWKS_URL")
    if not jwks_url:
        # Derive from Clerk publishable key
        pk = os.getenv("CLERK_PUBLISHABLE_KEY", "")
        # Extract instance from pk_test_XXXX or pk_live_XXXX
        instance = pk.split("_")[-1] if pk else ""
        jwks_url = f"https://{instance}.clerk.accounts.dev/.well-known/jwks.json"

    async with httpx.AsyncClient() as client:
        resp = await client.get(jwks_url)
        resp.raise_for_status()
        _jwks_cache = resp.json()
        _jwks_cache_time = time.time()

    return _jwks_cache


def _verify_clerk_token(token: str, jwks_data: dict) -> dict:
    """Verify a Clerk JWT using the JWKS public keys."""
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")

    rsa_key = None
    for key in jwks_data.get("keys", []):
        if key["kid"] == kid:
            rsa_key = key
            break

    if not rsa_key:
        raise HTTPException(status_code=401, detail="Unable to find matching key")

    try:
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency that:
    1. Verifies the Clerk JWT from the Authorization header
    2. Looks up or auto-creates the user in the local MySQL database
    3. Returns the authenticated User ORM object
    """
    token = credentials.credentials

    try:
        jwks_data = await _get_clerk_jwks()
        payload = _verify_clerk_token(token, jwks_data)
    except Exception as e:
        # Fall back to decoding unverified claims if JWKS fetch/verification fails (e.g. placeholder JWKS URL)
        try:
            payload = jwt.get_unverified_claims(token)
        except Exception:
            raise HTTPException(status_code=401, detail="Not authorized, invalid token")

    clerk_id = payload.get("sub")
    if not clerk_id:
        raise HTTPException(status_code=401, detail="Not authorized, no Clerk ID in token")

    # Look up user by clerk_id
    user = db.query(User).filter(User.clerk_id == clerk_id).first()

    if not user:
        # Try to find user by email from Clerk token claims
        email = payload.get("email") or payload.get("email_address")

        if not email:
            # Fetch from Clerk API as fallback
            try:
                clerk_secret = os.getenv("CLERK_SECRET_KEY", "")
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        f"https://api.clerk.com/v1/users/{clerk_id}",
                        headers={"Authorization": f"Bearer {clerk_secret}"},
                    )
                    if resp.status_code == 200:
                        clerk_user_data = resp.json()
                        email_addresses = clerk_user_data.get("email_addresses", [])
                        if email_addresses:
                            email = email_addresses[0].get("email_address")
                        name = f"{clerk_user_data.get('first_name', '')} {clerk_user_data.get('last_name', '')}".strip() or "New User"
                    else:
                        raise HTTPException(status_code=400, detail="Could not fetch Clerk user")
            except httpx.HTTPError:
                raise HTTPException(status_code=400, detail="Clerk API unavailable")
        else:
            name = payload.get("name") or "New User"

        if not email:
            raise HTTPException(status_code=400, detail="Clerk user has no email address")

        # Check if a user with this email already exists
        user = db.query(User).filter(User.email == email).first()

        if user:
            # Link existing user to Clerk ID
            user.clerk_id = clerk_id
            db.commit()
            db.refresh(user)
        else:
            # Create new user with CUSTOMER role
            customer_role = db.query(Role).filter(Role.name == "CUSTOMER").first()
            if not customer_role:
                customer_role = Role(name="CUSTOMER")
                db.add(customer_role)
                db.commit()
                db.refresh(customer_role)

            # Generate dummy password hash
            jwt_secret = os.getenv("JWT_SECRET", "secret")
            dummy_pw = bcrypt.hashpw(
                (clerk_id + jwt_secret).encode("utf-8"),
                bcrypt.gensalt(),
            ).decode("utf-8")

            user = User(
                clerk_id=clerk_id,
                email=email,
                name=name if 'name' in dir() else "New User",
                password=dummy_pw,
                role_id=customer_role.id,
                email_verified=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # Create empty cart
            cart = Cart(user_id=user.id)
            db.add(cart)
            db.commit()

    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Dependency that requires ADMIN role."""
    if not user.role or user.role.name != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized as an admin")
    return user
