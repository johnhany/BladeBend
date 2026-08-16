# -*- coding: utf-8 -*-
"""河流数据构建：Natural Earth 1:10m 河流中心线 → 中国边界空间裁剪 + 分级过滤 → rivers.json。

用法（需 shapely）:
    uv run --extra dev python scripts/build_rivers.py

输入:
    data/raw/ne_rivers.geojson        NE 河流中心线（构建时下载一次）
    data/raw/china_boundary.geojson   中国国界多边形（DataV 100000.json）
输出: frontend/public/data/rivers.json（+ data/rivers.json 归档副本）

处理:
- 用中国边界多边形与河流线做 shapely 相交：河流在国境线处精确截断，
  与地图省份范围完全一致（不出现境外河段悬在空白背景上）
- scalerank ≤ 7（1-3 干流 / 4-5 大支流 / 6-7 次级支流）
- 坐标保留 3 位小数（~110m 精度）
"""
import json
from pathlib import Path

from shapely.geometry import LineString, MultiLineString, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "raw" / "ne_rivers.geojson"
SRC_BOUNDARY = ROOT / "data" / "raw" / "china_boundary.geojson"
OUTS = [ROOT / "frontend" / "public" / "data" / "rivers.json", ROOT / "data" / "rivers.json"]

MAX_RANK = 7
MIN_POINTS = 4  # 裁剪后至少 4 个点才保留

# 主要河流英文名 → 中文名（用于图上标注；未映射的使用 name_en）
CN_NAMES = {
    "Yangtze": "长江", "Huang He": "黄河", "Yellow": "黄河", "Pearl": "珠江",
    "Xi Jiang": "西江", "Xi": "西江", "Amur": "黑龙江", "Songhua": "松花江",
    "Sungari": "松花江", "Huai": "淮河", "Hai": "海河",
    "Yarlung Tsangpo": "雅鲁藏布江", "Brahmaputra": "雅鲁藏布江", "Za": "雅鲁藏布江",
    "Dihang": "雅鲁藏布江", "Damqogkanbab": "雅鲁藏布江",
    "Mekong": "澜沧江", "Lancang": "澜沧江", "Salween": "怒江", "Nu Jiang": "怒江",
    "Nu": "怒江", "Nmai": "怒江", "Tarim": "塔里木河", "Yarkant": "叶尔羌河",
    "Liao": "辽河", "Xiliao": "西辽河", "Han": "汉江", "Xiang": "湘江",
    "Gan": "赣江", "Jialing": "嘉陵江", "Min": "岷江", "Dadu": "大渡河",
    "Yalong": "雅砻江", "Wu": "乌江", "Yuan": "沅江", "Ussuri": "乌苏里江",
    "Wusuli": "乌苏里江", "Nen": "嫩江", "Irtysh": "额尔齐斯河", "Ili": "伊犁河",
    "Ile": "伊犁河", "Künes": "巩乃斯河", "Tao": "洮河", "Wei": "渭河",
    "Fen": "汾河", "Qiantang": "钱塘江", "Fuchun": "富春江", "Yongding": "永定河",
    "Dongjiang": "东江", "Dong": "东江", "Beijiang": "北江", "Han Shui": "汉江",
    "Grand Canal": "京杭大运河", "Ergun": "额尔古纳河", "Hailar": "海拉尔河",
    "Tongtian": "通天河", "Tuotuo": "沱沱河", "Hongshui": "红水河",
    "Nanpan": "南盘江", "Red": "红河", "Sanggan": "桑干河", "Wujia": "乌加河",
    "Hudi": "湖白河", "Shiquan": "狮泉河", "Indus": "狮泉河", "Sutlej": "象泉河",
    "Sapt": "象泉河", "Konqi": "孔雀河", "Buh": "布哈河", "Quan": "泉江",
    "Xun": "寻乌水", "Yong": "右江", "You": "右江", "Yu": "郁江",
    "Xar Moron": "西拉木伦河", "Song’acha": "松阿察河", "Bei": "北江",
    "Mamas": "玛玛河", "Ghäghara": "格尔纳利河", "Huang": "湟水",
}


def load_china_polygon():
    doc = json.loads(SRC_BOUNDARY.read_text(encoding="utf-8"))
    if doc.get("type") == "FeatureCollection":
        geoms = [make_valid(shape(f["geometry"])) for f in doc["features"] if f.get("geometry")]
        return make_valid(unary_union(geoms))
    g = shape(doc["geometry"] if doc.get("type") == "Feature" else doc)
    return make_valid(g)


def main() -> None:
    for p in (SRC, SRC_BOUNDARY):
        if not p.exists():
            raise SystemExit(f"缺少源数据 {p}")
    china = load_china_polygon()
    data = json.loads(SRC.read_text(encoding="utf-8"))

    rivers = []
    for f in data["features"]:
        p = f.get("properties", {})
        rank = p.get("scalerank")
        if rank is None or rank > MAX_RANK:
            continue
        geom_type = f["geometry"]["type"]
        if geom_type not in ("LineString", "MultiLineString"):
            continue
        line = shape(f["geometry"])
        if line.is_empty:
            continue
        inside = line.intersection(china)
        parts = inside.geoms if isinstance(inside, MultiLineString) else [inside]
        name_en = p.get("name_en") or p.get("name") or ""
        cn = CN_NAMES.get(name_en, "")
        for part in parts:
            if part.geom_type != "LineString" or part.is_empty:
                continue
            pts = [[round(x, 3), round(y, 3)] for x, y in part.coords]
            # 去重连续重复点
            dedup = [pts[0]]
            for pt in pts[1:]:
                if pt != dedup[-1]:
                    dedup.append(pt)
            if len(dedup) < MIN_POINTS:
                continue
            rivers.append({
                "name": cn or name_en,
                "name_en": name_en,
                "cn_named": bool(cn),
                "rank": rank,
                "points": dedup,
            })

    doc = {"rivers": rivers, "total": len(rivers)}
    for out in OUTS:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
        print(f"写入 {len(rivers)} 条河段 → {out.relative_to(ROOT)}")

    named = {}
    for r in rivers:
        if r["cn_named"]:
            named[r["name"]] = named.get(r["name"], 0) + 1
    print("中文名河段:", sum(named.values()), "|", "、".join(sorted(named)))
    by_rank = {}
    for r in rivers:
        by_rank[r["rank"]] = by_rank.get(r["rank"], 0) + 1
    print("rank 分布:", json.dumps(by_rank, sort_keys=True))
    # 越境校验：所有点应落在中国范围（lng 73.5~135.1, lat 3.4~53.6）
    bad = [pt for r in rivers for pt in r["points"]
           if not (73.4 <= pt[0] <= 135.2 and 3.3 <= pt[1] <= 53.7)]
    print("越界点数(应≈0):", len(bad))


if __name__ == "__main__":
    main()
