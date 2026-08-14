"""省间交易查询接口：GET /api/trade?year=&month=&from_province=&to_province="""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.trade import InterProvinceTrade
from backend.schemas.trade import TradeItem, TradeResponse
from backend.services.provinces import province_name

router = APIRouter(prefix="/api/trade", tags=["trade"])


@router.get("", response_model=TradeResponse)
def list_trade(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    from_province: str | None = Query(None, description="送端省份编码"),
    to_province: str | None = Query(None, description="受端省份编码"),
    db: Session = Depends(get_db),
) -> TradeResponse:
    stmt = select(InterProvinceTrade).where(
        InterProvinceTrade.year == year,
        InterProvinceTrade.month == month,
    )
    if from_province:
        stmt = stmt.where(InterProvinceTrade.from_province_code == from_province)
    if to_province:
        stmt = stmt.where(InterProvinceTrade.to_province_code == to_province)
    rows = db.execute(stmt).scalars().all()

    items = [
        TradeItem(
            from_province_code=r.from_province_code,
            from_province_name=province_name(r.from_province_code),
            to_province_code=r.to_province_code,
            to_province_name=province_name(r.to_province_code),
            year=r.year,
            month=r.month,
            avg_price_yuan_mwh=float(r.avg_price_yuan_mwh or 0),
            trade_volume_mwh=int(r.trade_volume_mwh or 0),
            channel_id=r.channel_id,
        )
        for r in rows
    ]
    return TradeResponse(data=items, total=len(items))
