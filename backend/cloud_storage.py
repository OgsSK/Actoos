"""
Cloud Storage Service - S3/Cloudflare R2 Compatible
Handles file uploads for photos, PDFs, and documents
"""
import os
import io
import uuid
import logging
import mimetypes
from datetime import datetime, timezone
from typing import Optional, BinaryIO, Union
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# =====================================================
# CONFIGURATION
# =====================================================

# S3/R2 Configuration (R2 is S3-compatible)
S3_ENDPOINT = os.environ.get("S3_ENDPOINT")  # For R2: https://xxx.r2.cloudflarestorage.com
S3_ACCESS_KEY = os.environ.get("S3_ACCESS_KEY")
S3_SECRET_KEY = os.environ.get("S3_SECRET_KEY")
S3_BUCKET = os.environ.get("S3_BUCKET", "actoos-files")
S3_PUBLIC_URL = os.environ.get("S3_PUBLIC_URL")  # Custom domain or R2.dev URL
S3_REGION = os.environ.get("S3_REGION", "auto")

# Fallback to local storage if S3 not configured
LOCAL_STORAGE_PATH = "/app/uploads"
USE_S3 = bool(S3_ENDPOINT and S3_ACCESS_KEY and S3_SECRET_KEY)

# File size limits (in bytes)
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_PDF_SIZE = 25 * 1024 * 1024    # 25MB
MAX_FILE_SIZE = 50 * 1024 * 1024   # 50MB

# Allowed extensions
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic'}
ALLOWED_DOCUMENT_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv'}


# =====================================================
# S3 CLIENT INITIALIZATION
# =====================================================

_s3_client = None

def get_s3_client():
    """Get or create S3 client (lazy initialization)"""
    global _s3_client
    
    if not USE_S3:
        return None
    
    if _s3_client is None:
        try:
            import boto3
            from botocore.config import Config
            
            _s3_client = boto3.client(
                's3',
                endpoint_url=S3_ENDPOINT,
                aws_access_key_id=S3_ACCESS_KEY,
                aws_secret_access_key=S3_SECRET_KEY,
                region_name=S3_REGION,
                config=Config(
                    signature_version='s3v4',
                    s3={'addressing_style': 'path'}
                )
            )
            logger.info(f"S3 client initialized: {S3_ENDPOINT}")
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {str(e)}")
            return None
    
    return _s3_client


# =====================================================
# HELPER FUNCTIONS
# =====================================================

def generate_file_key(
    entreprise_id: str,
    category: str,
    filename: str,
    preserve_name: bool = False
) -> str:
    """
    Generate a unique file key for S3/R2
    Format: entreprise_id/category/date/uuid_filename
    """
    ext = os.path.splitext(filename)[1].lower()
    date_prefix = datetime.now(timezone.utc).strftime("%Y/%m")
    
    if preserve_name:
        safe_name = "".join(c for c in filename if c.isalnum() or c in '._-')
        unique_name = f"{uuid.uuid4().hex[:8]}_{safe_name}"
    else:
        unique_name = f"{uuid.uuid4().hex}{ext}"
    
    return f"{entreprise_id}/{category}/{date_prefix}/{unique_name}"


def get_content_type(filename: str) -> str:
    """Get MIME type from filename"""
    content_type, _ = mimetypes.guess_type(filename)
    return content_type or 'application/octet-stream'


def validate_file(
    filename: str,
    file_size: int,
    allowed_extensions: set = None,
    max_size: int = MAX_FILE_SIZE
) -> tuple[bool, str]:
    """Validate file before upload"""
    ext = os.path.splitext(filename)[1].lower()
    
    if allowed_extensions and ext not in allowed_extensions:
        return False, f"Extension non autorisée: {ext}"
    
    if file_size > max_size:
        max_mb = max_size / (1024 * 1024)
        return False, f"Fichier trop volumineux (max {max_mb:.0f}MB)"
    
    return True, ""


# =====================================================
# MAIN STORAGE FUNCTIONS
# =====================================================

async def upload_file(
    file_content: Union[bytes, BinaryIO],
    filename: str,
    entreprise_id: str,
    category: str = "files",
    content_type: str = None,
    metadata: dict = None
) -> dict:
    """
    Upload a file to S3/R2 or local storage
    
    Args:
        file_content: File bytes or file-like object
        filename: Original filename
        entreprise_id: Enterprise ID for organization
        category: Category folder (photos, pdfs, documents)
        content_type: MIME type (auto-detected if not provided)
        metadata: Additional metadata to store
    
    Returns:
        dict with url, key, size, content_type
    """
    # Convert to bytes if needed
    if hasattr(file_content, 'read'):
        file_bytes = file_content.read()
    else:
        file_bytes = file_content
    
    file_size = len(file_bytes)
    
    if not content_type:
        content_type = get_content_type(filename)
    
    file_key = generate_file_key(entreprise_id, category, filename)
    
    if USE_S3:
        return await _upload_to_s3(file_bytes, file_key, content_type, metadata)
    else:
        return await _upload_to_local(file_bytes, file_key, content_type)


async def _upload_to_s3(
    file_bytes: bytes,
    file_key: str,
    content_type: str,
    metadata: dict = None
) -> dict:
    """Upload file to S3/R2"""
    s3 = get_s3_client()
    if not s3:
        raise Exception("S3 client not available")
    
    try:
        extra_args = {
            'ContentType': content_type,
            'CacheControl': 'max-age=31536000'  # 1 year cache
        }
        
        if metadata:
            extra_args['Metadata'] = {k: str(v) for k, v in metadata.items()}
        
        # Upload to S3
        s3.put_object(
            Bucket=S3_BUCKET,
            Key=file_key,
            Body=file_bytes,
            **extra_args
        )
        
        # Generate public URL
        if S3_PUBLIC_URL:
            public_url = f"{S3_PUBLIC_URL.rstrip('/')}/{file_key}"
        else:
            # Use presigned URL if no public URL configured
            public_url = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': S3_BUCKET, 'Key': file_key},
                ExpiresIn=86400 * 7  # 7 days
            )
        
        logger.info(f"File uploaded to S3: {file_key}")
        
        return {
            "success": True,
            "url": public_url,
            "key": file_key,
            "size": len(file_bytes),
            "content_type": content_type,
            "storage": "s3"
        }
        
    except Exception as e:
        logger.error(f"S3 upload failed: {str(e)}")
        raise Exception(f"Upload failed: {str(e)}")


async def _upload_to_local(
    file_bytes: bytes,
    file_key: str,
    content_type: str
) -> dict:
    """Fallback: Upload file to local storage"""
    import aiofiles
    
    full_path = os.path.join(LOCAL_STORAGE_PATH, file_key)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    
    async with aiofiles.open(full_path, 'wb') as f:
        await f.write(file_bytes)
    
    # Generate local URL (served by backend)
    public_url = f"/api/files/{file_key}"
    
    logger.info(f"File uploaded locally: {file_key}")
    
    return {
        "success": True,
        "url": public_url,
        "key": file_key,
        "size": len(file_bytes),
        "content_type": content_type,
        "storage": "local"
    }


async def delete_file(file_key: str) -> bool:
    """Delete a file from storage"""
    if USE_S3:
        return await _delete_from_s3(file_key)
    else:
        return await _delete_from_local(file_key)


async def _delete_from_s3(file_key: str) -> bool:
    """Delete file from S3/R2"""
    s3 = get_s3_client()
    if not s3:
        return False
    
    try:
        s3.delete_object(Bucket=S3_BUCKET, Key=file_key)
        logger.info(f"File deleted from S3: {file_key}")
        return True
    except Exception as e:
        logger.error(f"S3 delete failed: {str(e)}")
        return False


async def _delete_from_local(file_key: str) -> bool:
    """Delete file from local storage"""
    full_path = os.path.join(LOCAL_STORAGE_PATH, file_key)
    try:
        if os.path.exists(full_path):
            os.remove(full_path)
            logger.info(f"File deleted locally: {file_key}")
            return True
        return False
    except Exception as e:
        logger.error(f"Local delete failed: {str(e)}")
        return False


async def get_file(file_key: str) -> Optional[bytes]:
    """Get file content from storage"""
    if USE_S3:
        return await _get_from_s3(file_key)
    else:
        return await _get_from_local(file_key)


async def _get_from_s3(file_key: str) -> Optional[bytes]:
    """Get file from S3/R2"""
    s3 = get_s3_client()
    if not s3:
        return None
    
    try:
        response = s3.get_object(Bucket=S3_BUCKET, Key=file_key)
        return response['Body'].read()
    except Exception as e:
        logger.error(f"S3 get failed: {str(e)}")
        return None


async def _get_from_local(file_key: str) -> Optional[bytes]:
    """Get file from local storage"""
    import aiofiles
    
    full_path = os.path.join(LOCAL_STORAGE_PATH, file_key)
    try:
        if os.path.exists(full_path):
            async with aiofiles.open(full_path, 'rb') as f:
                return await f.read()
        return None
    except Exception as e:
        logger.error(f"Local get failed: {str(e)}")
        return None


def get_presigned_url(file_key: str, expires_in: int = 3600) -> Optional[str]:
    """Get a presigned URL for direct download"""
    if not USE_S3:
        return f"/api/files/{file_key}"
    
    s3 = get_s3_client()
    if not s3:
        return None
    
    try:
        return s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET, 'Key': file_key},
            ExpiresIn=expires_in
        )
    except Exception as e:
        logger.error(f"Presigned URL generation failed: {str(e)}")
        return None


# =====================================================
# CONVENIENCE FUNCTIONS
# =====================================================

async def upload_image(
    file_content: Union[bytes, BinaryIO],
    filename: str,
    entreprise_id: str,
    category: str = "photos"
) -> dict:
    """Upload an image with validation"""
    if hasattr(file_content, 'read'):
        file_bytes = file_content.read()
    else:
        file_bytes = file_content
    
    is_valid, error = validate_file(
        filename, 
        len(file_bytes),
        ALLOWED_IMAGE_EXTENSIONS,
        MAX_IMAGE_SIZE
    )
    
    if not is_valid:
        raise ValueError(error)
    
    return await upload_file(
        file_bytes,
        filename,
        entreprise_id,
        category=category
    )


async def upload_pdf(
    file_content: Union[bytes, BinaryIO],
    filename: str,
    entreprise_id: str,
    category: str = "pdfs"
) -> dict:
    """Upload a PDF with validation"""
    if hasattr(file_content, 'read'):
        file_bytes = file_content.read()
    else:
        file_bytes = file_content
    
    is_valid, error = validate_file(
        filename,
        len(file_bytes),
        {'.pdf'},
        MAX_PDF_SIZE
    )
    
    if not is_valid:
        raise ValueError(error)
    
    return await upload_file(
        file_bytes,
        filename,
        entreprise_id,
        category=category,
        content_type='application/pdf'
    )


# =====================================================
# STORAGE INFO
# =====================================================

def get_storage_info() -> dict:
    """Get current storage configuration info"""
    return {
        "type": "s3" if USE_S3 else "local",
        "configured": USE_S3,
        "endpoint": S3_ENDPOINT if USE_S3 else "local filesystem",
        "bucket": S3_BUCKET if USE_S3 else LOCAL_STORAGE_PATH,
        "public_url": S3_PUBLIC_URL if USE_S3 else "/api/files",
        "limits": {
            "max_image_size_mb": MAX_IMAGE_SIZE / (1024 * 1024),
            "max_pdf_size_mb": MAX_PDF_SIZE / (1024 * 1024),
            "max_file_size_mb": MAX_FILE_SIZE / (1024 * 1024)
        }
    }


# Log storage status on import
if USE_S3:
    logger.info(f"Cloud storage configured: {S3_ENDPOINT} bucket={S3_BUCKET}")
else:
    logger.info(f"Using local storage: {LOCAL_STORAGE_PATH}")
