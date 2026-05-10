"""
Redis Service for ACTOOS PRO
Provides caching, pub/sub for SSE, and rate limiting support
"""
import os
import json
import asyncio
import logging
from typing import Optional, Any, Callable
from datetime import timedelta
from functools import wraps

logger = logging.getLogger(__name__)

# Redis connection
_redis_client = None
_pubsub = None
_is_connected = False

# Get Redis URL from environment (optional - falls back to in-memory if not configured)
REDIS_URL = os.environ.get("REDIS_URL", "")


async def get_redis():
    """Get Redis client instance (lazy initialization)"""
    global _redis_client, _is_connected
    
    if not REDIS_URL:
        logger.info("REDIS_URL not configured - using in-memory fallback")
        return None
    
    if _redis_client is None:
        try:
            import redis.asyncio as aioredis
            _redis_client = aioredis.from_url(
                REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            await _redis_client.ping()
            _is_connected = True
            logger.info("Redis connected successfully")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e} - using in-memory fallback")
            _redis_client = None
            _is_connected = False
    
    return _redis_client


def is_redis_available() -> bool:
    """Check if Redis is available"""
    return _is_connected


# ======================
# CACHING
# ======================

# In-memory cache fallback
_memory_cache = {}


async def cache_get(key: str) -> Optional[str]:
    """Get value from cache"""
    redis = await get_redis()
    
    if redis:
        try:
            return await redis.get(key)
        except Exception as e:
            logger.warning(f"Redis GET failed: {e}")
    
    # Fallback to memory cache
    cached = _memory_cache.get(key)
    if cached:
        if cached["expires_at"] and cached["expires_at"] < asyncio.get_event_loop().time():
            del _memory_cache[key]
            return None
        return cached["value"]
    return None


async def cache_set(key: str, value: str, ttl_seconds: int = 300):
    """Set value in cache with TTL"""
    redis = await get_redis()
    
    if redis:
        try:
            await redis.setex(key, ttl_seconds, value)
            return
        except Exception as e:
            logger.warning(f"Redis SET failed: {e}")
    
    # Fallback to memory cache
    _memory_cache[key] = {
        "value": value,
        "expires_at": asyncio.get_event_loop().time() + ttl_seconds if ttl_seconds else None
    }


async def cache_delete(key: str):
    """Delete key from cache"""
    redis = await get_redis()
    
    if redis:
        try:
            await redis.delete(key)
        except Exception as e:
            logger.warning(f"Redis DELETE failed: {e}")
    
    # Also delete from memory cache
    _memory_cache.pop(key, None)


async def cache_delete_pattern(pattern: str):
    """Delete all keys matching pattern"""
    redis = await get_redis()
    
    if redis:
        try:
            keys = await redis.keys(pattern)
            if keys:
                await redis.delete(*keys)
            return
        except Exception as e:
            logger.warning(f"Redis DELETE pattern failed: {e}")
    
    # Fallback: delete matching keys from memory cache
    keys_to_delete = [k for k in _memory_cache.keys() if pattern.replace("*", "") in k]
    for k in keys_to_delete:
        del _memory_cache[k]


def cached(ttl_seconds: int = 300, key_prefix: str = "cache"):
    """
    Decorator to cache function results
    
    Usage:
        @cached(ttl_seconds=60, key_prefix="users")
        async def get_users(entreprise_id: str):
            ...
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key from function name and arguments
            cache_key = f"{key_prefix}:{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            cached_value = await cache_get(cache_key)
            if cached_value:
                try:
                    return json.loads(cached_value)
                except (json.JSONDecodeError, TypeError):
                    pass
            
            # Call function and cache result
            result = await func(*args, **kwargs)
            
            try:
                await cache_set(cache_key, json.dumps(result, default=str), ttl_seconds)
            except (TypeError, ValueError):
                pass  # Don't fail if caching fails
            
            return result
        return wrapper
    return decorator


# ======================
# PUB/SUB FOR SSE
# ======================

# In-memory pub/sub fallback
_memory_subscribers = {}


async def publish_event(channel: str, event: dict):
    """Publish event to a channel (for multi-instance SSE sync)"""
    redis = await get_redis()
    message = json.dumps(event, default=str)
    
    if redis:
        try:
            await redis.publish(channel, message)
            return
        except Exception as e:
            logger.warning(f"Redis PUBLISH failed: {e}")
    
    # Fallback: notify in-memory subscribers
    if channel in _memory_subscribers:
        for callback in _memory_subscribers[channel]:
            try:
                await callback(event)
            except Exception as e:
                logger.warning(f"Memory subscriber callback failed: {e}")


async def subscribe_to_events(channel: str, callback: Callable):
    """Subscribe to events on a channel"""
    redis = await get_redis()
    
    if redis:
        try:
            pubsub = redis.pubsub()
            await pubsub.subscribe(channel)
            
            async def listener():
                async for message in pubsub.listen():
                    if message["type"] == "message":
                        try:
                            event = json.loads(message["data"])
                            await callback(event)
                        except Exception as e:
                            logger.warning(f"Pub/sub callback error: {e}")
            
            # Start listener in background
            asyncio.create_task(listener())
            return pubsub
        except Exception as e:
            logger.warning(f"Redis SUBSCRIBE failed: {e}")
    
    # Fallback: register in-memory subscriber
    if channel not in _memory_subscribers:
        _memory_subscribers[channel] = []
    _memory_subscribers[channel].append(callback)
    return None


# ======================
# RATE LIMITING
# ======================

# In-memory rate limit storage
_rate_limit_storage = {}


async def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
    """
    Check if request is within rate limit
    
    Returns:
        (allowed: bool, remaining: int)
    """
    redis = await get_redis()
    
    if redis:
        try:
            current = await redis.get(key)
            if current is None:
                await redis.setex(key, window_seconds, 1)
                return True, max_requests - 1
            
            count = int(current)
            if count >= max_requests:
                return False, 0
            
            await redis.incr(key)
            return True, max_requests - count - 1
        except Exception as e:
            logger.warning(f"Redis rate limit check failed: {e}")
    
    # Fallback to in-memory rate limiting
    import time
    now = time.time()
    
    if key not in _rate_limit_storage:
        _rate_limit_storage[key] = {"count": 1, "window_start": now}
        return True, max_requests - 1
    
    data = _rate_limit_storage[key]
    
    # Reset window if expired
    if now - data["window_start"] > window_seconds:
        _rate_limit_storage[key] = {"count": 1, "window_start": now}
        return True, max_requests - 1
    
    # Check limit
    if data["count"] >= max_requests:
        return False, 0
    
    data["count"] += 1
    return True, max_requests - data["count"]


async def get_rate_limit_info(key: str, max_requests: int, window_seconds: int) -> dict:
    """Get rate limit information for a key"""
    allowed, remaining = await check_rate_limit(key, max_requests + 1, window_seconds)
    # Decrement because check_rate_limit incremented
    redis = await get_redis()
    if redis:
        try:
            await redis.decr(key)
        except Exception:
            pass
    else:
        if key in _rate_limit_storage:
            _rate_limit_storage[key]["count"] -= 1
    
    return {
        "limit": max_requests,
        "remaining": remaining + 1 if allowed else 0,
        "reset_in_seconds": window_seconds
    }


# ======================
# SESSION STORAGE
# ======================

async def store_session(session_id: str, data: dict, ttl_seconds: int = 86400):
    """Store session data (24h default TTL)"""
    await cache_set(f"session:{session_id}", json.dumps(data, default=str), ttl_seconds)


async def get_session(session_id: str) -> Optional[dict]:
    """Get session data"""
    data = await cache_get(f"session:{session_id}")
    if data:
        try:
            return json.loads(data)
        except (json.JSONDecodeError, TypeError):
            pass
    return None


async def delete_session(session_id: str):
    """Delete session data"""
    await cache_delete(f"session:{session_id}")


# ======================
# CLEANUP
# ======================

async def cleanup():
    """Cleanup Redis connections"""
    global _redis_client, _pubsub
    
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
    
    _memory_cache.clear()
    _rate_limit_storage.clear()
    _memory_subscribers.clear()
