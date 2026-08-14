"""装机量查询接口：GET /api/capacity?year=&month="""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.capacity import ProvinceCapacity
from backend.schemas.capacity import CapacityItem, CapacityResponse, CapacitySummary
from backend.services.provinces import province_name

router = APIRouter(prefix="/api/capacity", tags=["capacity"])


@router.get("", response_model=CapacityResponse)
def list_capacity(
    year: int = Query(..., description="年份，如 2025"),
    month: int | None = Query(None, ge=0, le=12, description="月份 1-12；省略返回年度汇总(month=0)"),
    db: Session = Depends(get_db),
) -> CapacityResponse:
    target_month = 0 if month is None else month
    stmt = select(ProvinceCapacity).where(
        ProvinceCapacity.year == year,
        ProvinceCapacity.month == target_month,
    )
    rows = db.execute(stmt).scalars().all()

    items = [
        CapacityItem(
            province_code=r.province_code,
            province_name=province_name(r.province_code),
            year=r.year,
            month=r.month,
            thermal_mw=r.thermal_mw,
            hydro_mw=r.hydro_mw,
            wind_mw=r.wind_mw,
            pv_mw=r.pv_mw,
            nuclear_mw=r.nuclear_mw,
            other_mw=r.other_mw,
            total_mw=r.total_mw,
            source_url=r.source_url,
            updated_at=r.updated_at,
        )
        for r in rows
    ]

    national_total = sum(i.total_mw for i in items)
    thermal = sum(i.thermal_mw for i in items)
    renewable = sum(i.hydro_mw + i.wind_mw + i.pv_mw for i in items)
    summary = CapacitySummary(
        national_total_mw=national_total,
        thermal_ratio=round(thermal / national_total, 4) if national_total else 0.0,
        renewable_ratio=round(renewable / national_total, 4) if national_total else 0.0,
    )
    return CapacityResponse(data=items, total=len(items), summary=summary)
