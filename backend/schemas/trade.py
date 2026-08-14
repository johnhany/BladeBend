"""省间交易接口的 Pydantic Schema（响应）。"""

from pydantic import BaseModel


class TradeItem(BaseModel):
    from_province_code: str
    from_province_name: str
    to_province_code: str
    to_province_name: str
    year: int
    month: int
    avg_price_yuan_mwh: float
    trade_volume_mwh: int
    channel_id: str | None = None


class TradeResponse(BaseModel):
    data: list[TradeItem]
    total: int
