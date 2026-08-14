"""装机量接口的 Pydantic Schema（响应）。"""

from datetime import datetime

from pydantic import BaseModel


class CapacityItem(BaseModel):
    province_code: str
    province_name: str
    year: int
    month: int
    thermal_mw: int
    hydro_mw: int
    wind_mw: int
    pv_mw: int
    nuclear_mw: int
    other_mw: int
    total_mw: int
    source_url: str | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class CapacitySummary(BaseModel):
    national_total_mw: int
    thermal_ratio: float  # 火电占比
    renewable_ratio: float  # 可再生（水+风+光）占比


class CapacityResponse(BaseModel):
    data: list[CapacityItem]
    total: int
    summary: CapacitySummary
