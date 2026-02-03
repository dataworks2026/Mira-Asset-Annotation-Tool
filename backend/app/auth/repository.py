from pymongo.collection import Collection

from app.database import get_collection


class UserRepository:
    def __init__(self, collection: Collection | None = None):
        self._collection = collection or get_collection("users")

    def find_by_email(self, email: str) -> dict | None:
        return self._collection.find_one({"email": email}, {"_id": 0})
