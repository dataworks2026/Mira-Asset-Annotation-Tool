from functools import lru_cache

from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection

from app.config import settings


@lru_cache(maxsize=1)
def get_client() -> MongoClient:
    return MongoClient(settings.MONGODB_URI)


def get_database() -> Database:
    return get_client()[settings.MONGODB_DB_NAME]


def get_collection(name: str) -> Collection:
    return get_database()[name]
