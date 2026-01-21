from typing import List, Callable, Optional
import logging
from datetime import datetime
from pydantic import BaseModel, Field
from langchain_core.tools import StructuredTool
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.services import budget_service

class BudgetAnalysisInput(BaseModel):
    period: str = Field(default="year", description="Time period for trends: 'year' or 'month'")

class CalculateSpendingInput(BaseModel):
    start_date: Optional[str] = Field(default=None, description="Start date in YYYY-MM-DD format")
    end_date: Optional[str] = Field(default=None, description="End date in YYYY-MM-DD format")
    asset_type: Optional[str] = Field(default=None, description="Filter by asset type name (e.g. 'Laptop')")
    vendor: Optional[str] = Field(default=None, description="Filter by vendor name")

def get_budget_tools(session_factory: Callable[[], AsyncSession], user: User) -> List[StructuredTool]:
    logger = logging.getLogger("app.ai.tools.budget")

    async def _analyze_budget(period: str = "year") -> str:
        async with session_factory() as db:
            try:
                # gather all data
                valuation = await budget_service.get_total_valuation(db)
                trends = await budget_service.get_spending_trends(db, period=period)
                by_type = await budget_service.get_cost_by_type(db)
                vendors = await budget_service.get_vendor_spend(db)
                forecast = await budget_service.get_replacement_forecast(db)
                
                return str({
                    "total_valuation": valuation,
                    "spending_trends": trends,
                    "cost_by_type": by_type,
                    "top_vendors": vendors,
                    "replacement_forecast": forecast
                })
            except Exception as e:
                logger.error(f"Budget analysis failed: {str(e)}", exc_info=True)
                return f"Error analyzing budget: {str(e)}"

    async def _calculate_spending(start_date: str = None, end_date: str = None, asset_type: str = None, vendor: str = None) -> str:
        async with session_factory() as db:
            try:
                # Parse dates
                start_dt = datetime.strptime(start_date, "%Y-%m-%d") if start_date else None
                end_dt = datetime.strptime(end_date, "%Y-%m-%d") if end_date else None
                
                total = await budget_service.get_filtered_spend(
                    db, 
                    start_date=start_dt, 
                    end_date=end_dt, 
                    asset_type=asset_type, 
                    vendor=vendor
                )
                
                msg = "Total spending"
                if asset_type:
                    msg += f" on {asset_type}"
                if vendor:
                    msg += f" from {vendor}"
                if start_date and end_date:
                    msg += f" between {start_date} and {end_date}"
                elif start_date:
                    msg += f" since {start_date}"
                elif end_date:
                    msg += f" until {end_date}"
                    
                return f"{msg}: ${total:,.2f}"
            except ValueError:
                return "Error: Dates must be in YYYY-MM-DD format."
            except Exception as e:
                logger.error(f"Spending calculation failed: {str(e)}", exc_info=True)
                return f"Error calculating spending: {str(e)}"

    return [
        StructuredTool.from_function(
            coroutine=_analyze_budget,
            name="analyze_budget",
            description="Get a comprehensive financial analysis including total valuation, spending trends, cost by type, top vendors, and replacement forecast.",
            args_schema=BudgetAnalysisInput,
        ),
        StructuredTool.from_function(
            coroutine=_calculate_spending,
            name="calculate_spending",
            description="Calculate spending with flexible filters (date range, category, vendor). Use this to answer 'how much did we spend on X in period Y'.",
            args_schema=CalculateSpendingInput,
        )
    ]

