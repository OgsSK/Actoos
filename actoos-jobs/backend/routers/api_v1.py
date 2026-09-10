# backend/routers/api_v1.py
import os
import asyncio
from datetime import datetime
from typing import Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
import httpx

from api_keys import get_api_key_context, require_scope, ApiKeyContext


HTTP_TIMEOUT = 10.0

# Champs autorisés pour le tri (whitelist sécurité)
SORTABLE_JOB_FIELDS = {"created_at", "published_at", "salary_min", "salary_max", "title"}
SORTABLE_APP_FIELDS = {"created_at", "updated_at"}
JOB_STATUSES = {"draft", "active", "published", "paused", "closed", "expired", "archived"}
APPLICATION_STATUSES = {
    "pending", "viewed", "shortlisted", "interview",
    "accepted", "rejected", "completed", "withdrawn",
    "archived", "hired",
}

# Client httpx partagé (connection pooling)
_http_client = httpx.Client(
    timeout=HTTP_TIMEOUT,
    limits=httpx.Limits(
        max_keepalive_connections=20,
        max_connections=100,
        keepalive_expiry=60.0,
    ),
)


def _sb_url() -> str:
    return os.getenv("SUPABASE_URL") or ""


def _sb_key() -> str:
    return os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""


def _headers(extra: dict = None) -> dict:
    key = _sb_key()
    h = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if extra:
        h.update(extra)
    return h


def _safe_json(resp: httpx.Response):
    try:
        return resp.json()
    except Exception:
        return None


def _parse_total(resp: httpx.Response) -> Optional[int]:
    """Récupère le total depuis le header Content-Range (PostgREST)."""
    content_range = resp.headers.get("content-range", "")
    if "/" in content_range:
        try:
            return int(content_range.split("/")[-1])
        except (ValueError, IndexError):
            return None
    return None


router = APIRouter(prefix="/api/v1", tags=["Public API"])


# ============================================================
# LOG HELPER (fire & forget)
# ============================================================
def log_request(ctx: ApiKeyContext, request: Request, status_code: int):
    """Enregistre la requête SANS bloquer la réponse client."""
    async def _do():
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: _http_client.post(
                f"{_sb_url()}/rest/v1/api_requests",
                json={
                    "api_key_id": ctx.key_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": status_code,
                    "ip": request.client.host if request.client else None,
                    "user_agent": request.headers.get("user-agent"),
                },
                headers={**_headers(), "Prefer": "return=minimal"},
            ))
        except Exception:
            pass

    try:
        asyncio.create_task(_do())
    except RuntimeError:
        pass


def _set_rate_limit_headers(response: Response, limit: int):
    """Ajoute les headers standards X-RateLimit-* (attendus par les clients)."""
    response.headers["X-RateLimit-Limit"] = str(limit)


# ============================================================
# JOBS
# ============================================================
@router.get(
    "/jobs",
    summary="Lister les offres",
    description=(
        "Retourne la liste paginée des offres de votre entreprise.\n\n"
        "**Filtres** : `status`, `contract_type`, `city_id`, `experience_level`, "
        "`is_remote`, `is_urgent`, `search`, `created_after`, `created_before`.\n\n"
        "**Tri** : `sort` (`created_at`, `published_at`, `salary_min`, `salary_max`, `title`) "
        "et `order` (`asc` ou `desc`).\n\n"
        "**Comptage** : ajoutez `?count=true` pour obtenir le nombre total de résultats."
    ),
)
async def list_jobs(
    request: Request,
    response: Response,
    status: Optional[str] = Query(None, description="Statut de l'offre"),
    contract_type: Optional[str] = Query(None, description="CDI, CDD, stage, alternance, freelance"),
    city_id: Optional[str] = Query(None, description="ID de la ville"),
    experience_level: Optional[str] = Query(None, description="junior, mid, senior, lead"),
    is_remote: Optional[bool] = Query(None, description="Offres en télétravail"),
    is_urgent: Optional[bool] = Query(None, description="Offres urgentes"),
    search: Optional[str] = Query(None, description="Recherche dans le titre"),
    created_after: Optional[str] = Query(None, description="Date ISO 8601 (ex : 2025-01-01)"),
    created_before: Optional[str] = Query(None, description="Date ISO 8601 (ex : 2025-12-31)"),
    sort: str = Query("created_at", description="Champ de tri"),
    order: Literal["asc", "desc"] = Query("desc", description="Ordre de tri"),
    limit: int = Query(20, le=100, ge=1, description="Nombre max de résultats (max 100)"),
    offset: int = Query(0, ge=0, description="Décalage pour la pagination"),
    count: bool = Query(False, description="Inclure le total dans la réponse"),
    ctx: ApiKeyContext = Depends(require_scope("read")),
):
    if sort not in SORTABLE_JOB_FIELDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort field. Allowed: {sorted(SORTABLE_JOB_FIELDS)}",
        )
    if status and status not in JOB_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {sorted(JOB_STATUSES)}",
        )

    select = (
        "id,title,description,contract_type,experience_level,"
        "salary_min,salary_max,salary_period,city_id,address,"
        "is_remote,is_urgent,status,created_at,published_at,"
        "expires_at,skills_required,positions_count"
    )

    filters = [f"company_id=eq.{ctx.company_id}"]
    if status:
        filters.append(f"status=eq.{status}")
    if contract_type:
        filters.append(f"contract_type=eq.{contract_type}")
    if city_id:
        filters.append(f"city_id=eq.{city_id}")
    if experience_level:
        filters.append(f"experience_level=eq.{experience_level}")
    if is_remote is not None:
        filters.append(f"is_remote=eq.{str(is_remote).lower()}")
    if is_urgent is not None:
        filters.append(f"is_urgent=eq.{str(is_urgent).lower()}")
    if search:
        filters.append(f"title=ilike.*{search}*")
    if created_after:
        filters.append(f"created_at=gte.{created_after}")
    if created_before:
        filters.append(f"created_at=lte.{created_before}")

    query = "&".join(filters)
    url = (
        f"{_sb_url()}/rest/v1/jobs"
        f"?{query}"
        f"&select={select}"
        f"&order={sort}.{order}"
        f"&offset={offset}&limit={limit}"
    )

    extra = {"Prefer": "count=exact"} if count else None
    try:
        resp = _http_client.get(url, headers=_headers(extra))
    except httpx.TimeoutException:
        log_request(ctx, request, 504)
        raise HTTPException(status_code=504, detail="Upstream timeout")

    if resp.status_code != 200:
        log_request(ctx, request, 500)
        raise HTTPException(status_code=500, detail="Failed to fetch jobs")

    log_request(ctx, request, 200)
    _set_rate_limit_headers(response, ctx.rate_limit)

    result = {
        "data": _safe_json(resp) or [],
        "limit": limit,
        "offset": offset,
        "sort": sort,
        "order": order,
    }
    if count:
        result["total"] = _parse_total(resp)

    return result


@router.get(
    "/jobs/{job_id}",
    summary="Récupérer une offre",
    description="Retourne les détails complets d'une offre appartenant à votre entreprise.",
)
async def get_job(
    job_id: str,
    request: Request,
    response: Response,
    ctx: ApiKeyContext = Depends(require_scope("read")),
):
    try:
        resp = _http_client.get(
            f"{_sb_url()}/rest/v1/jobs"
            f"?id=eq.{job_id}&company_id=eq.{ctx.company_id}&select=*&limit=1",
            headers=_headers(),
        )
    except httpx.TimeoutException:
        log_request(ctx, request, 504)
        raise HTTPException(status_code=504, detail="Upstream timeout")

    data = _safe_json(resp)
    if resp.status_code != 200 or not data:
        log_request(ctx, request, 404)
        raise HTTPException(status_code=404, detail="Job not found")

    log_request(ctx, request, 200)
    _set_rate_limit_headers(response, ctx.rate_limit)
    return {"data": data[0]}


@router.post(
    "/jobs",
    status_code=201,
    summary="Créer une offre",
    description=(
        "Crée une nouvelle offre. Champs obligatoires : `title`, `description`, "
        "`contract_type`, `category_id`.\n\n"
        "Par défaut, l'offre est créée en **draft**. Passez `\"status\": \"published\"` "
        "dans le payload pour la publier directement."
    ),
)
async def create_job(
    request: Request,
    response: Response,
    payload: dict,
    ctx: ApiKeyContext = Depends(require_scope("write")),
):
    required = ["title", "description", "contract_type", "category_id"]
    missing = [f for f in required if not payload.get(f)]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing fields: {missing}")

    requested_status = payload.get("status", "draft")
    if requested_status not in JOB_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {sorted(JOB_STATUSES)}",
        )

    job_data = {
        **payload,
        "company_id": ctx.company_id,
        "status": requested_status,
    }
    if requested_status == "published":
        job_data["published_at"] = datetime.utcnow().isoformat()

    try:
        resp = _http_client.post(
            f"{_sb_url()}/rest/v1/jobs",
            json=job_data,
            headers={**_headers(), "Prefer": "return=representation"},
        )
    except httpx.TimeoutException:
        log_request(ctx, request, 504)
        raise HTTPException(status_code=504, detail="Upstream timeout")

    if resp.status_code not in (200, 201):
        log_request(ctx, request, 500)
        raise HTTPException(status_code=500, detail="Failed to create job")

    log_request(ctx, request, 201)
    _set_rate_limit_headers(response, ctx.rate_limit)
    return {"data": (_safe_json(resp) or [{}])[0]}


@router.patch(
    "/jobs/{job_id}",
    summary="Modifier une offre",
    description="Met à jour partiellement une offre. Seuls les champs fournis sont modifiés.",
)
async def update_job(
    job_id: str,
    request: Request,
    response: Response,
    payload: dict,
    ctx: ApiKeyContext = Depends(require_scope("write")),
):
    try:
        check = _http_client.get(
            f"{_sb_url()}/rest/v1/jobs"
            f"?id=eq.{job_id}&company_id=eq.{ctx.company_id}&select=id&limit=1",
            headers=_headers(),
        )
    except httpx.TimeoutException:
        log_request(ctx, request, 504)
        raise HTTPException(status_code=504, detail="Upstream timeout")

    if check.status_code != 200 or not _safe_json(check):
        log_request(ctx, request, 404)
        raise HTTPException(status_code=404, detail="Job not found")

    for field in ("id", "company_id", "created_at"):
        payload.pop(field, None)

    if payload.get("status") == "published":
        payload["published_at"] = datetime.utcnow().isoformat()

    try:
        resp = _http_client.patch(
            f"{_sb_url()}/rest/v1/jobs?id=eq.{job_id}",
            json=payload,
            headers={**_headers(), "Prefer": "return=representation"},
        )
    except httpx.TimeoutException:
        log_request(ctx, request, 504)
        raise HTTPException(status_code=504, detail="Upstream timeout")

    log_request(ctx, request, 200)
    _set_rate_limit_headers(response, ctx.rate_limit)
    data = _safe_json(resp)
    return {"data": data[0] if data else None}


@router.delete(
    "/jobs/{job_id}",
    summary="Supprimer une offre",
    description="Supprime définitivement une offre. Nécessite le scope `write`.",
)
async def delete_job(
    job_id: str,
    request: Request,
    response: Response,
    ctx: ApiKeyContext = Depends(require_scope("write")),
):
    try:
        check = _http_client.get(
            f"{_sb_url()}/rest/v1/jobs"
            f"?id=eq.{job_id}&company_id=eq.{ctx.company_id}&select=id&limit=1",
            headers=_headers(),
        )
    except httpx.TimeoutException:
        log_request(ctx, request, 504)
        raise HTTPException(status_code=504, detail="Upstream timeout")

    if check.status_code != 200 or not _safe_json(check):
        log_request(ctx, request, 404)
        raise HTTPException(status_code=404, detail="Job not found")

    try:
        _http_client.delete(
            f"{_sb_url()}/rest/v1/jobs?id=eq.{job_id}",
            headers=_headers(),
        )
    except httpx.TimeoutException:
        log_request(ctx, request, 504)
        raise HTTPException(status_code=504, detail="Upstream timeout")

    log_request(ctx, request, 204)
    _set_rate_limit_headers(response, ctx.rate_limit)
    return {"success": True}


# ============================================================
# APPLICATIONS
# ============================================================
@router.get(
    "/applications",
    summary="Lister les candidatures",
    description=(
        "Retourne les candidatures reçues sur les offres de votre entreprise.\n\n"
        "**Filtres** : `status`, `job_id`.\n"
        "**Tri** : `sort` (`created_at`, `updated_at`), `order`.\n"
        "**Pagination** : `limit`, `offset`.\n"
        "**Comptage** : `?count=true`."
    ),
)
async def list_applications(
    request: Request,
    response: Response,
    status: Optional[str] = Query(None),
    job_id: Optional[str] = Query(None),
    sort: str = Query("created_at"),
    order: Literal["asc", "desc"] = Query("desc"),
    limit: int = Query(20, le=100, ge=1),
    offset: int = Query(0, ge=0),
    count: bool = Query(False),
    ctx: ApiKeyContext = Depends(require_scope("read")),
):
    if sort not in SORTABLE_APP_FIELDS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort field. Allowed: {sorted(SORTABLE_APP_FIELDS)}",
        )
    if status and status not in APPLICATION_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {sorted(APPLICATION_STATUSES)}",
        )

    if job_id:
        try:
            job_check = _http_client.get(
                f"{_sb_url()}/rest/v1/jobs"
                f"?id=eq.{job_id}&company_id=eq.{ctx.company_id}&select=id&limit=1",
                headers=_headers(),
            )
        except httpx.TimeoutException:
            log_request(ctx, request, 504)
            raise HTTPException(status_code=504, detail="Upstream timeout")

        if not _safe_json(job_check):
            log_request(ctx, request, 403)
            raise HTTPException(status_code=403, detail="Job does not belong to your company")

        filters = [f"job_id=eq.{job_id}"]
    else:
        try:
            jobs_resp = _http_client.get(
                f"{_sb_url()}/rest/v1/jobs"
                f"?company_id=eq.{ctx.company_id}&select=id",
                headers=_headers(),
            )
        except httpx.TimeoutException:
            log_request(ctx, request, 504)
            raise HTTPException(status_code=504, detail="Upstream timeout")

        job_ids = [j["id"] for j in (_safe_json(jobs_resp) or [])]
        if not job_ids:
            log_request(ctx, request, 200)
            _set_rate_limit_headers(response, ctx.rate_limit)
            return {"data": [], "limit": limit, "offset": offset, "total": 0}

        ids_str = ",".join(job_ids)
        filters = [f"job_id=in.({ids_str})"]

    if status:
        filters.append(f"status=eq.{status}")

    select = "id,job_id,candidate_id,status,created_at,updated_at,cover_letter"
    query = "&".join(filters)
    url = (
        f"{_sb_url()}/rest/v1/applications"
        f"?{query}"
        f"&select={select}"
        f"&order={sort}.{order}"
        f"&offset={offset}&limit={limit}"
    )

    extra = {"Prefer": "count=exact"} if count else None
    try:
        resp = _http_client.get(url, headers=_headers(extra))
    except httpx.TimeoutException:
        log_request(ctx, request, 504)
        raise HTTPException(status_code=504, detail="Upstream timeout")

    log_request(ctx, request, 200)
    _set_rate_limit_headers(response, ctx.rate_limit)

    result = {
        "data": _safe_json(resp) or [],
        "limit": limit,
        "offset": offset,
    }
    if count:
        result["total"] = _parse_total(resp)

    return result


@router.get(
    "/applications/{app_id}",
    summary="Récupérer une candidature",
    description="Retourne les détails d'une candidature.",
)
async def get_application(
    app_id: str,
    request: Request,
    response: Response,
    ctx: ApiKeyContext = Depends(require_scope("read")),
):
    try:
        resp = _http_client.get(
            f"{_sb_url()}/rest/v1/applications"
            f"?id=eq.{app_id}&select=*&limit=1",
            headers=_headers(),
        )
    except httpx.TimeoutException:
        log_request(ctx, request, 504)
        raise HTTPException(status_code=504, detail="Upstream timeout")

    data = _safe_json(resp)
    if resp.status_code != 200 or not data:
        log_request(ctx, request, 404)
        raise HTTPException(status_code=404, detail="Application not found")

    app_data = data[0]

    try:
        job_check = _http_client.get(
            f"{_sb_url()}/rest/v1/jobs"
            f"?id=eq.{app_data['job_id']}"
            f"&company_id=eq.{ctx.company_id}&select=id&limit=1",
            headers=_headers(),
        )
    except httpx.TimeoutException:
        log_request(ctx, request, 504)
        raise HTTPException(status_code=504, detail="Upstream timeout")

    if not _safe_json(job_check):
        log_request(ctx, request, 403)
        raise HTTPException(status_code=403, detail="Access denied")

    log_request(ctx, request, 200)
    _set_rate_limit_headers(response, ctx.rate_limit)
    return {"data": app_data}


@router.patch(
    "/applications/{app_id}",
    summary="Changer le statut d'une candidature",
    description=(
        "Modifie le statut d'une candidature.\n\n"
        "**Statuts autorisés** : `pending`, `viewed`, `shortlisted`, `interview`, "
        "`accepted`, `rejected`, `completed`, `withdrawn`, `archived`, `hired`."
    ),
)
async def update_application_status(
    app_id: str,
    request: Request,
    response: Response,
    payload: dict,
    ctx: ApiKeyContext = Depends(require_scope("write")),
):
    new_status = payload.get("status")
    if new_status not in APPLICATION_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {sorted(APPLICATION_STATUSES)}",
        )

    try:
        app_res = _http_client.get(
            f"{_sb_url()}/rest/v1/applications"
            f"?id=eq.{app_id}&select=job_id&limit=1",
            headers=_headers(),
        )
    except httpx.TimeoutException:
        log_request(ctx, request, 504)
        raise HTTPException(status_code=504, detail="Upstream timeout")

    app_data = _safe_json(app_res)
    if not app_data:
        log_request(ctx, request, 404)
        raise HTTPException(status_code=404, detail="Application not found")

    try:
        job_check = _http_client.get(
            f"{_sb_url()}/rest/v1/jobs"
            f"?id=eq.{app_data[0]['job_id']}"
            f"&company_id=eq.{ctx.company_id}&select=id&limit=1",
            headers=_headers(),
        )
    except httpx.TimeoutException:
        log_request(ctx, request, 504)
        raise HTTPException(status_code=504, detail="Upstream timeout")

    if not _safe_json(job_check):
        log_request(ctx, request, 403)
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        resp = _http_client.patch(
            f"{_sb_url()}/rest/v1/applications?id=eq.{app_id}",
            json={"status": new_status, "updated_at": datetime.utcnow().isoformat()},
            headers={**_headers(), "Prefer": "return=representation"},
        )
    except httpx.TimeoutException:
        log_request(ctx, request, 504)
        raise HTTPException(status_code=504, detail="Upstream timeout")

    log_request(ctx, request, 200)
    _set_rate_limit_headers(response, ctx.rate_limit)
    data = _safe_json(resp)
    return {"data": data[0] if data else None}


# ============================================================
# COMPANY INFO
# ============================================================
@router.get(
    "/company",
    summary="Informations de l'entreprise",
    description="Retourne les informations de l'entreprise associée à la clé API.",
)
async def get_company(
    request: Request,
    response: Response,
    ctx: ApiKeyContext = Depends(require_scope("read")),
):
    # ✅ Réutilise les données déjà chargées (cache) par api_keys.py
    log_request(ctx, request, 200)
    _set_rate_limit_headers(response, ctx.rate_limit)
    return {"data": ctx.company if ctx.company else None}