"""inter_province_trade 表：省间跨省交易（元/MWh、MWh）。"""

from datetime import datetime, timezone

from sqlalchemy import BigInteger, DateTime, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class InterProvinceTrade(Base):
    __tablename__ = "inter_province_trade"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    from_province_code: Mapped[str] = mapped_column(String(6), index=True)  # 送端
    to_province_code: Mapped[str] = mapped_column(String(6), index=True)  # 受端
    year: Mapped[int] = mapped_column(Integer, index=True)
    month: Mapped[int] = mapped_column(Integer, index=True)
    avg_price_yuan_mwh: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    trade_volume_mwh: Mapped[int] = mapped_column(BigInteger, default=0)
    channel_id: Mapped[str | None] = mapped_column(String(50), index=True, nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
