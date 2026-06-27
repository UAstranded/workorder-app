"""Run this script to seed the admin user and default labels."""
import asyncio
from app.database import async_session, init_db
from app.models.user import User, UserRole
from app.models.image import LabelSuggestion
from app.routers.auth import hash_password
from sqlalchemy import select


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

        await db.commit()
        print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
