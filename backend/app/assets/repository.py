from datetime import datetime, timezone

from pymongo.collection import Collection

from app.database import get_collection

_PROJECTION = {"_id": 0}


class AssetRepository:
    def __init__(self, collection: Collection | None = None):
        self._collection = collection or get_collection("assets")

    def insert(self, doc: dict) -> None:
        self._collection.insert_one(doc.copy())

    def find_by_id(self, asset_id: str) -> dict | None:
        doc = self._collection.find_one(
            {"asset_id": asset_id, "deleted_at": None},
            _PROJECTION,
        )
        return self._clean(doc) if doc else None

    def find_by_id_and_user(self, asset_id: str, user_email: str) -> dict | None:
        doc = self._collection.find_one(
            {"asset_id": asset_id, "user_email": user_email, "deleted_at": None},
            _PROJECTION,
        )
        return self._clean(doc) if doc else None

    def find_by_user(
        self, user_email: str, asset_type: str | None = None
    ) -> list[dict]:
        query: dict = {"user_email": user_email, "deleted_at": None}
        if asset_type:
            query["asset_type"] = asset_type
        results = []
        for doc in self._collection.find(query, _PROJECTION).sort("created_at", -1):
            results.append(self._clean(doc))
        return results

    def update(self, asset_id: str, updates: dict) -> None:
        """Update asset fields."""
        updates["updated_at"] = datetime.now(timezone.utc)
        self._collection.update_one(
            {"asset_id": asset_id},
            {"$set": updates},
        )

    def soft_delete(self, asset_id: str, user_email: str) -> None:
        """Soft delete an asset."""
        now = datetime.now(timezone.utc)
        self._collection.update_one(
            {"asset_id": asset_id, "user_email": user_email},
            {"$set": {"deleted_at": now, "updated_at": now}},
        )

    def find_one_by_name_and_user(
        self, asset_name: str, user_email: str
    ) -> dict | None:
        """Find asset by name and user (case-insensitive)."""
        doc = self._collection.find_one(
            {
                "asset_name": {"$regex": f"^{asset_name}$", "$options": "i"},
                "user_email": user_email,
                "deleted_at": None,
            },
            _PROJECTION,
        )
        return self._clean(doc) if doc else None

    @staticmethod
    def _clean(doc: dict) -> dict:
        """Clean and serialize doc."""
        for field in ("created_at", "updated_at", "deleted_at"):
            value = doc.get(field)
            if isinstance(value, datetime):
                doc[field] = value.isoformat()
        return doc
