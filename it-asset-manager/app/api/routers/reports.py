from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import require_role
from app.schemas.role import RoleName
from app.services import report_service, budget_service
from app.schemas.financial import FinancialReport, FinancialSummary
from app.core.logging import log_activity

router = APIRouter()

class ExportRequest(BaseModel):
    fields: List[str]
    filters: Optional[Dict[str, Any]] = None

@router.get("/stats")
@log_activity
async def get_report_stats(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role(RoleName.it))
):
    return await report_service.get_log_statistics(db)

@router.get("/financials", response_model=FinancialReport)
@log_activity
async def get_financial_report(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role(RoleName.it))
):
    total_valuation = await budget_service.get_total_valuation(db)
    monthly_stats = await budget_service.get_financial_summary(db)
    
    summary = FinancialSummary(
        total_valuation=total_valuation,
        current_month_total=monthly_stats["current_month_total"],
        previous_month_total=monthly_stats["previous_month_total"],
        change_percentage=monthly_stats["change_percentage"]
    )
    
    spend_by_category = await budget_service.get_cost_by_type(db)
    spend_by_vendor = await budget_service.get_vendor_spend(db)
    spending_trends = await budget_service.get_spending_trends(db, period='month')
    
    # Sort trends by period (YYYY-MM) just in case, though SQL does it.
    # Keep last 12 entries
    if len(spending_trends) > 12:
        spending_trends = spending_trends[-12:]
        
    return FinancialReport(
        summary=summary,
        spend_by_category=spend_by_category,
        spend_by_vendor=spend_by_vendor,
        spending_trends=spending_trends
    )

@router.post("/export/{entity_type}")
@log_activity
async def export_data(
    entity_type: str,
    request: ExportRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role(RoleName.it))
):
    if entity_type not in ["asset", "user", "log"]:
        raise HTTPException(status_code=400, detail="Invalid entity type")
        
    csv_content = await report_service.generate_csv_export(
        db, entity_type, request.fields, request.filters
    )
    
    response = StreamingResponse(
        iter([csv_content]),
        media_type="text/csv"
    )
    response.headers["Content-Disposition"] = f"attachment; filename={entity_type}_export.csv"
    return response
