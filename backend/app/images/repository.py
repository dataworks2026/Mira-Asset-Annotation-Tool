import re
from datetime import datetime

from pymongo.collection import Collection

from app.database import get_collection

_PROJECTION = {"_id": 0}


def _extract_sort_key(filename: str) -> tuple[str, int]:
    """Extract sort key from filename for alphabetic + numeric sorting.

    Returns tuple of (alphabetic_prefix, numeric_value)
    - Alphabetic prefix: all non-digit characters before first number
    - Numeric value: first number found in filename

    Examples:
        - "GI_SL1.JPG" -> ("GI_SL", 1)
        - "Yankee Pier-04.jpg" -> ("Yankee Pier-", 4)
        - "photo123.png" -> ("photo", 123)
        - "no_numbers.jpg" -> ("no_numbers.jpg", 999999)
    """
    # Find first number in filename
    match = re.search(r'\d+', filename)

    if match:
        # Extract prefix (everything before the first number)
        prefix = filename[:match.start()]
        number = int(match.group())
        return (prefix, number)

    # No number found - use entire filename as prefix, sort to end
    return (filename, 999999)


class ImageRepository:
    def __init__(self, collection: Collection | None = None):
        self._collection = collection or get_collection("images")

    def insert(self, doc: dict) -> None:
        self._collection.insert_one(doc.copy())

    def find_by_inspection(self, inspection_id: str) -> list[dict]:
        results = []
        for doc in self._collection.find(
            {"inspection_id": inspection_id, "deleted_at": None}, _PROJECTION
        ):
            self._serialize_dates(doc)
            results.append(doc)

        # Sort by alphabetic prefix, then by number (ascending)
        results.sort(key=lambda x: _extract_sort_key(x.get("filename", "")))
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
        """Count successfully uploaded images. For backwards compatibility, also count images without upload_completed field (legacy)."""
        return self._collection.count_documents(
            {
                "inspection_id": inspection_id,
                "deleted_at": None,
                "$or": [
                    {"upload_completed": True},  # New images
                    {"upload_completed": {"$exists": False}}  # Legacy images (backwards compatibility)
                ]
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
