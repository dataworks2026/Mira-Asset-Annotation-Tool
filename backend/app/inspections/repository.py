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
            {"inspection_id": inspection_id, "user_email": user_email},
            _PROJECTION,
        )
        return self._clean(doc) if doc else None

    def find_by_user(
        self, user_email: str, status_filter: str | None = None
    ) -> list[dict]:
        query: dict = {"user_email": user_email}
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

    @staticmethod
    def _clean(doc: dict) -> dict:
        """Clean and serialize doc."""
        doc.pop("user_email", None)
        for field in ("created_at", "completed_at"):
            value = doc.get(field)
            if isinstance(value, datetime):
                doc[field] = value.isoformat()
        return doc
