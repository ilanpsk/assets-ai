from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.db import get_db
from app.core.deps import require_role
from app.schemas.role import RoleName
from app.services import dashboard_service, budget_service
from app.core.logging import log_activity

router = APIRouter()

@router.get("/stats")
@log_activity
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    return await dashboard_service.get_stats(db)

@router.get("/budget")
@log_activity
async def get_budget_stats(
    db: AsyncSession = Depends(get_db),
    # Optional: restrict to admin/it if desired, keeping open for now to match stats
    # current_user = Depends(require_role(RoleName.admin)) 
):
    """
    Returns financial statistics including total valuation, spending trends,
    and cost breakdowns.
    """
    valuation = await budget_service.get_total_valuation(db)
    trends = await budget_service.get_spending_trends(db, period="year")
    by_type = await budget_service.get_cost_by_type(db)
    vendors = await budget_service.get_vendor_spend(db)
    forecast = await budget_service.get_replacement_forecast(db)
    
    return {
        "total_valuation": valuation,
        "spending_trends": trends,
        "cost_by_type": by_type,
        "top_vendors": vendors,
        "replacement_forecast": forecast
    }

