# -*- coding: utf-8 -*-
"""青海 数据导入（自包含脚本）。

数据提取自 docs/各省数据2025/青海.md，人工核对后固化于此；md 更新后请同步本脚本。
写入 frontend/public/data/{capacity,price,energy}.json（整省替换）。

用法:
    uv run python scripts/provinces/qinghai.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CODE, NAME = "630000", "青海"


def _save(dataset: str, items: list) -> None:
    path = ROOT / "frontend" / "public" / "data" / f"{dataset}.json"
    doc = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {"items": []}
    doc["items"] = [i for i in doc["items"] if i.get("province_code") != CODE]
    doc["items"].extend(items)
    path.write_text(json.dumps(doc, ensure_ascii=False), encoding="utf-8")
    print(f"{NAME} {dataset}: {len(items)} 条")


# ===== 装机（2025 年度，MW；来源：https://www.cpnn.com.cn/news/dianli2023/202601/t20260123_186）=====
CAPACITY = dict(year=2025, thermal_mw=4198, hydro_mw=18000, wind_mw=14800, pv_mw=42000, nuclear_mw=0, other_mw=297, total_mw=79295, source_url='https://www.cpnn.com.cn/news/dianli2023/202601/t20260123_1862238.html')

# ===== 电价（2025 年，元/MWh；None=未披露。行：(月, 现货, 中长期, 最高, 最低)。来源：https://www.ditan.com/news/hot/7972.html）=====
PRICES = [
    (1, None, 220.0, None, None),
    (2, None, 218.0, None, None),
    (3, None, 225.0, None, None),
    (4, None, 228.0, None, None),
    (5, 118.5, 230.0, None, None),
    (6, None, 224.0, None, None),
    (7, 222.4, 222.0, None, None),
    (8, 215.2, 226.0, None, None),
    (9, None, 230.0, None, None),
    (10, None, 228.0, None, None),
    (11, 220.0, 225.0, None, None),
    (12, 225.0, 223.0, None, None),]

# ===== 电量（GWh；None=未披露。行：(月, 发电量, 用电量, 跨省受入, 跨省送出)。来源：http://tjj.qinghai.gov.cn/）=====
ENERGY = [
    (0, 10632, 10682, 18160, 38700),  # 年度（受入/送出=逐月外购/外送表加总，部分月份为估算，md §四）
    (1, 964, 912, None, None),
    (2, 883, 865, None, None),
    (3, 925, 863, None, None),
    (4, 968, 861, None, None),
    (5, 1001, 869, None, None),
    (6, 1181, 824, None, None),
    (7, 1297, 849, None, None),
    (8, 1050, 900, None, None),
    (9, 939, 845, None, None),
    (10, 920, 850, None, None),
    (11, 941, 890, None, None),
    (12, 964, 1153, None, None),]

# ===== 年度发电结构（GWh：火/水/风/光/核；None=未提供）=====
GEN_STRUCTURE = None
PRICE_LIMITS = {"default": {"spot": {"floor": 80, "cap": 650}, "mlt": {"floor": 80, "cap": 284}}}  # 青海.md

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
                                source_url='https://www.ditan.com/news/hot/7972.html'))
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
                  source_url='http://tjj.qinghai.gov.cn/')
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
