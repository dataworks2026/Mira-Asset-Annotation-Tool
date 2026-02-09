from functools import lru_cache
import logging

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from app.config import settings

logger = logging.getLogger(__name__)


class S3ServiceUnavailableError(Exception):
    """AWS credentials not configured."""
    pass


class S3Service:
    def __init__(self):
        if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY or not settings.S3_BUCKET_NAME:
            self._available = False
            self.s3_client = None
            self.bucket_name = settings.S3_BUCKET_NAME
            return

        self._available = True
        region = settings.AWS_REGION or "us-east-1"
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=region,
            endpoint_url=f"https://s3.{region}.amazonaws.com",
            config=Config(signature_version="s3v4"),
        )
        self.bucket_name = settings.S3_BUCKET_NAME

    @property
    def available(self) -> bool:
        return self._available

    def _check_available(self):
        if not self._available:
            raise S3ServiceUnavailableError(
                "AWS credentials not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET_NAME in .env"
            )

    def generate_presigned_upload_url(
        self, key: str, content_type: str, expires_in: int = 3600
    ) -> str:
        self._check_available()
        return self.s3_client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self.bucket_name,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=expires_in,
        )

    def generate_presigned_download_url(
        self, key: str, expires_in: int = 3600
    ) -> str:
        self._check_available()
        return self.s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": key},
            ExpiresIn=expires_in,
        )

    def download_object(self, key: str) -> bytes:
        """Download object from S3."""
        self._check_available()
        response = self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
        return response["Body"].read()

    def object_exists(self, key: str) -> bool:
        """Check S3 object existence."""
        self._check_available()
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except self.s3_client.exceptions.ClientError:
            return False

    def upload_object(self, key: str, body: bytes, content_type: str) -> None:
        """Upload bytes to S3."""
        self._check_available()
        self.s3_client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=body,
            ContentType=content_type,
        )

    def delete_object(self, key: str) -> bool:
        """Delete a single object from S3. Returns True if successful."""
        self._check_available()
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            logger.info(f"Deleted S3 object: {key}")
            return True
        except ClientError:
            logger.exception(f"Failed to delete S3 object: {key}")
            return False

    def delete_objects_by_prefix(self, prefix: str) -> tuple[int, int]:
        """
        Delete all objects with a given prefix.
        Returns (success_count, failure_count).
        Handles pagination for large sets.
        """
        self._check_available()
        success_count = 0
        failure_count = 0

        try:
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=self.bucket_name, Prefix=prefix)

            for page in pages:
                if 'Contents' not in page:
                    continue

                objects_to_delete = [{'Key': obj['Key']} for obj in page['Contents']]

                if objects_to_delete:
                    try:
                        response = self.s3_client.delete_objects(
                            Bucket=self.bucket_name,
                            Delete={'Objects': objects_to_delete}
                        )
                        deleted = response.get('Deleted', [])
                        errors = response.get('Errors', [])
                        success_count += len(deleted)
                        failure_count += len(errors)

                        if deleted:
                            logger.info(f"Deleted {len(deleted)} objects with prefix: {prefix}")
                        if errors:
                            logger.error(f"Failed to delete {len(errors)} objects with prefix: {prefix}")
                    except ClientError:
                        logger.exception(f"Failed to delete batch from prefix: {prefix}")
                        failure_count += len(objects_to_delete)
        except ClientError:
            logger.exception(f"Failed to list objects with prefix: {prefix}")
            return success_count, failure_count

        return success_count, failure_count


@lru_cache(maxsize=1)
def get_s3_service() -> S3Service:
    return S3Service()
