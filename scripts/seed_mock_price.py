"""灌入 mock 电价数据用于前端开发（Phase 3）。

用法:
    uv run python scripts/seed_mock_price.py

生成 34 个省级行政区 × 2024-01 ~ 2025-12（24 个月）的现货/中长期月度均价。
含少量负电价与触顶样本，用于验证地图异常标注与折线图 MarkPoint。
数值为量级合理的模拟值，非真实统计数据。
"""

import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete  # noqa: E402

from backend.database import SessionLocal  # noqa: E402
from backend.models.price import ProvincePrice  # noqa: E402
from backend.services.provinces import PROVINCES  # noqa: E402

rng = random.Random(20250814)

# 区域 -> 现货均价基准（元/MWh）
REGION_SPOT_BASE = {
    "华东": 430, "华南": 410, "华中": 380, "西南": 300,
    "华北": 330, "东北": 300, "西北": 200, "港澳台": 450,
}
# 中长期基准相对平缓
MLT_BASE = 390.0

# 新能源富集省份（负电价概率更高：三北 + 山东等光伏大省）
WIND_SOLAR_HEAVY = {"150000", "620000", "630000", "650000", "640000", "370000", "130000", "340000", "410000"}

YEARS = [(2024, m) for m in range(1, 13)] + [(2025, m) for m in range(1, 13)]


def gen_month(code: str, region: str, year: int, month: int) -> dict[str, float]:
    base = REGION_SPOT_BASE.get(region, 350)
    # 冬夏负荷高峰电价上浮
    season = 1.12 if month in (1, 2, 7, 8, 12) else (0.95 if month in (4, 5, 10) else 1.0)
    # 年度趋势：2025 略降（新能源占比提升）
    trend = 0.97 if year == 2025 else 1.0
    jitter = 1 + rng.uniform(-0.12, 0.12)

    spot_avg = base * season * trend * jitter
    mlt_avg = MLT_BASE * (1 + rng.uniform(-0.05, 0.05)) * trend

    spot_low = spot_avg * rng.uniform(0.35, 0.6)
    spot_high = spot_avg * rng.uniform(1.6, 2.4)

    # 负电价样本：新能源富集省份 ~20% 概率出现
    if code in WIND_SOLAR_HEAVY and rng.random() < 0.20:
        spot_low = -rng.uniform(15, 130)
    # 触顶样本：全网每月 ~8% 概率某省触及限价
    if rng.random() < 0.08:
        spot_high = rng.uniform(1500, 1850)

    return {
        "spot_avg_yuan_mwh": round(spot_avg, 2),
        "medium_long_avg_yuan_mwh": round(mlt_avg, 2),
        "spot_high_yuan_mwh": round(spot_high, 2),
        "spot_low_yuan_mwh": round(spot_low, 2),
    }


def main() -> None:
    db = SessionLocal()
    try:
        db.execute(delete(ProvincePrice))
        count = 0
        for code, (_name, region) in PROVINCES.items():
            for year, month in YEARS:
                db.add(ProvincePrice(province_code=code, year=year, month=month, source_url="mock://seed", **gen_month(code, region, year, month)))
                count += 1
        db.commit()
        print(f"已灌入 mock 电价数据：{len(PROVINCES)} 省 × {len(YEARS)} 月 = {count} 行")
    finally:
        db.close()


if __name__ == "__main__":
    main()
