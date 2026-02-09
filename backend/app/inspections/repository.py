from datetime import datetime

from pymongo.collection import Collection

from app.database import get_collection

_PROJECTION = {"_id": 0}


class InspectionRepository:
    def __init__(self, collection: Collection | None = None):
        self._collection = collection or get_collection("inspections")

    def insert(self, doc: dict) -> None:
        self._collection.insert_one(doc.copy())

    def find_by_id_and_user(self, inspection_id: str, user_email: str) -> dict | None:
        doc = self._collection.find_one(
            {"inspection_id": inspection_id, "user_email": user_email, "deleted_at": None},
            _PROJECTION,
        )
        return self._clean(doc) if doc else None

    def find_by_user(
        self, user_email: str, status_filter: str | None = None
    ) -> list[dict]:
        query: dict = {"user_email": user_email, "deleted_at": None}
        if status_filter:
            query["status"] = status_filter
        results = []
        for doc in self._collection.find(query, _PROJECTION).sort("created_at", -1):
            results.append(self._clean(doc))
        return results

    def find_by_id(self, inspection_id: str) -> dict | None:
        doc = self._collection.find_one(
            {"inspection_id": inspection_id}, _PROJECTION
        )
        return self._clean(doc) if doc else None

    def find_by_asset(self, asset_id: str) -> list[dict]:
        """Find all inspections for an asset."""
        query = {"asset_id": asset_id, "deleted_at": None}
        results = []
        for doc in self._collection.find(query, _PROJECTION).sort("inspection_date", -1):
            results.append(self._clean(doc))
        return results

    def update_status(
        self, inspection_id: str, status: str, completed_at: datetime | None = None
    ) -> None:
        update: dict = {"status": status}
        if completed_at:
            update["completed_at"] = completed_at
        self._collection.update_one(
            {"inspection_id": inspection_id},
            {"$set": update},
        )

    def update(self, inspection_id: str, updates: dict) -> None:
        """Update inspection fields."""
        from datetime import datetime, timezone
        import logging
        logger = logging.getLogger(__name__)

        updates["updated_at"] = datetime.now(timezone.utc)
        logger.info(f"MongoDB update_one query: inspection_id={inspection_id}, updates={updates}")

        result = self._collection.update_one(
            {"inspection_id": inspection_id},
            {"$set": updates},
        )
        logger.info(f"MongoDB update result: matched={result.matched_count}, modified={result.modified_count}")

    def soft_delete(self, inspection_id: str, user_email: str) -> None:
        """Soft delete an inspection by setting deleted_at timestamp."""
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc)
        self._collection.update_one(
            {"inspection_id": inspection_id, "user_email": user_email},
            {"$set": {"deleted_at": now, "updated_at": now}},
        )

    @staticmethod
    def _clean(doc: dict) -> dict:
        """Clean and serialize doc."""
        doc.pop("user_email", None)
        doc.pop("deleted_at", None)  # Don't expose soft-delete field
        for field in ("created_at", "completed_at", "updated_at"):
            value = doc.get(field)
            if isinstance(value, datetime):
                doc[field] = value.isoformat()
        return doc
