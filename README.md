# 全国电力数据可视化地图（power-map-visualization）

以**自定义矢量地图**为核心的可视化网页应用，空间化呈现全国各省的电力装机结构、电价水平、省间交易价格，并叠加特高压跨省输电通道。

> **数据方案（已调整）**：不使用爬虫与自动更新。数据由人工整理为 Markdown（如 [docs/输电线路.md](docs/输电线路.md)），
> 经解析脚本生成为**静态 JSON**（`frontend/public/data/`），前端直接加载展示。

- 需求文档：[docs/PRD.md](docs/PRD.md)　设计文档：[docs/SDD.md](docs/SDD.md)　开发计划：[plan.md](plan.md)

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + D3.js + TopoJSON + ECharts + Zustand + Tailwind CSS |
| 数据 | 静态 JSON（`frontend/public/data/`），**纯静态站点，无后端服务** |
| 解析脚本 | Python 3.12（uv 管理）：Markdown → JSON |
| 部署 | 任意静态托管（Nginx / 对象存储等） |

## 快速启动

```bash
cd frontend
npm install
npm run dev                  # http://localhost:8220
```

一键脚本（自动清理端口占用后启动）：

```powershell
# Windows
powershell -ExecutionPolicy Bypass -File scripts\dev.ps1
```

```bash
# Linux / macOS
bash scripts/dev.sh
```

> 纯前端应用，无需数据库或后端进程。历史遗留的 `backend/`（FastAPI + SQLite mock）已不在运行链路中，仅作归档。

## 数据更新流程（Markdown → 静态 JSON）

| 数据 | 来源 Markdown | 脚本 | 输出 |
|---|---|---|---|
| 省间输电通道 | `docs/输电线路.md` | `scripts/parse_channels.py` | `frontend/public/data/channels.json` |
| 各省装机/电价/电量 | `docs/各省数据2025/<省份>.md` | **`scripts/provinces/<拼音>.py`（每省一份自包含脚本）** | 合并进 `capacity.json` / `price.json` / `energy.json`（整省替换） |
| 跨区域受送电年度连线 | `docs/各省数据2025/新疆.md` §4.1 等 | `scripts/build_flows.py` | `frontend/public/data/flows.json` |
| 河流（Natural Earth 1:10m） | `data/raw/ne_rivers.geojson`（一次性下载） | `scripts/build_rivers.py` | `frontend/public/data/rivers.json` |

更新某省数据示例：

```bash
# 1. 编辑 docs/各省数据2025/河北.md
# 2. 同步修改 scripts/provinces/hebei.py 中的数据字面量（脚本内有来源注释）
# 3. 运行 uv run python scripts/provinces/hebei.py，刷新页面
```

省份脚本约定：**每省完全自包含**（数据为核对后的字面量 + 各自写入逻辑，不共享解析代码）；
数值出处以注释标明 md 位置；`None` 表示未披露；内蒙古含蒙西/蒙东电网分区（subregions）。

解析脚本的约定：
- **通道**：`GAZETTEER` 维护「地名 → 经纬度/省份」映射（新站点需补充条目）；
  `CHANNEL_IDS` 保持通道 id 稳定（交易数据按 id 关联）；容量「万千瓦」×10 → MW，「万千伏安」按 0.5 功率因数折算。
- **省份**（`parse_province.py docs/河北.md`）：按二级标题分节——「装机」表 → 年度装机（火/风/光/水/核/其他 → MW），
  「价格/电价」表 → 逐月现货与中长期（元/MWh）；「发电/用电」与「跨省输送」表 → 逐月/年度电量（发电量、用电量、跨省受入/送出、发电结构，GWh）；
  中长期「待披露」时回退「年度交易均价」；未披露写 null（页面显示「—」）；
  顺带提取首个 URL 作为 `source_url`（详情面板展示「数据来源」链接）。文件名须为省份短名（如 `河北.md`）。
- 未提供真实数据的省份仍为开发用 mock（`scripts/export_db_to_static.py` 一次性导出），逐省被真实数据替换。
- **真伪标记约定**：`source_url` 以 `mock://` 开头 → 模拟数据（页面上悬停提示显示「· 模拟数据」、详情面板显示「模拟数据」徽标、全国概览卡显示「含 N/34 省模拟数据」）；真实 URL → 真实数据（显示可点击的「数据来源」链接）。

## 目录结构

```
frontend/            React + Vite 应用（public/data/ 为静态数据，全部为真实数据）
scripts/provinces/   31 份省份自包含导入脚本（每省独立运行）
scripts/             parse_channels.py、build_geo.py、dev.sh / dev.ps1 等
docs/                PRD / SDD / 数据源 Markdown（输电线路.md、各省数据2025/、蒙西蒙东.md）
data/                归档数据（channels.json 副本；raw/ 为历史遗留）
backend/             已弃用：FastAPI mock 服务（不在运行链路）
```

> 历史脚本 `seed_mock_*.py` / `export_db_to_static.py` 仅作归档，mock 数据已全部清除。
