import json
from functools import lru_cache

import boto3
from app.config import settings


class SQSServiceUnavailableError(Exception):
    """SQS credentials not configured."""
    pass


class SQSService:
    def __init__(self):
        if (
            not settings.AWS_ACCESS_KEY_ID
            or not settings.AWS_SECRET_ACCESS_KEY
            or not settings.SQS_QUEUE_URL
        ):
            self._available = False
            self.sqs_client = None
            self.queue_url = settings.SQS_QUEUE_URL
            return

        self._available = True
        self.sqs_client = boto3.client(
            "sqs",
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION,
        )
        self.queue_url = settings.SQS_QUEUE_URL

    @property
    def available(self) -> bool:
        return self._available

    def _check_available(self):
        if not self._available:
            raise SQSServiceUnavailableError(
                "AWS credentials or SQS_QUEUE_URL not configured. "
                "Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and SQS_QUEUE_URL in .env"
            )

    def send_completion_message(self, inspection: dict, annotations_summary: list[dict]) -> str:
        """Send completion message to SQS."""
        self._check_available()

        message_body = {
            "event": "inspection_completed",
            "inspection_id": inspection["inspection_id"],
            "asset_name": inspection["asset_name"],
            "asset_type": inspection["asset_type"],
            "inspector_name": inspection["inspector_name"],
            "inspection_date": inspection["inspection_date"],
            "completed_at": inspection["completed_at"],
            "total_images": inspection["total_images"],
            "annotations_summary": annotations_summary,
        }

        response = self.sqs_client.send_message(
            QueueUrl=self.queue_url,
            MessageBody=json.dumps(message_body),
            MessageAttributes={
                "EventType": {
                    "DataType": "String",
                    "StringValue": "inspection_completed",
                },
                "InspectionId": {
                    "DataType": "String",
                    "StringValue": inspection["inspection_id"],
                },
            },
        )
        return response["MessageId"]


@lru_cache(maxsize=1)
def get_sqs_service() -> SQSService:
    return SQSService()
