import os
import sys

# Ensure we can import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal
import models
from auth import get_password_hash

def insert_admin():
    db = SessionLocal()
    try:
        email = "admin@gmail.com"
        existing = db.query(models.User).filter(models.User.email == email).first()
        if existing:
            print(f"User {email} already exists. Setting role to admin.")
            existing.role = "admin"
            existing.hashed_password = get_password_hash("Admin@123")
        else:
            print(f"Creating new admin user: {email}")
            admin_user = models.User(
                email=email,
                name="Admin User",
                hashed_password=get_password_hash("Admin@123"),
                role="admin"
            )
            db.add(admin_user)
        db.commit()
        print("Admin user created/updated successfully.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    insert_admin()
