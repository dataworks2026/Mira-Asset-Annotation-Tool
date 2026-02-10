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
            {"inspection_id": inspection_id, "deleted_at": None}, _PROJECTION
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
        from datetime import datetime, timezone
        self._collection.update_one(
            {"image_id": image_id},
            {
                "$set": {
                    "annotations": annotations,
                    "num_annotations": num,
                    "annotation_status": status,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

    def update_field(self, image_id: str, field: str, value) -> None:
        """Update a single field on an image."""
        from datetime import datetime, timezone
        self._collection.update_one(
            {"image_id": image_id},
            {"$set": {field: value, "updated_at": datetime.now(timezone.utc)}},
        )

    def count_by_inspection(self, inspection_id: str) -> int:
        """Count only successfully uploaded images (where upload_completed is True)."""
        return self._collection.count_documents(
            {
                "inspection_id": inspection_id,
                "deleted_at": None,
                "upload_completed": True,  # Only count completed uploads
            }
        )

    def soft_delete_by_inspection(self, inspection_id: str) -> int:
        """Soft delete all images for an inspection. Returns count of deleted images."""
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc)
        result = self._collection.update_many(
            {"inspection_id": inspection_id, "deleted_at": None},
            {"$set": {"deleted_at": now, "updated_at": now}},
        )
        return result.modified_count

    def find_s3_keys_by_inspection(self, inspection_id: str) -> list[dict]:
        """Get all S3 keys for an inspection (including soft-deleted images for cleanup)."""
        results = []
        for doc in self._collection.find(
            {"inspection_id": inspection_id},
            {"_id": 0, "s3_key": 1, "s3_key_annotated": 1, "s3_key_version": 1}
        ):
            results.append(doc)
        return results

    def soft_delete(self, image_id: str) -> bool:
        """Soft delete a single image. Returns True if image was found and deleted."""
        from datetime import datetime, timezone

        now = datetime.now(timezone.utc)
        result = self._collection.update_one(
            {"image_id": image_id, "deleted_at": None},
            {"$set": {"deleted_at": now, "updated_at": now}},
        )
        return result.modified_count > 0

    def find_s3_keys_by_id(self, image_id: str) -> dict | None:
        """Get S3 keys for a single image."""
        doc = self._collection.find_one(
            {"image_id": image_id},
            {"_id": 0, "s3_key": 1, "s3_key_annotated": 1, "s3_key_version": 1, "inspection_id": 1}
        )
        return doc

    @staticmethod
    def _serialize_dates(doc: dict) -> None:
        """Serialize datetime to ISO."""
        for field in ("uploaded_at",):
            value = doc.get(field)
            if isinstance(value, datetime):
                doc[field] = value.isoformat()
