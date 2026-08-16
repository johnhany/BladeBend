"""解析 docs/输电线路.md（Markdown 表格）→ 前端静态通道数据。

用法:
    uv run python scripts/parse_channels.py

数据流（方案调整后）：用户整理的 Markdown → 本脚本解析 → frontend/public/data/channels.json（前端静态加载）。
同步写入 data/channels.json 作为归档副本。

解析规则：
- 电压：±NNNkV → 直流(DC)；1000kV → 交流(AC)（按所在章节判定）
- 容量：优先取「万千瓦」（×10 → MW）；仅有「万千伏安」时按 0.5 功率因数折算；缺失用默认值
- 起止点：Gazetteer 地名 → 经纬度（精确匹配 → 包含匹配 → 省会兜底）
- 投运时间：YYYY年M月 → YYYY-MM
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MD_PATH = ROOT / "docs" / "输电线路.md"
OUT_FILES = [ROOT / "frontend" / "public" / "data" / "channels.json", ROOT / "data" / "channels.json"]

# ---------------------------------------------------------------------------
# 地名 -> (纬度, 经度, 省份)。覆盖文档中出现的全部站点/城市/省份。
# ---------------------------------------------------------------------------
GAZETTEER: dict[str, tuple[float, float, str]] = {
    # --- 直流换流站 ---
    "四川宜宾复龙": (28.6, 104.5, "四川"), "上海奉贤": (30.9, 121.5, "上海"),
    "四川西昌锦屏": (27.9, 102.2, "四川"), "江苏苏州": (31.3, 120.6, "江苏"),
    "四川宜宾双龙": (28.3, 103.8, "四川"), "浙江金华": (29.1, 119.6, "浙江"),
    "四川雅中": (27.4, 101.5, "四川"), "四川白鹤滩": (26.9, 102.9, "四川"),
    "西藏昌都": (31.1, 97.2, "西藏"), "四川甘孜": (30.0, 101.9, "四川"),
    "湖北黄石大冶": (30.3, 115.0, "湖北"), "湖北黄石": (30.3, 115.0, "湖北"),
    "云南普洱": (22.8, 100.9, "云南"), "广东江门": (22.6, 113.1, "广东"),
    "新疆昌吉": (44.0, 87.3, "新疆"), "安徽宣城古泉": (31.0, 118.8, "安徽"),
    "新疆哈密巴里坤": (43.6, 93.0, "新疆"), "新疆哈密": (42.8, 93.5, "新疆"),
    "河南郑州": (34.7, 113.6, "河南"), "重庆渝北": (29.7, 106.6, "重庆"),
    "甘肃酒泉祁连": (39.7, 98.5, "甘肃"), "湖南韶山": (27.8, 112.9, "湖南"),
    "甘肃庆阳": (35.7, 107.6, "甘肃"), "山东泰安": (36.2, 117.1, "山东"),
    "宁夏中卫中宁": (37.5, 105.7, "宁夏"), "湖南衡阳": (26.9, 112.6, "湖南"),
    "青海海南州": (36.3, 100.6, "青海"), "河南驻马店": (33.0, 114.0, "河南"),
    "陕北": (38.3, 109.7, "陕西"), "湖北武汉": (30.6, 114.3, "湖北"),
    "内蒙古锡林郭勒盟": (43.9, 116.0, "蒙西"), "内蒙古蒙西": (39.6, 109.0, "蒙西"),
    "江苏泰州": (32.5, 119.9, "江苏"),
    "内蒙古上海庙": (37.9, 107.3, "蒙西"), "内蒙古鄂尔多斯": (39.6, 109.8, "蒙西"),
    "山东临沂": (35.1, 118.4, "山东"), "宁夏宁东": (38.3, 106.5, "宁夏"),
    "湖北江陵": (30.3, 112.4, "湖北"), "广东博罗鹅城": (23.2, 114.3, "广东"),
    "广东博罗": (23.2, 114.3, "广东"),
    # --- 交流变电站 / 城市 ---
    "山西长治": (36.2, 113.1, "山西"), "河南南阳": (33.0, 112.5, "河南"),
    "湖北荆门": (31.0, 112.2, "湖北"), "安徽淮南": (32.6, 117.0, "安徽"),
    "浙江浙北": (30.3, 120.2, "浙江"), "福建福州": (26.1, 119.3, "福建"),
    "山东济南": (36.7, 117.0, "山东"), "天津南": (39.1, 117.2, "天津"),
    "陕西榆林": (38.3, 109.8, "陕西"), "山东潍坊": (36.7, 119.1, "山东"),
    "金沙江上游": (31.1, 97.2, "西藏"),
    # --- 省份兜底（取省会） ---
    "上海": (31.2, 121.5, "上海"), "江苏": (32.1, 118.8, "江苏"),
    "浙江": (30.3, 120.2, "浙江"), "山东": (36.7, 117.0, "山东"),
    "江西": (28.7, 115.9, "江西"), "四川": (30.6, 104.1, "四川"),
    "重庆": (29.6, 106.5, "重庆"), "湖北": (30.6, 114.3, "湖北"),
    "湖南": (28.2, 113.0, "湖南"), "河南": (34.8, 113.6, "河南"),
}

# 稳定 id（与既有 trade 数据的 channel_id 保持一致）；新通道按名称 slug 生成
CHANNEL_IDS: dict[str, str] = {
    "向家坝—上海": "xiangshang", "锦屏—苏南": "jinsu", "溪洛渡—浙江": "xizhe",
    "雅中—江西": "yazhong-jiangxi", "白鹤滩—江苏": "baihetan-jiangsu",
    "白鹤滩—浙江": "baihetan-zhejiang", "金上—湖北": "jinshang-hubei",
    "云南—广东": "yun-guang", "昌吉—古泉": "changji-guquan",
    "哈密南—郑州": "ha-nan-zhengzhou", "哈密—重庆": "hami-chongqing",
    "酒泉—湖南": "jiuquan-hunan", "陇东—山东": "longdong-shandong",
    "宁夏—湖南": "ningxia-hunan", "青海—河南": "qinghai-henan",
    "陕北—湖北": "shanbei-hubei", "锡盟—泰州": "ximeng-taizhou",
    "上海庙—山东": "zhaoyi", "宁东—浙江": "ningdong-zhejiang", "三广直流": "sanguang",
    "晋东南—南阳—荆门": "jindongnan-jingmen", "淮南—浙北—上海": "huainan-shanghai",
    "浙北—福州": "zhebei-fuzhou", "淮南—南京—上海": "huainan-nanjing-shanghai",
    "锡盟—山东": "ximeng-shandong", "蒙西—天津南": "mengxi-tianjin",
    "榆横—潍坊": "yuheng-weifang", "驻马店—武汉": "zhumadian-wuhan", "川渝特高压交流": "chuanyu",
}

# 特例覆盖：昭沂直流与上海庙—山东为同一工程，跳过昭沂；上庙通道使用合并命名
OVERRIDES: dict[str, dict] = {
    "昭沂直流": {"skip": True},
    "上海庙—山东": {"id": "zhaoyi", "name_suffix": "昭沂直流（上海庙—临沂）", "end": "山东临沂"},
}


def locate(place: str) -> tuple[float, float, str] | None:
    """地名解析：精确匹配 → 按关键词长度降序包含匹配。"""
    p = re.sub(r"[（）()]", "", place).strip()
    if p in GAZETTEER:
        return GAZETTEER[p]
    for key in sorted(GAZETTEER, key=len, reverse=True):
        if key in p:
            return GAZETTEER[key]
    return None


def parse_voltage(cell: str) -> int | None:
    m = re.search(r"±?(\d{3,4})\s*kV", cell, re.IGNORECASE)
    return int(m.group(1)) if m else None


def parse_capacity(cell: str, default: int) -> int:
    m = re.search(r"(\d+(?:\.\d+)?)\s*万千瓦", cell)
    if m:
        return int(float(m.group(1)) * 10)
    m = re.search(r"(\d+(?:\.\d+)?)\s*万千伏安", cell)
    if m:  # 按功率因数 0.5 折算 MVA -> MW
        return int(float(m.group(1)) * 10 * 0.5)
    return default


def parse_date(cell: str) -> str | None:
    m = re.search(r"(\d{4})年(\d{1,2})月", cell)
    if m:
        return f"{m.group(1)}-{int(m.group(2)):02d}"
    m = re.search(r"(\d{4})年", cell)
    return f"{m.group(1)}" if m else None


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or f"ch-{abs(hash(name)) % 100000}"


def parse_tables(md: str) -> list[dict]:
    lines = md.splitlines()
    channels: list[dict] = []
    section = None  # 'DC' | 'AC'
    i = 0
    while i < len(lines):
        line = lines[i]
        if "特高压直流工程" in line:
            section = "DC"
        elif "特高压交流工程" in line:
            section = "AC"
        elif line.startswith("## ") and "特高压" not in line:
            section = None  # 结尾的规模/分类汇总表不参与解析
        # 表格行：| a | b | c | d | e |
        if line.strip().startswith("|") and section:
            cells = [c.strip().replace("**", "") for c in line.strip().strip("|").split("|")]
            if len(cells) >= 4 and not set(cells[0]) <= set("-— ") and "工程名称" not in cells[0]:
                try:
                    channels.append(build_channel(cells, section))
                except SkipRow:
                    pass
        i += 1
    return [c for c in channels if c]


class SkipRow(Exception):
    pass


def build_channel(cells: list[str], section: str) -> dict:
    # 直流表：名称|电压|起→终|容量|投运 ；交流表：名称|起→终|容量|投运
    if section == "DC":
        name_cell, volt_cell, route_cell, cap_cell, date_cell = (cells + [""] * 5)[:5]
        kv = parse_voltage(volt_cell) or parse_voltage(name_cell) or (800 if "±" in volt_cell else None)
        ctype = "DC"
    else:
        name_cell, route_cell, cap_cell, date_cell = (cells + [""] * 4)[:4]
        kv = 1000
        ctype = "AC"

    name_core = re.sub(r"[（(].*?[)）]", "", name_cell).strip()
    ov = OVERRIDES.get(name_core, {})
    if ov.get("skip"):
        raise SkipRow()

    # 起止点（支持 A → B → C 多端）
    nodes = [n.strip() for n in re.split(r"→|—>", route_cell) if n.strip()]
    if len(nodes) < 2:
        raise SkipRow()
    start_s, end_s = nodes[0], nodes[-1]
    if ov.get("end"):
        end_s = ov["end"]
    s = locate(start_s) or raise_skip(start_s)
    e = locate(end_s) or raise_skip(end_s)

    kv = kv or (500 if ctype == "DC" else 1000)
    default_cap = 8000 if ctype == "DC" else 5000
    cap = parse_capacity(cap_cell, default_cap)

    volt_str = f"±{kv}kV" if ctype == "DC" else f"{kv}kV"
    type_word = "特高压直流" if ctype == "DC" else "特高压交流"
    if "特高压" in name_core:
        base_name = name_core  # 名称已含「特高压」，保持原样
    elif name_core.endswith(("直流", "交流")):
        base_name = name_core + volt_str  # 如「三广直流」→「三广直流±500kV」
    else:
        base_name = f"{name_core}{volt_str}{type_word}"
    base_name = ov.get("name_suffix") or base_name

    return {
        "id": CHANNEL_IDS.get(name_core) or ov.get("id") or slugify(name_core),
        "name": base_name,
        "type": ctype,
        "voltage_kv": kv,
        "capacity_mw": cap,
        "start_point": {"name": start_s, "province": s[2], "lat": s[0], "lng": s[1]},
        "end_point": {"name": end_s, "province": e[2], "lat": e[0], "lng": e[1]},
        "commissioning_date": parse_date(date_cell),
        "status": "operational",
        "notes": "经" + "、".join(nodes[1:-1]) if len(nodes) > 2 else "",
    }


def raise_skip(place: str):
    print(f"  警告：无法解析地名「{place}」，该行跳过", file=sys.stderr)
    raise SkipRow()


def main() -> None:
    md = MD_PATH.read_text(encoding="utf-8")
    channels = parse_tables(md)
    doc = {"channels": channels}
    for out in OUT_FILES:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    dc = sum(1 for c in channels if c["type"] == "DC")
    ac = len(channels) - dc
    print(f"解析完成：{len(channels)} 条通道（DC {dc} / AC {ac}）")
    for out in OUT_FILES:
        print(f"  写入 {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
