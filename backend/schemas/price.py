"""电价接口的 Pydantic Schema（响应）。"""

from pydantic import BaseModel

# 现货限价上限（元/MWh），触及即标记异常（参考 PRD §4.2.1 阈值思路）
PRICE_CAP_YUAN_MWH = 1500.0


def anomaly_of(spot_low: float, spot_high: float) -> tuple[bool, str | None]:
    """异常判定：负电价或触及限价上限。"""
    if spot_low is not None and spot_low < 0:
        return True, "出现负电价"
    if spot_high is not None and spot_high >= PRICE_CAP_YUAN_MWH:
        return True, "触及限价上限"
    return False, None


class PriceItem(BaseModel):
    province_code: str
    province_name: str
    year: int
    month: int
    spot_avg_yuan_mwh: float
    medium_long_avg_yuan_mwh: float
    spot_high_yuan_mwh: float
    spot_low_yuan_mwh: float
    is_anomaly: bool = False
    anomaly_reason: str | None = None
    source_url: str | None = None


class PriceResponse(BaseModel):
    data: list[PriceItem]
    total: int


class PriceHistoryPoint(BaseModel):
    year: int
    month: int
    spot_avg_yuan_mwh: float
    medium_long_avg_yuan_mwh: float
    spot_high_yuan_mwh: float
    spot_low_yuan_mwh: float
    is_anomaly: bool = False
    anomaly_reason: str | None = None


class PriceHistoryResponse(BaseModel):
    province_code: str
    province_name: str
    data: list[PriceHistoryPoint]
