"""province_capacity 表：各省装机量（MW）。"""

from datetime import datetime, timezone

from sqlalchemy import BigInteger, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class ProvinceCapacity(Base):
    __tablename__ = "province_capacity"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    province_code: Mapped[str] = mapped_column(String(6), index=True)
    year: Mapped[int] = mapped_column(Integer, index=True)
    month: Mapped[int] = mapped_column(Integer, default=0, index=True)  # 0 = 年度汇总
    thermal_mw: Mapped[int] = mapped_column(BigInteger, default=0)  # 火电
    hydro_mw: Mapped[int] = mapped_column(BigInteger, default=0)  # 水电
    wind_mw: Mapped[int] = mapped_column(BigInteger, default=0)  # 风电
    pv_mw: Mapped[int] = mapped_column(BigInteger, default=0)  # 光伏
    nuclear_mw: Mapped[int] = mapped_column(BigInteger, default=0)  # 核电
    other_mw: Mapped[int] = mapped_column(BigInteger, default=0)  # 其它
    total_mw: Mapped[int] = mapped_column(BigInteger, default=0)  # 总装机
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
