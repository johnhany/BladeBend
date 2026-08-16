"""重建前端地理数据：把内蒙古拆分为「蒙西电网 / 蒙东电网」两个区域。

用法（需 shapely）:
    uv run --extra dev python scripts/build_geo.py
    cd frontend && npx geo2topo -q 10000 provinces=- < ../data/raw/china_split.geojson > src/assets/geo/china.topojson

数据源（阿里云 DataV）：
- 100000_full.json  全国省级边界
- 150000_full.json  内蒙古 12 盟市边界

拆分规则（docs/蒙西蒙东.md）：
- 蒙东电网（国网蒙东）= 赤峰市 / 通辽市 / 兴安盟 / 呼伦贝尔市 → adcode "150000E"
- 蒙西电网（内蒙古电力集团）= 其余 8 盟市 → adcode "150000W"
各区几何为成员盟市多边形的 shapely 联合（消除内部市界）。
环方向（CW 外环）交由前端 rewindFeatureCollection 统一处理。
"""

import json
import re
import sys
import urllib.request
from pathlib import Path

from shapely.geometry import shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
OUT_GEOJSON = ROOT / "data" / "raw" / "china_split.geojson"

MENGDONG_CITIES = ["赤峰", "通辽", "兴安", "呼伦贝尔"]
# 蒙西 = 12 盟市中除蒙东外的全部（呼和浩特/包头/鄂尔多斯/乌兰察布/锡林郭勒/巴彦淖尔/乌海/阿拉善）
OLD_ADCODE = "150000"
WEST_ID, WEST_NAME = "150000W", "蒙西电网"
EAST_ID, EAST_NAME = "150000E", "蒙东电网"

URL_PROVINCES = "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json"
URL_IM_CITIES = "https://geo.datav.aliyun.com/areas_v3/bound/150000_full.json"


def fetch_json(url: str):
    print(f"下载 {url}")
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def merge_group(features, keywords, adcode, name):
    geoms = []
    used = []
    for f in features:
        cname = f["properties"].get("name", "")
        if any(k in cname for k in keywords):
            geoms.append(shape(f["geometry"]))
            used.append(cname)
    if not geoms:
        raise RuntimeError(f"未匹配到任何盟市: {name}")
    merged = unary_union(geoms)
    from shapely.geometry import mapping
    geo = mapping(merged)
    print(f"  {name}: {len(used)} 盟市 {used}，几何 {geo['type']}")
    return {
        "type": "Feature",
        "properties": {"adcode": adcode, "name": name},
        "geometry": {"type": geo["type"], "coordinates": geo["coordinates"]},
    }


def main() -> None:
    provinces = fetch_json(URL_PROVINCES)
    im_cities = fetch_json(URL_IM_CITIES)

    east = merge_group(im_cities["features"], MENGDONG_CITIES, EAST_ID, EAST_NAME)
    west_kws = [
        "呼和浩特", "包头", "鄂尔多斯", "乌兰察布", "锡林郭勒", "巴彦淖尔", "乌海", "阿拉善",
    ]
    west = merge_group(im_cities["features"], west_kws, WEST_ID, WEST_NAME)

    out_features = []
    for f in provinces["features"]:
        p = f.get("properties", {})
        code = str(p.get("adcode", ""))
        if code == OLD_ADCODE:
            continue  # 内蒙古整体由两区替代
        if code == "100000_JD" or "JD" in code:
            out_features.append(f)  # 南海诸岛要素原样保留
        elif re.fullmatch(r"\d{6}", code):
            out_features.append(f)
    out_features.extend([west, east])

    doc = {"type": "FeatureCollection", "features": out_features}
    OUT_GEOJSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_GEOJSON.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    print(f"写出 {OUT_GEOJSON.relative_to(ROOT)}：{len(out_features)} 要素（含南海诸岛）")
    print("下一步: cd frontend && npx geo2topo -q 10000 provinces=- < ../data/raw/china_split.geojson > src/assets/geo/china.topojson")


if __name__ == "__main__":
    main()
