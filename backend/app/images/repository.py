from datetime import datetime

from pymongo.collection import Collection

from app.database import get_collection

_PROJECTION = {"_id": 0}


class ImageRepository:
    def __init__(self, collection: Collection | None = None):
        self._collection = collection or get_collection("images")

    def insert(self, doc: dict) -> None:
        self._collection.insert_one(doc.copy())

    def find_by_inspection(self, inspection_id: str) -> list[dict]:
        results = []
        for doc in self._collection.find(
            {"inspection_id": inspection_id}, _PROJECTION
        ).sort("uploaded_at", 1):
            self._serialize_dates(doc)
            results.append(doc)
        return results

    def find_by_id(self, image_id: str) -> dict | None:
        doc = self._collection.find_one({"image_id": image_id}, _PROJECTION)
        if doc:
            self._serialize_dates(doc)
        return doc

    def update_annotations(
        self, image_id: str, annotations: list[dict], num: int, status: str
    ) -> None:
        self._collection.update_one(
            {"image_id": image_id},
            {
                "$set": {
                    "annotations": annotations,
                    "num_annotations": num,
                    "annotation_status": status,
                }
            },
        )

    def count_by_inspection(self, inspection_id: str) -> int:
        return self._collection.count_documents(
            {"inspection_id": inspection_id}
        )

    @staticmethod
    def _serialize_dates(doc: dict) -> None:
        """Serialize datetime to ISO."""
        for field in ("uploaded_at",):
            value = doc.get(field)
            if isinstance(value, datetime):
                doc[field] = value.isoformat()
