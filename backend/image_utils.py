"""
Image Processing Utilities
- EXIF stripping for privacy (removes GPS coordinates)
- Image compression for storage optimization
"""
import io
import logging
from PIL import Image, ExifTags

logger = logging.getLogger(__name__)

# Maximum dimensions for resizing
MAX_WIDTH = 1920
MAX_HEIGHT = 1920
JPEG_QUALITY = 85

def strip_exif_and_compress(image_data: bytes, max_size_kb: int = 500) -> tuple[bytes, str]:
    """
    Strip EXIF data from image and optionally compress it.
    
    Args:
        image_data: Raw image bytes
        max_size_kb: Target maximum file size in KB (default 500KB)
    
    Returns:
        Tuple of (processed_image_bytes, content_type)
    """
    try:
        # Open image from bytes
        img = Image.open(io.BytesIO(image_data))
        
        # Handle RGBA images (PNG with transparency)
        if img.mode == 'RGBA':
            # Convert to RGB with white background for JPEG
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])  # Use alpha channel as mask
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Log if EXIF data was present
        exif_data = img.getexif()
        if exif_data:
            # Check for GPS data specifically
            gps_info = None
            for tag_id, value in exif_data.items():
                tag = ExifTags.TAGS.get(tag_id, tag_id)
                if tag == 'GPSInfo':
                    gps_info = value
                    break
            
            if gps_info:
                logger.info("GPS data found and will be stripped from image")
            else:
                logger.debug("EXIF data found (no GPS) and will be stripped")
        
        # Resize if too large
        width, height = img.size
        if width > MAX_WIDTH or height > MAX_HEIGHT:
            ratio = min(MAX_WIDTH / width, MAX_HEIGHT / height)
            new_size = (int(width * ratio), int(height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            logger.debug(f"Image resized from {width}x{height} to {new_size[0]}x{new_size[1]}")
        
        # Save to bytes without EXIF
        output = io.BytesIO()
        
        # Determine quality based on target size
        quality = JPEG_QUALITY
        img.save(output, format='JPEG', quality=quality, optimize=True)
        
        # If still too large, reduce quality
        while output.tell() > max_size_kb * 1024 and quality > 30:
            output = io.BytesIO()
            quality -= 10
            img.save(output, format='JPEG', quality=quality, optimize=True)
        
        result_bytes = output.getvalue()
        original_size = len(image_data) / 1024
        new_size = len(result_bytes) / 1024
        
        logger.info(f"Image processed: {original_size:.1f}KB -> {new_size:.1f}KB (quality={quality})")
        
        return result_bytes, 'image/jpeg'
        
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        # Return original if processing fails
        return image_data, 'image/jpeg'


def get_image_dimensions(image_data: bytes) -> tuple[int, int]:
    """Get image width and height without fully loading it."""
    try:
        img = Image.open(io.BytesIO(image_data))
        return img.size
    except Exception:
        return (0, 0)


def is_valid_image(image_data: bytes) -> bool:
    """Check if the data is a valid image."""
    try:
        img = Image.open(io.BytesIO(image_data))
        img.verify()
        return True
    except Exception:
        return False
