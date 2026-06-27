"""Run this script to seed the admin user and default labels."""
import asyncio
from app.database import async_session, init_db
from app.models.user import User, UserRole
from app.models.image import LabelSuggestion
from app.models.app_settings import AppSetting
from app.routers.auth import hash_password
from sqlalchemy import select

DEFAULT_LOGO_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">
  <rect width="40" height="40" rx="8" fill="#0d9488"/>
  <path d="M12 28V12l8-4 8 4v16l-8 4-8-4z" fill="white" opacity="0.9"/>
  <path d="M20 8v24M12 16h16M12 24h16" stroke="#0d9488" stroke-width="1.5" opacity="0.3"/>
</svg>"""

DEFAULT_FAVICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0d9488"/>
  <path d="M10 22V10l6-3 6 3v12l-6 3-6-3z" fill="white" opacity="0.9"/>
</svg>"""


async def seed():
    await init_db()
    async with async_session() as db:
        result = await db.execute(select(User).where(User.role == UserRole.ADMIN))
        if not result.scalar_one_or_none():
            admin = User(
                email="admin@example.com",
                username="admin",
                hashed_password=hash_password("admin123"),
                display_name="Admin User",
                role=UserRole.ADMIN,
            )
            db.add(admin)
            print("Created admin user: admin / admin123")
        else:
            print("Admin user already exists")

        default_labels = [
            "Before", "After", "Equipment Photo", "Damage",
            "Signature", "Site Access", "Install Location", "Serial Number Plate",
        ]
        for label in default_labels:
            existing = await db.execute(select(LabelSuggestion).where(LabelSuggestion.label == label))
            if not existing.scalar_one_or_none():
                db.add(LabelSuggestion(label=label, usage_count=1))
                print(f"Added label suggestion: {label}")

        for key, value in [("logo_svg", DEFAULT_LOGO_SVG), ("favicon_svg", DEFAULT_FAVICON_SVG)]:
            existing = await db.execute(select(AppSetting).where(AppSetting.key == key))
            if not existing.scalar_one_or_none():
                db.add(AppSetting(key=key, value=value))
                print(f"Added default {key}")

        await db.commit()
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
