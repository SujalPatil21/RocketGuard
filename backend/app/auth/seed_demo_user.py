"""
Demo user seed script.

Usage (from the backend/ directory with venv active):

    python -m app.auth.seed_demo_user

Creates a single demo user if one does not already exist.
The password is read from the DEMO_PASSWORD environment variable.
If not set, a default demo password is used â€” change it before any
non-local demo.

The plaintext password is NEVER written to source code or logs.
"""
import os
import sys

# Resolve root .env â€” 3 levels up from backend/app/auth/
_env_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "..", ".env"
)
from dotenv import load_dotenv
load_dotenv(_env_path)

from app.db.database import SessionLocal, create_tables
from app.models.user import User, Role
from app.auth.services.password_service import PasswordService

DEMO_EMAIL = "demo@apsentinel.com"
DEMO_USERNAME = "demo_reviewer"
# Password pulled from env â€” never hardcoded
DEMO_PASSWORD = os.environ.get("DEMO_PASSWORD", "Demo@Sentinel1!")


def seed():
    print("[SEED] Initialising database tables...")
    create_tables()

    db = SessionLocal()
    try:
        # Ensure the default role exists
        role = db.query(Role).filter_by(name="User").first()
        if not role:
            role = Role(name="User")
            db.add(role)
            db.commit()
            db.refresh(role)
            print(f"[SEED] Created role: {role.name}")
        else:
            print(f"[SEED] Role exists: {role.name}")

        # Check if demo user already exists
        existing = db.query(User).filter_by(email=DEMO_EMAIL).first()
        if existing:
            print(f"[SEED] Demo user already exists: {DEMO_EMAIL} â€” skipping.")
            return

        # Hash password using the same PasswordService the auth module uses
        password_hash = PasswordService.hash_password(DEMO_PASSWORD)

        demo_user = User(
            username=DEMO_USERNAME,
            email=DEMO_EMAIL,
            password_hash=password_hash,
            role_id=role.id,
            is_verified=True,          # Pre-verified for demo convenience
            full_name="Demo Reviewer",
            language="en",
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

        print(f"[SEED] Demo user created:")
        print(f"       Email    : {DEMO_EMAIL}")
        print(f"       Username : {DEMO_USERNAME}")
        print(f"       Role     : {role.name}")
        print(f"       Verified : True")
        print(f"       Password : set from DEMO_PASSWORD env var (not printed)")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
