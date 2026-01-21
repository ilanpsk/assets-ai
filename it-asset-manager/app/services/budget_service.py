from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, extract, and_
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import calendar

from app.models.asset import Asset
from app.models.asset_type import AssetType
from app.core.logging import log_activity

@log_activity
async def get_total_valuation(db: AsyncSession) -> float:
    """Calculates the total purchase value of all assets."""
    result = await db.scalar(select(func.sum(Asset.purchase_price)))
    return float(result or 0.0)

@log_activity
async def get_spending_trends(db: AsyncSession, period: str = 'year') -> List[Dict[str, Any]]:
    """
    Returns spending grouped by time period.
    Defaults to yearly.
    """
    if period == 'month':
        # Postgres specific for YYYY-MM
        # Fallback/standard SQL approach might vary, but assuming Postgres environment from context
        stmt = (
             select(
                func.to_char(Asset.purchase_date, 'YYYY-MM').label('period'),
                func.sum(Asset.purchase_price).label('total')
            )
            .where(Asset.purchase_date.isnot(None))
            .group_by('period')
            .order_by('period')
        )
    else:
        # Yearly
        stmt = (
            select(
                func.extract('year', Asset.purchase_date).label('period'),
                func.sum(Asset.purchase_price).label('total')
            )
            .where(Asset.purchase_date.isnot(None))
            .group_by('period')
            .order_by('period')
        )

    res = await db.execute(stmt)
    data = []
    for row in res.all():
        # Ensure period is string
        p_val = row.period
        if isinstance(p_val, float): # extract returns float
            p_val = str(int(p_val))
        
        data.append({
            "period": str(p_val),
            "total": float(row.total or 0.0)
        })
    return data

@log_activity
async def get_cost_by_type(db: AsyncSession) -> List[Dict[str, Any]]:
    """Breaks down costs by Asset Type."""
    stmt = (
        select(AssetType.name, func.sum(Asset.purchase_price))
        .join(Asset.asset_type)
        .where(Asset.purchase_price.isnot(None))
        .group_by(AssetType.name)
        .order_by(func.sum(Asset.purchase_price).desc())
    )
    res = await db.execute(stmt)
    return [{"type": name, "total": float(total or 0.0)} for name, total in res.all()]

@log_activity
async def get_vendor_spend(db: AsyncSession) -> List[Dict[str, Any]]:
    """Top vendors by spend."""
    stmt = (
        select(Asset.vendor, func.sum(Asset.purchase_price))
        .where(Asset.vendor.isnot(None))
        .where(Asset.purchase_price.isnot(None))
        .group_by(Asset.vendor)
        .order_by(func.sum(Asset.purchase_price).desc())
        .limit(10)
    )
    res = await db.execute(stmt)
    return [{"vendor": vendor, "total": float(total or 0.0)} for vendor, total in res.all()]

@log_activity
async def get_replacement_forecast(db: AsyncSession) -> List[Dict[str, Any]]:
    """
    Forecasts budget needs based on warranty expiration.
    Assumes replacement cost = original purchase price.
    """
    stmt = (
        select(
            func.extract('year', Asset.warranty_end).label('year'),
            func.sum(Asset.purchase_price).label('estimated_cost')
        )
        .where(Asset.warranty_end.isnot(None))
        # Only future expirations
        .where(Asset.warranty_end >= datetime.utcnow())
        .group_by('year')
        .order_by('year')
    )
    res = await db.execute(stmt)
    
    data = []
    for row in res.all():
        year_val = row.year
        if isinstance(year_val, float):
            year_val = int(year_val)
            
        data.append({
            "year": year_val,
            "estimated_cost": float(row.estimated_cost or 0.0)
        })
    return data

@log_activity
async def get_financial_summary(db: AsyncSession) -> Dict[str, Any]:
    """
    Calculates current month spend, previous month spend, and percentage change.
    """
    today = datetime.utcnow().date()
    
    # Current month range
    current_month_start = today.replace(day=1)
    # Next month start (for end of current month calculation)
    if today.month == 12:
        next_month_start = today.replace(year=today.year + 1, month=1, day=1)
    else:
        next_month_start = today.replace(month=today.month + 1, day=1)
    
    # Previous month range
    prev_month_end = current_month_start - timedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)
    
    # Query current month
    current_spend = await db.scalar(
        select(func.sum(Asset.purchase_price))
        .where(
            and_(
                Asset.purchase_date >= current_month_start,
                Asset.purchase_date < next_month_start
            )
        )
    ) or 0.0
    
    # Query previous month
    prev_spend = await db.scalar(
        select(func.sum(Asset.purchase_price))
        .where(
            and_(
                Asset.purchase_date >= prev_month_start,
                Asset.purchase_date < current_month_start
            )
        )
    ) or 0.0
    
    # Calculate percentage change
    change_pct = 0.0
    if prev_spend > 0:
        change_pct = ((float(current_spend) - float(prev_spend)) / float(prev_spend)) * 100
    elif current_spend > 0:
        change_pct = 100.0 # From 0 to something is 100% increase effectively (or undefined, but 100 indicates increase)
        
    return {
        "current_month_total": float(current_spend),
        "previous_month_total": float(prev_spend),
        "change_percentage": round(change_pct, 1)
    }

@log_activity
async def get_monthly_spend(db: AsyncSession, year: int, month: int) -> float:
    """
    Calculates total spend for a specific month and year.
    """
    stmt = select(func.sum(Asset.purchase_price)).where(
        and_(
            extract('year', Asset.purchase_date) == year,
            extract('month', Asset.purchase_date) == month
        )
    )
    result = await db.scalar(stmt)
    return float(result or 0.0)

@log_activity
async def get_filtered_spend(
    db: AsyncSession,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    asset_type: Optional[str] = None,
    vendor: Optional[str] = None
) -> float:
    """
    Calculates total spend with flexible filters.
    """
    stmt = select(func.sum(Asset.purchase_price))
    
    # If filtering by asset type, we need to join
    if asset_type:
        stmt = stmt.join(Asset.asset_type).where(AssetType.name.ilike(f"%{asset_type}%"))
    
    conditions = [Asset.purchase_price.isnot(None)]
    
    if start_date:
        conditions.append(Asset.purchase_date >= start_date)
    if end_date:
        conditions.append(Asset.purchase_date <= end_date)
    if vendor:
        conditions.append(Asset.vendor.ilike(f"%{vendor}%"))
        
    stmt = stmt.where(and_(*conditions))
    
    result = await db.scalar(stmt)
    return float(result or 0.0)
