# -*- coding: utf-8 -*-
"""跨区域受送电年度连线数据：docs/各省数据2025 中「明确给出送端省 → 受端省年度总电量」的记录。

用法:
    uv run python scripts/build_flows.py

仅收录年度级、省到省的明确电量（月度/单次交易、区域级汇总不收录）。
连线在地图上以下偏弧线呈现，与输电通道（上偏弧）区分。
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend" / "public" / "data" / "flows.json"

NAME_TO_CODE = {
    "北京": "110000", "天津": "120000", "河北": "130000", "山西": "140000", "内蒙古": "150000",
    "辽宁": "210000", "吉林": "220000", "黑龙江": "230000", "上海": "310000", "江苏": "320000",
    "浙江": "330000", "安徽": "340000", "福建": "350000", "江西": "360000", "山东": "370000",
    "河南": "410000", "湖北": "420000", "湖南": "430000", "广东": "440000", "广西": "450000",
    "海南": "460000", "重庆": "500000", "四川": "510000", "贵州": "520000", "云南": "530000",
    "西藏": "540000", "陕西": "610000", "甘肃": "620000", "青海": "630000", "宁夏": "640000",
    "新疆": "650000",
}

# (送端, 受端, 年度电量GWh, 通道/说明, 来源)
FLOWS = [
    ("新疆", "安徽", 69871, "昌吉—古泉±1100kV直流（准皖直流）", "新疆.md §4.1 / 安徽.md §4.1"),
    ("新疆", "河南", 45924, "哈密南—郑州±800kV直流", "新疆.md §4.1"),
    ("新疆", "重庆", 11751, "哈密—重庆±800kV直流", "新疆.md §4.1"),
]


def main() -> None:
    flows = [
        {
            "from_province": f, "from_code": NAME_TO_CODE[f],
            "to_province": t, "to_code": NAME_TO_CODE[t],
            "volume_gwh": v, "label": label, "source": src,
        }
        for f, t, v, label, src in FLOWS
    ]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"flows": flows}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"写入 {len(flows)} 条年度受送电连线 → {OUT.relative_to(ROOT)}")
    for f in flows:
        print(f"  {f['from_province']} → {f['to_province']}: {f['volume_gwh']:,} GWh（{f['label']}）")


if __name__ == "__main__":
    main()
