"""灌入 mock 装机数据用于前端开发（Phase 2）。

用法:
    uv run python scripts/seed_mock_capacity.py

生成 34 个省级行政区 × {2024, 2025} 年度汇总的装机数据，按区域电源结构拆分
火/水/风/光/核/其它。数值为量级合理的模拟值，非真实统计数据。
"""

import sys
from pathlib import Path

# 将项目根目录加入 sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete  # noqa: E402

from backend.database import SessionLocal  # noqa: E402
from backend.models.capacity import ProvinceCapacity  # noqa: E402
from backend.services.provinces import PROVINCES  # noqa: E402

# 各省 2024 年总装机（GW，量级合理估算）
TOTAL_GW_2024: dict[str, int] = {
    "110000": 15, "120000": 20, "130000": 110, "140000": 130, "150000": 240,
    "210000": 75, "220000": 60, "230000": 75,
    "310000": 40, "320000": 195, "330000": 130, "340000": 120, "350000": 85,
    "360000": 80, "370000": 230,
    "410000": 130, "420000": 115, "430000": 85,
    "440000": 200, "450000": 75, "460000": 16,
    "500000": 35, "510000": 135, "520000": 95, "530000": 130, "540000": 8,
    "610000": 100, "620000": 95, "630000": 55, "640000": 75, "650000": 160,
    "710000": 60, "810000": 12, "820000": 1,
}

# 区域 -> (火, 水, 风, 光, 核, 其它) 占比
REGION_MIX: dict[str, tuple[float, float, float, float, float, float]] = {
    "东北": (0.70, 0.06, 0.12, 0.09, 0.00, 0.03),
    "华北": (0.74, 0.03, 0.10, 0.10, 0.00, 0.03),
    "西北": (0.42, 0.05, 0.23, 0.27, 0.00, 0.03),
    "华东": (0.60, 0.04, 0.08, 0.16, 0.08, 0.04),
    "华中": (0.58, 0.18, 0.07, 0.13, 0.00, 0.04),
    "西南": (0.34, 0.40, 0.08, 0.13, 0.00, 0.05),
    "华南": (0.55, 0.09, 0.10, 0.15, 0.07, 0.04),
    "港澳台": (0.70, 0.02, 0.03, 0.05, 0.18, 0.02),
}


def split_sources(total_mw: int, region: str) -> dict[str, int]:
    t, h, w, p, n, o = REGION_MIX.get(region, REGION_MIX["华北"])
    thermal = round(total_mw * t)
    hydro = round(total_mw * h)
    wind = round(total_mw * w)
    pv = round(total_mw * p)
    nuclear = round(total_mw * n)
    # 其它吸收取整误差，保证各项之和等于 total
    other = total_mw - (thermal + hydro + wind + pv + nuclear)
    return {
        "thermal_mw": thermal,
        "hydro_mw": hydro,
        "wind_mw": wind,
        "pv_mw": pv,
        "nuclear_mw": nuclear,
        "other_mw": max(other, 0),
    }


def main() -> None:
    db = SessionLocal()
    try:
        db.execute(delete(ProvinceCapacity))
        count = 0
        for code, (_name, region) in PROVINCES.items():
            base = TOTAL_GW_2024.get(code, 30) * 1000  # GW -> MW
            for year in (2024, 2025):
                total_mw = round(base * (1.0 if year == 2024 else 1.10))
                sources = split_sources(total_mw, region)
                # 2025 年风光占比提升（能源转型）
                if year == 2025:
                    shift = round(total_mw * 0.03)
                    sources["pv_mw"] += shift
                    sources["thermal_mw"] = max(sources["thermal_mw"] - shift, 0)
                db.add(
                    ProvinceCapacity(
                        province_code=code,
                        year=year,
                        month=0,
                        total_mw=sum(sources.values()),
                        source_url="mock://seed",
                        **sources,
                    )
                )
                count += 1
        db.commit()
        print(f"已灌入 mock 装机数据：{len(PROVINCES)} 省 × 2 年 = {count} 行")
    finally:
        db.close()


if __name__ == "__main__":
    main()
