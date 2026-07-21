import sys
import os
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, Role

def make_admin(email: str):
    db: Session = SessionLocal()
    try:
        # Find user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"Error: User with email '{email}' not found. Make sure you log in to the frontend first.")
            return

        # Ensure ADMIN role exists
        admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
        if not admin_role:
            admin_role = Role(name="ADMIN")
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)

        # Update user
        user.role_id = admin_role.id
        db.commit()
        print(f"Success! {email} has been promoted to ADMIN.")
    
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_admin.py <your-email>")
    else:
        make_admin(sys.argv[1])
