import os
import logging
from abc import ABC, abstractmethod
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)

class BaseStorageProvider(ABC):
    @abstractmethod
    def save_file(self, file_name: str, content: bytes) -> str:
        """Saves a file and returns its access URL."""
        pass

    @abstractmethod
    def generate_presigned_upload_url(self, file_name: str, expiration: int = 3600) -> str:
        """Generates a presigned URL to upload a file."""
        pass

    @abstractmethod
    def generate_presigned_download_url(self, file_name: str, expiration: int = 3600) -> str:
        """Generates a presigned URL to download a file."""
        pass


class LocalStorageProvider(BaseStorageProvider):
    def save_file(self, file_name: str, content: bytes) -> str:
        saved_path = default_storage.save(file_name, ContentFile(content))
        return default_storage.url(saved_path)

    def generate_presigned_upload_url(self, file_name: str, expiration: int = 3600) -> str:
        # Mock upload endpoint pointing to a local handler
        return f"/api/v1/storage/local-upload/?file={file_name}"

    def generate_presigned_download_url(self, file_name: str, expiration: int = 3600) -> str:
        return default_storage.url(file_name)


class S3StorageProvider(BaseStorageProvider):
    def __init__(self):
        import boto3
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME

    def save_file(self, file_name: str, content: bytes) -> str:
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_name,
                Body=content
            )
            return f"https://{self.bucket_name}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{file_name}"
        except Exception as e:
            logger.error(f"S3 Save failure: {e}")
            raise

    def generate_presigned_upload_url(self, file_name: str, expiration: int = 3600) -> str:
        try:
            response = self.s3_client.generate_presigned_url(
                'put_object',
                Params={'Bucket': self.bucket_name, 'Key': file_name},
                ExpiresIn=expiration
            )
            return response
        except Exception as e:
            logger.error(f"Failed to generate S3 upload URL: {e}")
            return ""

    def generate_presigned_download_url(self, file_name: str, expiration: int = 3600) -> str:
        try:
            response = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': file_name},
                ExpiresIn=expiration
            )
            return response
        except Exception as e:
            logger.error(f"Failed to generate S3 download URL: {e}")
            return ""


class R2StorageProvider(BaseStorageProvider):
    def __init__(self):
        import boto3
        endpoint_url = os.getenv('R2_ENDPOINT_URL')
        self.s3_client = boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
            region_name='auto'
        )
        self.bucket_name = os.getenv('R2_BUCKET_NAME', 'skillsphere')

    def save_file(self, file_name: str, content: bytes) -> str:
        try:
            self.s3_client.put_object(Bucket=self.bucket_name, Key=file_name, Body=content)
            public_url = os.getenv('R2_PUBLIC_URL', 'https://pub-r2.skillsphere.com')
            return f"{public_url.rstrip('/')}/{file_name}"
        except Exception as e:
            logger.error(f"R2 Save failure: {e}")
            raise

    def generate_presigned_upload_url(self, file_name: str, expiration: int = 3600) -> str:
        try:
            return self.s3_client.generate_presigned_url('put_object', Params={'Bucket': self.bucket_name, 'Key': file_name}, ExpiresIn=expiration)
        except Exception:
            return ""

    def generate_presigned_download_url(self, file_name: str, expiration: int = 3600) -> str:
        try:
            return self.s3_client.generate_presigned_url('get_object', Params={'Bucket': self.bucket_name, 'Key': file_name}, ExpiresIn=expiration)
        except Exception:
            return ""


class MinIOStorageProvider(BaseStorageProvider):
    def __init__(self):
        import boto3
        endpoint_url = os.getenv('MINIO_ENDPOINT_URL', 'http://localhost:9000')
        self.s3_client = boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=os.getenv('MINIO_ROOT_USER', 'minioadmin'),
            aws_secret_access_key=os.getenv('MINIO_ROOT_PASSWORD', 'minioadmin'),
            region_name='us-east-1'
        )
        self.bucket_name = os.getenv('MINIO_BUCKET_NAME', 'skillsphere')

    def save_file(self, file_name: str, content: bytes) -> str:
        try:
            self.s3_client.put_object(Bucket=self.bucket_name, Key=file_name, Body=content)
            endpoint_url = os.getenv('MINIO_ENDPOINT_URL', 'http://localhost:9000')
            return f"{endpoint_url}/{self.bucket_name}/{file_name}"
        except Exception as e:
            logger.error(f"MinIO Save failure: {e}")
            raise

    def generate_presigned_upload_url(self, file_name: str, expiration: int = 3600) -> str:
        try:
            return self.s3_client.generate_presigned_url('put_object', Params={'Bucket': self.bucket_name, 'Key': file_name}, ExpiresIn=expiration)
        except Exception:
            return ""

    def generate_presigned_download_url(self, file_name: str, expiration: int = 3600) -> str:
        try:
            return self.s3_client.generate_presigned_url('get_object', Params={'Bucket': self.bucket_name, 'Key': file_name}, ExpiresIn=expiration)
        except Exception:
            return ""


def get_storage_provider() -> BaseStorageProvider:
    """
    Returns the storage provider based on environment setting STORAGE_PROVIDER, fallback to LocalStorageProvider.
    """
    provider = os.getenv('STORAGE_PROVIDER', 'local').lower()
    try:
        if provider == 's3':
            return S3StorageProvider()
        elif provider == 'r2':
            return R2StorageProvider()
        elif provider == 'minio':
            return MinIOStorageProvider()
    except Exception as e:
        logger.warning(f"Failed to initialize {provider} storage provider ({e}). Falling back to LocalStorageProvider.")
    return LocalStorageProvider()
