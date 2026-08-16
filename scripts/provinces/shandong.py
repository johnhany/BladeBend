# -*- coding: utf-8 -*-
"""山东 数据导入（自包含脚本）。

数据提取自 docs/各省数据2025/山东.md，人工核对后固化于此；md 更新后请同步本脚本。
写入 frontend/public/data/{capacity,price,energy}.json（整省替换）。

用法:
    uv run python scripts/provinces/shandong.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CODE, NAME = "370000", "山东"


def _save(dataset: str, items: list) -> None:
    path = ROOT / "frontend" / "public" / "data" / f"{dataset}.json"
    doc = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {"items": []}
    doc["items"] = [i for i in doc["items"] if i.get("province_code") != CODE]
    doc["items"].extend(items)
    path.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    print(f"{NAME} {dataset}: {len(items)} 条")


# ===== 装机（2025 年度，MW；来源：md 内见各节来源说明）=====
CAPACITY = dict(year=2025, thermal_mw=121270, hydro_mw=4070, wind_mw=30130, pv_mw=94850, nuclear_mw=4184, other_mw=14000, total_mw=268504, source_url=None)

# ===== 电价（2025 年，元/MWh；None=未披露。行：(月, 现货, 中长期, 最高, 最低)。来源：None）=====
PRICES = [
    (1, 370.0, None, None, None),
    (2, 259.1, None, None, None),
    (3, 262.2, None, None, None),
    (4, 283.6, None, None, None),
    (5, 310.4, None, None, None),
    (6, 294.6, None, None, None),
    (7, 329.4, None, None, None),
    (8, 357.8, None, None, None),
    (9, 342.4, None, None, None),
    (10, 369.1, None, None, None),
    (11, 289.2, None, None, None),
    (12, 252.3, None, None, None),]

# ===== 电量（GWh；None=未披露。行：(月, 发电量, 用电量, 跨省受入, 跨省送出)。来源：None）=====
ENERGY = [
    (0, 613330, 868460, 168590, None),  # 年度（受入=2025接纳省外电量，md §4.1）
    (1, None, 60759, None, None),
    (2, None, 55650, None, None),
    (3, 49710, 70600, None, None),
    (4, 45800, None, None, None),
    (5, 46280, None, None, None),
    (6, 50790, None, None, None),
    (7, 56930, None, None, None),
    (8, 56360, None, None, None),
    (9, 50350, None, None, None),
    (10, 44710, None, None, None),
    (11, 49220, None, None, None),
    (12, 53600, None, None, None),]

# ===== 年度发电结构（GWh：火/水/风/光/核；None=未提供）=====
GEN_STRUCTURE = None
PRICE_LIMITS = None  # 市场限价（元/MWh）：{月: {"spot"/"mlt": {"floor","cap"}}}；未配置则不判定异常
ANNUAL_SPOT = None  # 官方年度均价 (值, 样本月数)，如 (277.56, 4)；None=未披露
ANNUAL_MLT = None
BENCHMARK = None  # 燃煤基准价（元/MWh）
EXTRA_STATS = []  # 年度补充统计 [{label, value}]


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
                                source_url=None))
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
                  source_url=None)
        if month == 0 and GEN_STRUCTURE:
            t, h, w, p, n = GEN_STRUCTURE
            it.update(gen_thermal_gwh=t, gen_hydro_gwh=h, gen_wind_gwh=w, gen_pv_gwh=p, gen_nuclear_gwh=n)
        if month == 0 and (BENCHMARK is not None or EXTRA_STATS):
            it["benchmark_price_yuan_mwh"] = BENCHMARK
            it["extra_stats"] = EXTRA_STATS or None
        energy_items.append(it)

    _save("energy", energy_items)


if __name__ == "__main__":
    main()
