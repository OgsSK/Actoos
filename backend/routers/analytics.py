"""
Analytics routes
"""
from fastapi import APIRouter, Depends

from auth import require_admin
from dependencies import db
from analytics_service import (
    get_revenue_analytics, get_intervention_analytics, get_technician_performance,
    get_client_analytics, get_devis_analytics, get_trend_data
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/revenue")
async def revenue_analytics(period: str = "month", current_user: dict = Depends(require_admin)):
    """Get revenue analytics"""
    return await get_revenue_analytics(db, current_user["entreprise_id"], period)


@router.get("/interventions")
async def intervention_analytics(period: str = "month", current_user: dict = Depends(require_admin)):
    """Get intervention analytics"""
    return await get_intervention_analytics(db, current_user["entreprise_id"], period)


@router.get("/technicians")
async def technician_analytics(period: str = "month", current_user: dict = Depends(require_admin)):
    """Get technician performance analytics"""
    return await get_technician_performance(db, current_user["entreprise_id"], period)


@router.get("/clients")
async def client_analytics(period: str = "month", current_user: dict = Depends(require_admin)):
    """Get client analytics"""
    return await get_client_analytics(db, current_user["entreprise_id"], period)


@router.get("/devis")
async def devis_analytics(period: str = "month", current_user: dict = Depends(require_admin)):
    """Get devis analytics"""
    return await get_devis_analytics(db, current_user["entreprise_id"], period)


@router.get("/trends")
async def trends_analytics(period: str = "month", current_user: dict = Depends(require_admin)):
    """Get trend data for charts"""
    return await get_trend_data(db, current_user["entreprise_id"], period)


@router.get("/summary")
async def summary_analytics(period: str = "month", current_user: dict = Depends(require_admin)):
    """Get complete analytics summary"""
    revenue = await get_revenue_analytics(db, current_user["entreprise_id"], period)
    interventions = await get_intervention_analytics(db, current_user["entreprise_id"], period)
    technicians = await get_technician_performance(db, current_user["entreprise_id"], period)
    clients = await get_client_analytics(db, current_user["entreprise_id"], period)
    devis = await get_devis_analytics(db, current_user["entreprise_id"], period)
    trends = await get_trend_data(db, current_user["entreprise_id"], period)
    
    return {
        "revenue": revenue,
        "interventions": interventions,
        "technicians": technicians,
        "clients": clients,
        "devis": devis,
        "trends": trends
    }
