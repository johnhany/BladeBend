"""把 SQLite 中现有（mock）数据一次性导出为前端静态 JSON。

用法:
    uv run python scripts/export_db_to_static.py

说明：方案调整后前端不再依赖后端 API，直接加载 frontend/public/data/*.json。
本脚本用于把既有 mock 数据迁移到静态文件；后续各指标数据将由
parse_channels.py 这类 Markdown 解析脚本生成（用户提供整理好的 Markdown）。
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select  # noqa: E402

from backend.database import SessionLocal  # noqa: E402
from backend.models.capacity import ProvinceCapacity  # noqa: E402
from backend.models.price import ProvincePrice  # noqa: E402
from backend.models.trade import InterProvinceTrade  # noqa: E402
from backend.schemas.price import anomaly_of  # noqa: E402
from backend.services.provinces import province_name  # noqa: E402

OUT_DIR = Path(__file__).resolve().parents[1] / "frontend" / "public" / "data"


def export_capacity(db) -> list[dict]:
    rows = db.execute(select(ProvinceCapacity)).scalars().all()
    return [
        {
            "province_code": r.province_code,
            "province_name": province_name(r.province_code),
            "year": r.year,
            "month": r.month,
            "thermal_mw": r.thermal_mw,
            "hydro_mw": r.hydro_mw,
            "wind_mw": r.wind_mw,
            "pv_mw": r.pv_mw,
            "nuclear_mw": r.nuclear_mw,
            "other_mw": r.other_mw,
            "total_mw": r.total_mw,
            "source_url": r.source_url,
        }
        for r in rows
    ]


def export_price(db) -> list[dict]:
    rows = db.execute(select(ProvincePrice)).scalars().all()
    return [
        {
            "province_code": r.province_code,
            "province_name": province_name(r.province_code),
            "year": r.year,
            "month": r.month,
            "spot_avg_yuan_mwh": float(r.spot_avg_yuan_mwh or 0),
            "medium_long_avg_yuan_mwh": float(r.medium_long_avg_yuan_mwh or 0),
            "spot_high_yuan_mwh": float(r.spot_high_yuan_mwh or 0),
            "spot_low_yuan_mwh": float(r.spot_low_yuan_mwh or 0),
            "is_anomaly": is_a,
            "anomaly_reason": reason,
            "source_url": r.source_url,
        }
        for r in rows
        for is_a, reason in [anomaly_of(float(r.spot_low_yuan_mwh or 0), float(r.spot_high_yuan_mwh or 0))]
    ]


def export_trade(db) -> list[dict]:
    rows = db.execute(select(InterProvinceTrade)).scalars().all()
    return [
        {
            "from_province_code": r.from_province_code,
            "from_province_name": province_name(r.from_province_code),
            "to_province_code": r.to_province_code,
            "to_province_name": province_name(r.to_province_code),
            "year": r.year,
            "month": r.month,
            "avg_price_yuan_mwh": float(r.avg_price_yuan_mwh or 0),
            "trade_volume_mwh": int(r.trade_volume_mwh or 0),
            "channel_id": r.channel_id,
        }
        for r in rows
    ]


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    db = SessionLocal()
    try:
        datasets = {
            "capacity.json": export_capacity(db),
            "price.json": export_price(db),
            "trade.json": export_trade(db),
        }
    finally:
        db.close()
    for name, items in datasets.items():
        path = OUT_DIR / name
        path.write_text(json.dumps({"items": items}, ensure_ascii=False), encoding="utf-8")
        print(f"导出 {path.name}: {len(items)} 条")


if __name__ == "__main__":
    main()
