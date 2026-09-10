# backend/api_keys.py
import hashlib
import secrets
import os
import time
import asyncio
from datetime import datetime, timedelta
from typing import Optional, List

import httpx
from fastapi import Header, HTTPException, Depends, Request, status


HTTP_TIMEOUT = 10.0

# ============================================================
# CLIENT HTTPX PARTAGÉ (connection pooling)
# ============================================================
_http_client = httpx.Client(
    timeout=HTTP_TIMEOUT,
    limits=httpx.Limits(
        max_keepalive_connections=20,
        max_connections=100,
        keepalive_expiry=60.0,
    ),
)

# ============================================================
# CACHE MÉMOIRE (TTL configurable)
# ============================================================
_cache_keys: dict = {}       # key_hash -> (key_data, expire_at)
_cache_companies: dict = {}  # company_id -> (company_data, expire_at)
_cache_rate: dict = {}       # api_key_id -> (count, expire_at)
CACHE_TTL_PRO = 60
CACHE_TTL_BUSINESS = 300
RATE_CACHE_TTL = 5


def _sb_url() -> str:
    return os.getenv("SUPABASE_URL") or ""


def _sb_key() -> str:
    return os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""


def _headers() -> dict:
    key = _sb_key()
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def _safe_json(resp: httpx.Response):
    try:
        return resp.json()
    except Exception:
        return None


def generate_api_key(environment: str = "live") -> tuple[str, str, str]:
    """
    Retourne (full_key, key_prefix, key_hash)
    - full_key : à montrer UNE SEULE FOIS au client
    - key_prefix : pour l'affichage (ex: act_live_a3f9b2)
    - key_hash : à stocker en base
    """
    prefix = "act_live_" if environment == "live" else "act_test_"
    random_part = secrets.token_urlsafe(32)
    full_key = f"{prefix}{random_part}"
    key_prefix = full_key[:16]
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    return full_key, key_prefix, key_hash


def hash_key(full_key: str) -> str:
    return hashlib.sha256(full_key.encode()).hexdigest()


class ApiKeyContext:
    def __init__(self, key_id: str, company_id: str, scopes: List[str],
                 rate_limit: int, plan: str, company: dict = None):
        self.key_id = key_id
        self.company_id = company_id
        self.scopes = scopes
        self.rate_limit = rate_limit
        self.plan = plan
        self.company = company or {}


async def get_api_key_context(
    request: Request,
    authorization: Optional[str] = Header(None),
) -> ApiKeyContext:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header. Expected: Bearer <api_key>",
            headers={"WWW-Authenticate": "Bearer"},
        )

    full_key = authorization.replace("Bearer ", "").strip()
    if not (full_key.startswith("act_live_") or full_key.startswith("act_test_")):
        raise HTTPException(status_code=401, detail="Invalid API key format")

    key_hash = hash_key(full_key)
    now = time.time()

    # ============================================================
    # 1) CLÉ API (avec cache)
    # ============================================================
    key_data = None
    cached = _cache_keys.get(key_hash)
    if cached and cached[1] > now:
        key_data = cached[0]
    else:
        try:
            resp = _http_client.get(
                f"{_sb_url()}/rest/v1/api_keys"
                f"?key_hash=eq.{key_hash}&revoked_at=is.null&select=*&limit=1",
                headers=_headers(),
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Auth service timeout")

        key_data_list = _safe_json(resp)
        if resp.status_code != 200 or not key_data_list:
            raise HTTPException(status_code=401, detail="Invalid or revoked API key")

        key_data = key_data_list[0]
        # Cache initial (sera écrasé après avoir connu le plan)
        _cache_keys[key_hash] = (key_data, now + CACHE_TTL_PRO)

    # ============================================================
    # 2) ENTREPRISE (avec cache)
    # ============================================================
    company = None
    cached_comp = _cache_companies.get(key_data['company_id'])
    if cached_comp and cached_comp[1] > now:
        company = cached_comp[0]
    else:
        try:
            comp_resp = _http_client.get(
                f"{_sb_url()}/rest/v1/companies"
                f"?id=eq.{key_data['company_id']}&select=*&limit=1",
                headers=_headers(),
            )
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Auth service timeout")

        comp_list = _safe_json(comp_resp)
        if comp_resp.status_code != 200 or not comp_list:
            raise HTTPException(status_code=403, detail="Company not found")

        company = comp_list[0]
        # Cache initial (sera ajusté après avoir connu le plan)
        _cache_companies[key_data['company_id']] = (company, now + CACHE_TTL_PRO)

    if not company.get("is_active"):
        raise HTTPException(status_code=403, detail="Company is suspended")

    plan = company.get("subscription_plan", "free")
    if plan not in ("pro", "business", "enterprise"):
        raise HTTPException(
            status_code=403,
            detail="API access requires a Pro or Business plan",
        )

    # ============================================================
    # ✅ CACHE ADAPTÉ AU PLAN (Pro = 60s, Business = 300s)
    # ============================================================
    ttl = CACHE_TTL_BUSINESS if plan in ("business", "enterprise") else CACHE_TTL_PRO
    _cache_keys[key_hash] = (key_data, now + ttl)
    _cache_companies[key_data['company_id']] = (company, now + ttl)

    # Expiration de la clé
    if key_data.get("expires_at"):
        try:
            exp = datetime.fromisoformat(key_data["expires_at"].replace("Z", "+00:00"))
            if exp < datetime.now(exp.tzinfo):
                raise HTTPException(status_code=401, detail="API key has expired")
        except ValueError:
            pass

    # ============================================================
    # 3) RATE LIMIT (avec cache 5s)
    # ============================================================
    rate_limit = key_data.get("rate_limit_per_minute") or 60
    cache_key = f"rate:{key_data['id']}"
    cached_rate = _cache_rate.get(cache_key)

    if cached_rate and cached_rate[1] > now:
        current_count = cached_rate[0]
    else:
        one_minute_ago = (datetime.utcnow() - timedelta(minutes=1)).isoformat()
        current_count = 0
        try:
            count_resp = _http_client.get(
                f"{_sb_url()}/rest/v1/api_requests"
                f"?api_key_id=eq.{key_data['id']}&created_at=gte.{one_minute_ago}"
                f"&select=id",
                headers={**_headers(), "Prefer": "count=exact"},
            )
            content_range = count_resp.headers.get("content-range", "")
            if "/" in content_range:
                try:
                    current_count = int(content_range.split("/")[-1])
                except Exception:
                    current_count = 0
        except httpx.TimeoutException:
            current_count = 0

        _cache_rate[cache_key] = (current_count, now + RATE_CACHE_TTL)

    if current_count >= rate_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded ({rate_limit} req/min)",
        )

    # ============================================================
    # 4) UPDATE last_used_at (fire & forget)
    # ============================================================
    ip = request.client.host if request.client else None

    async def _update_last_used():
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: _http_client.patch(
                f"{_sb_url()}/rest/v1/api_keys?id=eq.{key_data['id']}",
                json={
                    "last_used_at": datetime.utcnow().isoformat(),
                    "last_used_ip": ip,
                    "request_count": (key_data.get("request_count") or 0) + 1,
                },
                headers=_headers(),
            ))
        except Exception:
            pass

    asyncio.create_task(_update_last_used())

    return ApiKeyContext(
        key_id=key_data["id"],
        company_id=key_data["company_id"],
        scopes=key_data.get("scopes") or ["read"],
        rate_limit=rate_limit,
        plan=plan,
        company=company,
    )
def require_scope(scope: str):
    async def _check(ctx: ApiKeyContext = Depends(get_api_key_context)):
        if scope not in ctx.scopes:
            raise HTTPException(status_code=403, detail=f"Missing required scope: {scope}")
        return ctx
    return _check