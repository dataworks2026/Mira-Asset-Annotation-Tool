"""Seed initial test user."""

from app.database import get_collection
from app.auth.service import hash_password


def seed_users():
    users = get_collection("users")

    test_user = {
        "email": "admin@miraintel.com",
        "password": hash_password("admin123"),
        "full_name": "Admin User",
        "role": "engineer",
    }

    existing = users.find_one({"email": test_user["email"]})
    if existing:
        print(f"User '{test_user['email']}' already exists. Skipping.")
        return

    users.insert_one(test_user)
    print(f"Created user: {test_user['email']} (password: admin123)")


if __name__ == "__main__":
    seed_users()
    print("Seed complete.")
