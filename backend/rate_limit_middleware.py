"""
Rate Limiting Middleware for ACTOOS PRO
Protects API endpoints from abuse using Redis or in-memory storage
"""
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

# Rate limit configurations by endpoint pattern
RATE_LIMITS = {
    # Auth endpoints - stricter limits
    "/api/auth/login": {"max_requests": 10, "window_seconds": 60},  # 10 per minute
    "/api/auth/register": {"max_requests": 5, "window_seconds": 60},  # 5 per minute
    "/api/auth/forgot-password": {"max_requests": 3, "window_seconds": 3600},  # 3 per hour
    "/api/auth/reset-password": {"max_requests": 5, "window_seconds": 3600},  # 5 per hour
    
    # SMS endpoints - prevent abuse
    "/api/sms/send": {"max_requests": 20, "window_seconds": 3600},  # 20 per hour
    "/api/users/invite": {"max_requests": 20, "window_seconds": 3600},  # 20 per hour
    
    # Portal endpoints - moderate limits
    "/api/portal/": {"max_requests": 60, "window_seconds": 60},  # 60 per minute
    
    # Public API - stricter
    "/api/public/": {"max_requests": 100, "window_seconds": 60},  # 100 per minute
    
    # Default for all other endpoints
    "default": {"max_requests": 200, "window_seconds": 60}  # 200 per minute
}

# Whitelist paths that should never be rate limited
WHITELIST_PATHS = [
    "/health",
    "/api/events/stream",  # SSE endpoint
    "/api/stripe/webhook",  # Stripe webhook
]


def get_rate_limit_config(path: str) -> dict:
    """Get rate limit config for a path"""
    # Check whitelist
    for whitelist_path in WHITELIST_PATHS:
        if path.startswith(whitelist_path):
            return None
    
    # Check specific limits
    for pattern, config in RATE_LIMITS.items():
        if pattern != "default" and path.startswith(pattern):
            return config
    
    return RATE_LIMITS["default"]


def get_client_identifier(request: Request) -> str:
    """Get unique identifier for rate limiting (IP + user agent)"""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"
    
    # Include user ID if authenticated
    auth_header = request.headers.get("authorization", "")
    if auth_header:
        # Just use a hash of the token as identifier
        token_hash = hash(auth_header) % 10**8
        return f"{ip}:user:{token_hash}"
    
    return f"{ip}:anon"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware using Redis or in-memory storage"""
    
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        
        # Get rate limit config for this path
        config = get_rate_limit_config(path)
        
        # Skip rate limiting if whitelisted
        if config is None:
            return await call_next(request)
        
        # Get client identifier
        client_id = get_client_identifier(request)
        rate_key = f"ratelimit:{client_id}:{path.split('/')[1:3]}"  # Group by prefix
        
        try:
            from redis_service import check_rate_limit
            allowed, remaining = await check_rate_limit(
                rate_key,
                config["max_requests"],
                config["window_seconds"]
            )
            
            if not allowed:
                logger.warning(f"Rate limit exceeded for {client_id} on {path}")
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Trop de requêtes. Veuillez réessayer plus tard.",
                        "retry_after": config["window_seconds"]
                    },
                    headers={
                        "Retry-After": str(config["window_seconds"]),
                        "X-RateLimit-Limit": str(config["max_requests"]),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(config["window_seconds"])
                    }
                )
            
            # Add rate limit headers to response
            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(config["max_requests"])
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Reset"] = str(config["window_seconds"])
            return response
            
        except Exception as e:
            # If rate limiting fails, allow the request (fail open)
            logger.warning(f"Rate limit check failed: {e}")
            return await call_next(request)
