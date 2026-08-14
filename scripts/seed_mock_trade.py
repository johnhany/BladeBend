"""灌入 mock 省间交易数据用于前端开发（Phase 4）。

用法:
    uv run python scripts/seed_mock_trade.py

为 data/channels.json 中的每条通道 × 2024-01 ~ 2025-12 生成月度送电均价与电量。
数值为量级合理的模拟值，非真实统计数据。
"""

import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete  # noqa: E402

from backend.database import SessionLocal  # noqa: E402
from backend.models.trade import InterProvinceTrade  # noqa: E402
from backend.services.provinces import PROVINCES  # noqa: E402

rng = random.Random(20250815)

# 省份短名 -> adcode
NAME_TO_CODE = {name: code for code, (name, _r) in PROVINCES.items()}

YEARS = [(2024, m) for m in range(1, 13)] + [(2025, m) for m in range(1, 13)]


def main() -> None:
    channels_file = Path(__file__).resolve().parents[1] / "data" / "channels.json"
    channels = json.loads(channels_file.read_text(encoding="utf-8"))["channels"]

    db = SessionLocal()
    try:
        db.execute(delete(InterProvinceTrade))
        count = 0
        for ch in channels:
            from_code = NAME_TO_CODE.get(ch["start_point"]["province"])
            to_code = NAME_TO_CODE.get(ch["end_point"]["province"])
            if not from_code or not to_code:
                print(f"跳过（省份名无法映射）: {ch['name']}")
                continue
            cap = ch["capacity_mw"]
            for year, month in YEARS:
                # 电量 ≈ 容量 × 730h × 利用率(0.45~0.65)
                volume = int(cap * 730 * rng.uniform(0.45, 0.65))
                # 送端多位于西部，送电价低于受端现货；280~420 元/MWh
                price = rng.uniform(270, 420)
                db.add(
                    InterProvinceTrade(
                        from_province_code=from_code,
                        to_province_code=to_code,
                        year=year,
                        month=month,
                        avg_price_yuan_mwh=round(price, 2),
                        trade_volume_mwh=volume,
                        channel_id=ch["id"],
                        source_url="mock://seed",
                    )
                )
                count += 1
        db.commit()
        print(f"已灌入 mock 省间交易：{len(channels)} 通道 × {len(YEARS)} 月 = {count} 行")
    finally:
        db.close()


if __name__ == "__main__":
    main()
