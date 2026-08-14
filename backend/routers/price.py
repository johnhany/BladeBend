"""电价查询接口。

- GET /api/price?year=&month=&type=spot|medium_long  —— 某月全部省份电价（地图用）
- GET /api/price/history?province_code=&months=       —— 某省最近 N 个月电价（折线图用）
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.price import ProvincePrice
from backend.schemas.price import (
    PriceHistoryPoint,
    PriceHistoryResponse,
    PriceItem,
    PriceResponse,
    anomaly_of,
)
from backend.services.provinces import province_name

router = APIRouter(prefix="/api/price", tags=["price"])


def _to_item(r: ProvincePrice) -> PriceItem:
    spot_avg = float(r.spot_avg_yuan_mwh or 0)
    mlt_avg = float(r.medium_long_avg_yuan_mwh or 0)
    spot_high = float(r.spot_high_yuan_mwh or 0)
    spot_low = float(r.spot_low_yuan_mwh or 0)
    is_anomaly, reason = anomaly_of(spot_low, spot_high)
    return PriceItem(
        province_code=r.province_code,
        province_name=province_name(r.province_code),
        year=r.year,
        month=r.month,
        spot_avg_yuan_mwh=spot_avg,
        medium_long_avg_yuan_mwh=mlt_avg,
        spot_high_yuan_mwh=spot_high,
        spot_low_yuan_mwh=spot_low,
        is_anomaly=is_anomaly,
        anomaly_reason=reason,
        source_url=r.source_url,
    )


@router.get("", response_model=PriceResponse)
def list_price(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    type: str = Query("spot", pattern="^(spot|medium_long)$", description="指标类型（响应含两种均价）"),
    db: Session = Depends(get_db),
) -> PriceResponse:
    rows = db.execute(
        select(ProvincePrice).where(ProvincePrice.year == year, ProvincePrice.month == month)
    ).scalars().all()
    items = [_to_item(r) for r in rows]
    return PriceResponse(data=items, total=len(items))


@router.get("/history", response_model=PriceHistoryResponse)
def price_history(
    province_code: str = Query(..., description="省份编码，如 440000"),
    months: int = Query(12, ge=1, le=36),
    db: Session = Depends(get_db),
) -> PriceHistoryResponse:
    rows = (
        db.execute(
            select(ProvincePrice)
            .where(ProvincePrice.province_code == province_code)
            .order_by(ProvincePrice.year.desc(), ProvincePrice.month.desc())
            .limit(months)
        )
        .scalars()
        .all()
    )
    if not rows:
        raise HTTPException(status_code=404, detail=f"无 {province_code} 的电价数据")
    points = [
        PriceHistoryPoint(
            year=r.year,
            month=r.month,
            spot_avg_yuan_mwh=float(r.spot_avg_yuan_mwh or 0),
            medium_long_avg_yuan_mwh=float(r.medium_long_avg_yuan_mwh or 0),
            spot_high_yuan_mwh=float(r.spot_high_yuan_mwh or 0),
            spot_low_yuan_mwh=float(r.spot_low_yuan_mwh or 0),
            is_anomaly=is_a,
            anomaly_reason=reason,
        )
        for r in rows
        for is_a, reason in [anomaly_of(float(r.spot_low_yuan_mwh or 0), float(r.spot_high_yuan_mwh or 0))]
    ]
    points.reverse()  # 时间升序，便于折线图
    return PriceHistoryResponse(
        province_code=province_code,
        province_name=province_name(province_code),
        data=points,
    )
