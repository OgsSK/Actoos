"""
Emergent Object Storage integration for photos and PDFs
"""
import os
import requests
import logging
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "fieldcommand"

storage_key: Optional[str] = None

def init_storage() -> Optional[str]:
    """Initialize storage and get session key. Call once at startup."""
    global storage_key
    if storage_key:
        return storage_key
    
    if not EMERGENT_KEY:
        logger.warning("EMERGENT_LLM_KEY not set, storage disabled")
        return None
    
    try:
        resp = requests.post(
            f"{STORAGE_URL}/init",
            json={"emergent_key": EMERGENT_KEY},
            timeout=30
        )
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> Optional[dict]:
    """Upload file to storage. Returns {"path": "...", "size": 123, "etag": "..."}"""
    key = init_storage()
    if not key:
        return None
    
    try:
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120
        )
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return None

def get_object(path: str) -> Tuple[Optional[bytes], str]:
    """Download file from storage. Returns (content_bytes, content_type)."""
    key = init_storage()
    if not key:
        return None, "application/octet-stream"
    
    try:
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60
        )
        resp.raise_for_status()
        return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
    except Exception as e:
        logger.error(f"Download failed: {e}")
        return None, "application/octet-stream"

MIME_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg", 
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "pdf": "application/pdf",
    "json": "application/json",
}

def get_mime_type(filename: str) -> str:
    """Get MIME type from filename extension"""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "bin"
    return MIME_TYPES.get(ext, "application/octet-stream")
