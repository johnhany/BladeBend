"""province_price 表：各省月度电价（元/MWh）。"""

from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class ProvincePrice(Base):
    __tablename__ = "province_price"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    province_code: Mapped[str] = mapped_column(String(6), index=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    month: Mapped[int] = mapped_column(Integer, index=True)
    spot_avg_yuan_mwh: Mapped[float] = mapped_column(Numeric(10, 2), default=0)  # 现货均价
    medium_long_avg_yuan_mwh: Mapped[float] = mapped_column(Numeric(10, 2), default=0)  # 中长期均价
    spot_high_yuan_mwh: Mapped[float] = mapped_column(Numeric(10, 2), default=0)  # 现货最高
    spot_low_yuan_mwh: Mapped[float] = mapped_column(Numeric(10, 2), default=0)  # 现货最低
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
