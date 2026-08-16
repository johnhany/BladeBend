# -*- coding: utf-8 -*-
"""内蒙古 数据导入（自包含脚本）。

数据提取自 docs/各省数据2025/内蒙古.md，人工核对后固化于此；md 更新后请同步本脚本。
写入 frontend/public/data/{capacity,price,energy}.json（整省替换）。

用法:
    uv run python scripts/provinces/neimenggu.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CODE, NAME = "150000", "内蒙古"


def _save(dataset: str, items: list) -> None:
    path = ROOT / "frontend" / "public" / "data" / f"{dataset}.json"
    doc = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {"items": []}
    doc["items"] = [i for i in doc["items"] if i.get("province_code") != CODE]
    doc["items"].extend(items)
    path.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    print(f"{NAME} {dataset}: {len(items)} 条")


# ===== 装机（2025 年度，MW；来源：https://www.nmgxny.com/industry/1935.html）=====
CAPACITY = dict(year=2025, thermal_mw=126078, hydro_mw=2447, wind_mw=108768, pv_mw=60655, nuclear_mw=0, other_mw=19967, total_mw=317915, source_url='https://www.nmgxny.com/industry/1935.html')

# ===== 电价（2025 年，元/MWh；None=未披露。行：(月, 现货, 中长期, 最高, 最低)。来源：https://www.cpnn.com.cn/news/xwtt/202507/t20250722_1818148.html）=====
PRICES = [
    (1, 344.0, None, None, None),
    (2, 280.0, None, None, None),
    (3, 200.0, None, None, None),
    (4, 153.0, None, None, None),]

# ===== 电量（GWh；None=未披露。行：(月, 发电量, 用电量, 跨省受入, 跨省送出)。来源：https://www.cir.cn/R_NengYuanKuangChan/2026-07/2025Nian12YueNeiMengGuZiZhiQuFaDianLiangShuJu.html）=====
ENERGY = [
    (0, 870297, 548387, None, 356462),  # 年度（送出=全区向区外送出，md §4.1）
    (1, 74790, 47000, None, None),
    (2, 61190, 41000, None, None),
    (3, 64280, 46400, None, None),
    (4, 60500, 43000, None, None),
    (5, 62660, 44500, None, None),
    (6, 65490, 45500, None, None),
    (7, 74630, 46000, None, None),
    (8, 70220, 44800, None, None),
    (9, 62910, 44100, None, None),
    (10, 67850, 47500, None, None),
    (11, 73250, 49000, None, None),
    (12, 81100, 49590, None, None),]

# ===== 年度发电结构（GWh：火/水/风/光/核；None=未提供）=====
GEN_STRUCTURE = None
PRICE_LIMITS = None  # 市场限价（元/MWh）：{月: {"spot"/"mlt": {"floor","cap"}}}；未配置则不判定异常
ANNUAL_SPOT = None  # 官方年度均价 (值, 样本月数)，如 (277.56, 4)；None=未披露
ANNUAL_MLT = None
BENCHMARK = None  # 燃煤基准价（元/MWh；md 仅披露蒙东 303.5，蒙西未披露，不作全省基准）
EXTRA_STATS = [
    {"label": "向区外送出电量", "value": "356,462 GWh（+5.55%）"},
    {"label": "净输出电量（中电联口径）", "value": "325,100 GWh（全国第1）"},
    {"label": "其中：风光外送", "value": "101,959 GWh（占 28.61%）"},
    {"label": "特高压电网外送电量", "value": "188,554 GWh"},
    {"label": "蒙东外送电量", "value": "227,700 GWh"},
    {"label": "跨区跨省外送能力", "value": "62,600 MW（全国首位）"},
    {"label": "蒙东煤电基准价", "value": "303.5 元/MWh"},
]


def main() -> None:
    if CAPACITY:
        _save("capacity", [dict(province_code=CODE, province_name=NAME,
                                year=CAPACITY["year"], month=0, **{k: v for k, v in CAPACITY.items() if k != "year"})])
    price_items = []
    for month, spot, mlt, high, low in PRICES:
        # 限价判定：仅 PRICE_LIMITS 已配置时进行（各省限价不同，部分省允许负电价）。
        # PRICE_LIMITS 结构：{月: {"spot"/"mlt": {"floor": x, "cap": y}}} 或 {"default": {...}}
        anomaly, reason = False, None
        if PRICE_LIMITS:
            lim = PRICE_LIMITS.get(month) or PRICE_LIMITS.get("default") or {}
            sf, sc = (lim.get("spot") or lim).get("floor"), (lim.get("spot") or lim).get("cap")
            mf, mc = (lim.get("mlt") or lim).get("floor"), (lim.get("mlt") or lim).get("cap")
            if spot is not None and sf is not None and spot <= sf:
                anomaly, reason = True, f"现货触及价格下限（{sf:g} 元/MWh）"
            elif spot is not None and sc is not None and spot >= sc:
                anomaly, reason = True, f"现货触及价格上限（{sc:g} 元/MWh）"
            elif mlt is not None and mf is not None and mlt <= mf:
                anomaly, reason = True, f"中长期触及价格下限（{mf:g} 元/MWh）"
            elif mlt is not None and mc is not None and mlt >= mc:
                anomaly, reason = True, f"中长期触及价格上限（{mc:g} 元/MWh）"
        price_items.append(dict(province_code=CODE, province_name=NAME, year=2025, month=month,
                                spot_avg_yuan_mwh=spot, medium_long_avg_yuan_mwh=mlt,
                                spot_high_yuan_mwh=high, spot_low_yuan_mwh=low,
                                is_anomaly=anomaly, anomaly_reason=reason,
                                source_url='https://www.cpnn.com.cn/news/xwtt/202507/t20250722_1818148.html'))
    if ANNUAL_SPOT or ANNUAL_MLT:
        price_items.insert(0, dict(province_code=CODE, province_name=NAME, year=2025, month=0,
                                   spot_avg_yuan_mwh=ANNUAL_SPOT[0] if ANNUAL_SPOT else None,
                                   medium_long_avg_yuan_mwh=ANNUAL_MLT[0] if ANNUAL_MLT else None,
                                   spot_high_yuan_mwh=None, spot_low_yuan_mwh=None,
                                   spot_months=ANNUAL_SPOT[1] if ANNUAL_SPOT else None,
                                   mlt_months=ANNUAL_MLT[1] if ANNUAL_MLT else None,
                                   is_anomaly=False, anomaly_reason=None, source_url=None))
    _save("price", price_items)

    energy_items = []
    for month, gen, cons, recv, sent in ENERGY:
        it = dict(province_code=CODE, province_name=NAME, year=2025, month=month,
                  generation_gwh=gen, consumption_gwh=cons, received_gwh=recv, sent_gwh=sent,
                  gen_thermal_gwh=None, gen_hydro_gwh=None, gen_wind_gwh=None,
                  gen_pv_gwh=None, gen_nuclear_gwh=None,
                  source_url='https://www.cir.cn/R_NengYuanKuangChan/2026-07/2025Nian12YueNeiMengGuZiZhiQuFaDianLiangShuJu.html')
        if month == 0 and GEN_STRUCTURE:
            t, h, w, p, n = GEN_STRUCTURE
            it.update(gen_thermal_gwh=t, gen_hydro_gwh=h, gen_wind_gwh=w, gen_pv_gwh=p, gen_nuclear_gwh=n)
        if month == 0 and (BENCHMARK is not None or EXTRA_STATS):
            it["benchmark_price_yuan_mwh"] = BENCHMARK
            it["extra_stats"] = EXTRA_STATS or None
        energy_items.append(it)

    # ===== 电网分区（一区两网：蒙西/蒙东）=====
    SUBREGIONS = [{'name': '蒙西电网', 'capacity_mw': 221737.6, 'generation_gwh': 674864.0, 'prices': [{'label': '1月', 'value': 344.0, 'volume_gwh': None}, {'label': '2月', 'value': 280.0, 'volume_gwh': None}, {'label': '3月', 'value': 200.0, 'volume_gwh': None}, {'label': '4月', 'value': 153.0, 'volume_gwh': None}]}, {'name': '蒙东电网', 'capacity_mw': 71276.6, 'generation_gwh': 189623.0, 'prices': [{'label': '火电', 'value': 321.04, 'volume_gwh': 7702}, {'label': '风电', 'value': 265.1, 'volume_gwh': 22044}, {'label': '光伏', 'value': 270.39, 'volume_gwh': 3090}, {'label': '省内绿电', 'value': 305.81, 'volume_gwh': 1074}, {'label': '省间绿电', 'value': 269.52, 'volume_gwh': 1342}]}]
    for it in energy_items:
        if it["month"] == 0:
            it["subregions"] = SUBREGIONS

    _save("energy", energy_items)


if __name__ == "__main__":
    main()
