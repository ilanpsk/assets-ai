from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class SpendByCategory(BaseModel):
    type: str
    total: float

class SpendByVendor(BaseModel):
    vendor: str
    total: float

class SpendingTrend(BaseModel):
    period: str
    total: float

class FinancialSummary(BaseModel):
    total_valuation: float
    current_month_total: float
    previous_month_total: float
    change_percentage: float

class FinancialReport(BaseModel):
    summary: FinancialSummary
    spend_by_category: List[SpendByCategory]
    spend_by_vendor: List[SpendByVendor]
    spending_trends: List[SpendingTrend]

