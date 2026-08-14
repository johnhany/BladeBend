# 全国电力数据可视化地图 — 开发阶段规划（plan.md）

> 本文件基于 `全国电力数据可视化地图_PRD_v1.2.md`（需求）与 `全国电力数据可视化地图_SDD_v1.0.md`（设计）整合而成，
> 用于指导工程的分阶段落地。所有 Python 环境统一使用 **uv** 管理，默认 Python **3.12**。

---

## 0. 项目概述

构建一个以**自定义矢量地图**为核心的可视化网页应用，空间化呈现全国各省的电力装机结构、电价水平、省间交易价格，并叠加特高压跨省输电通道。数据来源为北极星电力网（`bjx.geekbit.org`），经多模态解析（LLM + OCR）入库后由前后端分离架构提供服务。

**技术栈概览：**

| 层 | 选型 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + D3.js(d3-geo) + TopoJSON + ECharts + Zustand + Tailwind CSS |
| 后端 | Python 3.12 + FastAPI + SQLAlchemy 2.0 + Pydantic v2 + Uvicorn |
| 数据库 | SQLite（本地）/ PostgreSQL（生产，可选 TimescaleDB） |
| 数据 Pipeline | Python + Playwright + requests + BeautifulSoup + pandas + PaddleOCR + OpenAI/本地 LLM |
| Python 环境 | **uv**（统一虚拟环境与依赖锁定，Python 3.12） |
| 部署 | 本地 Win11/macOS 调试；生产 Ubuntu 24.04（腾讯云香港）+ Nginx + systemd + cron |

---

## 1. 环境与工具约定（贯穿全阶段）

> ⚠️ SDD 中出现的 `pip install -r requirements.txt`、`python3 -m venv venv`、`python xxx.py` 等
> **一律替换为 uv 工作流**。统一使用单一 `pyproject.toml`（位于仓库根目录）管理全部 Python 依赖，
> 通过可选依赖组（dependency groups）区分「后端运行时」「数据 Pipeline」「OCR」「开发」。

**初始化（每个开发者首次拉取后执行一次）：**

```bash
# 锁定 Python 版本
uv python pin 3.12

# 创建虚拟环境（Python 3.12）
uv venv --python 3.12

# 安装依赖（含分组）
uv sync                       # 基础 + dev
uv sync --extra pipeline      # 追加爬虫/LLM 依赖
uv sync --extra ocr           # 追加 PaddleOCR 依赖

# 运行任意 Python 入口
uv run python scripts/update_data.py --mode incremental
uv run uvicorn backend.main:app --reload --port 8380
uv run pytest
```

**依赖分组规划（写入 `pyproject.toml`）：**

- `[project.dependencies]`：后端运行时——fastapi、uvicorn、sqlalchemy、alembic、pydantic、pydantic-settings、python-dotenv、python-multipart。
- `[project.optional-dependencies.pipeline]`：requests、playwright、beautifulsoup4、lxml、pandas、numpy、pillow、imagehash、tqdm、loguru、openai。
- `[project.optional-dependencies.ocr]`：paddleocr、paddlepaddle。
- `[project.optional-dependencies.dev]`：pytest、pytest-asyncio、ruff（替代/补充 eslint 侧的 Python 检查）。
- Playwright 浏览器二进制：`uv run playwright install chromium`。

> 前端使用 `npm`（或 pnpm）管理，保持 SDD 的 `package.json` 结构不变。

---

## 2. 阶段总览

| 阶段 | 周期 | 核心目标 | Demo 形态 |
|---|---|---|---|
| **Phase 0** | 0.5 周 | 工程脚手架 + 环境初始化 | 空壳前后端可启动、CI/格式化就绪 |
| **Phase 1** | 2 周 | 基础地图渲染 | 可交互中国地图，缩放/悬停高亮 |
| **Phase 2** | 2 周 | 装机数据接入 | 地图按总装机分级设色 + 详情面板堆叠图 |
| **Phase 3** | 2 周 | 电价数据接入 | 现货/中长期切换 + 时序折线图 + 多选对比 |
| **Phase 4** | 2 周 | 通道与交易 | 输电通道曲线 + 粒子动画 + 省间交易展示 |
| **Phase 5** | 1 周 | 数据自动化 | `update_data.py` + LLM/OCR 解析 Pipeline |
| **Phase 6** | 1 周 | 优化与部署 | 跨平台测试 + 性能优化 + 腾讯云上线 |

**总工期：约 10.5 周。** 阶段间存在依赖：0 → 1 → 2 → 3 → 4（前端主线）；2 依赖后端；5 可与 3/4 并行启动编码但端到端测试需 4 完成；6 收尾。

---

## 3. Phase 0：工程脚手架与环境初始化（~0.5 周）

**目标：** 搭出可运行的空壳工程，建立目录、配置、环境基线，使后续每个阶段都能增量开发。

**任务清单：**
- [ ] 按目录树创建顶层结构：`backend/ frontend/ scripts/ data/ docs/ docker/`
- [ ] 初始化 **uv** 工程：`uv init`、`uv python pin 3.12`、`uv venv --python 3.12`，生成 `pyproject.toml` 与 `.python-version`
- [ ] 配置依赖分组（见第 1 节），`uv sync` 通过；`uv run playwright install chromium`
- [ ] 前端脚手架：`npm create vite@latest frontend -- --template react-ts`，配置 Tailwind CSS、tsconfig、eslint、prettier、husky + lint-staged
- [ ] 后端空壳：`backend/main.py`（FastAPI 健康检查 `/health`）、`config.py`、`database.py`
- [ ] 配置 `.env` / `.env.production` 模板，写入 `CORS_ORIGINS`、`DATABASE_URL`、`LLM_*` 占位
- [ ] 编写 `.gitignore`（`data/raw/`、`logs/`、`*.db`、`node_modules/`、`.venv/`、`.env`）
- [ ] 把 PRD/SDD 归档至 `docs/`；建立 `README.md` 快速启动骨架

**交付物：** `pyproject.toml`、`.python-version`、`uv.lock`、可 `uv run uvicorn` 启动的后端、可 `npm run dev` 启动的前端。

**验收标准：**
- `uv run python -c "import fastapi, sqlalchemy; print('ok')"` 成功
- 前后端分别能在 `:8380` / `:8220` 启动，`GET /health` 返回 200
- `uv sync`、`npm install` 全程无致命错误

---

## 4. Phase 1：基础地图（Week 1-2）

**目标：** 纯前端实现可交互的中国矢量底图，不含真实业务数据。

**任务清单：**
- [ ] 获取并处理 Natural Earth 1:10m 文化矢量数据，生成 `china.topojson`，**人工校验台湾、藏南、南海诸岛边界完整性**
- [ ] 实现 Albers 等面积投影（rotate `[-105,0]`、center `[0,35]`、parallels `[25,47]`），封装 `utils/projection.ts`
- [ ] `topojson.feature()` 转 GeoJSON，渲染省份 `<path>`
- [ ] 悬停高亮（边框加粗 + SVG 发光滤镜）+ `Tooltip` 组件（省份名 + 占位数据）
- [ ] 点击选中 → 右侧滑出 `DetailPanel`（空壳）
- [ ] `d3.zoom` 实现缩放与平移
- [ ] 右下角南海诸岛插图（`scale(0.25)`）
- [ ] Tailwind 深色主题（背景 `#0a1628`/`#1a1a2e`）

**交付物：** `MapContainer.tsx`、`ProvinceLayer.tsx`、`Tooltip.tsx`、`utils/projection.ts`、`assets/geo/china.topojson`。

**验收标准：** 34 省级行政区完整渲染无缺失；悬停/点击/缩放帧率 ≥ 30fps；南海诸岛插图可见；领土要素经人工核对无误。

---

## 5. Phase 2：装机数据（Week 3-4）

**目标：** 打通「后端 → API → 前端」数据链路，用装机量做第一类分级设色。

**任务清单：**
- [ ] 后端：定义 `province_capacity` ORM 模型 + Pydantic Schema
- [ ] 后端：实现 `GET /api/capacity?year=&month=`（含 `summary` 全国汇总）
- [ ] 后端：`uv run python scripts/init_db.py` 初始化 SQLite（`init_db.py` 用 `uv run` 执行）
- [ ] 前端：`useProvinceData` Hook 接入 API，按 `province_code` 关联到 GeoJSON features
- [ ] 分级设色：`d3.scaleSequential(d3.interpolateViridis)`，对总装机可考虑对数尺度
- [ ] 动态 `Legend` 组件（自动计算断点 + 色带）
- [ ] 详情面板：ECharts 堆叠柱状图（火/水/风/光/核/其它），支持切饼图
- [ ] 顶部全国概览卡片（总装机 + 各类电源占比）
- [ ] 准备 **mock 数据**（10 省份 × 3 个月）注入数据库用于开发

**交付物：** `backend/routers/capacity.py`、`backend/models/capacity.py`、`hooks/useProvinceData.ts`、`components/ChartPanel.tsx`、`utils/colorScales.ts`。

**验收标准：** 切换 mock 数据后地图填色随总装机变化；点击省份弹出含真实数字的详情面板；图例断点与当前数据范围一致；单位展示规则生效（<1000 MW、≥1000 GW）。

---

## 6. Phase 3：电价数据（Week 5-6）

**目标：** 接入电价，引入指标切换 / 时间选择 / 多选对比等交互。

**任务清单：**
- [ ] 定义 `province_price` ORM 模型，实现 `GET /api/price?year=&month=&type=spot|medium_long`
- [ ] 顶部 `ControlBar`：指标切换 Tab（装机 / 现货 / 中长期 / 省间交易）
- [ ] `TimeSelector`：年月下拉，电价默认展示最近完整月
- [ ] 电价分级设色 `d3.scaleThreshold`，突出异常值
- [ ] 详情面板：近 6-12 个月现货/中长期折线图，`MarkPoint` 标注负电价与限价触碰
- [ ] 地图异常省份图标标注（⚠️）
- [ ] **多选对比模式**：Ctrl/Shift + 点击 → 并列 `ComparisonView`
- [ ] 全局状态迁移：补全 `dataStore.fetchData()` 按 indicator 路由到对应 API

**交付物：** `backend/routers/price.py`、`components/ControlBar.tsx`、`components/TimeSelector.tsx`、`components/ComparisonView.tsx`。

**验收标准：** 指标/时间切换触发地图重绘（过渡动画约 500ms）；折线图覆盖 ≥6 个月；负电价省份被正确标注；对比视图至少支持 2 省并列。

---

## 7. Phase 4：通道与交易（Week 7-8）

**目标：** 叠加跨省输电通道与粒子动画，展示省间交易价格。

**任务清单：**
- [ ] 定义 `inter_province_trade` ORM 模型，实现 `GET /api/trade`
- [ ] 落地用户提供/网络检索的 `channels.json`（按 PRD §4.3 的 JSON 格式），实现 `GET /api/channels`
- [ ] `ChannelLayer`：三次贝塞尔曲线路径生成（控制点上偏形成弧线）
- [ ] 粒子动画：SVG + `requestAnimationFrame`，`path.getPointAtLength()` 驱动 `<circle>` 流动
- [ ] 通道视觉编码：线宽↔`capacity_mw`、线型 DC实线/AC虚线、粒子颜色↔均价、密度↔电量、方向↔潮流
- [ ] 通道悬停：名称 / 电压 / 容量 / 当前功率
- [ ] 图层开关 Toggle（城市点位、通道、山脉河流）
- [ ] `TerrainLayer`：山脉、河流低调呈现
- [ ] `SearchBox` + `GET /api/search?q=`：省/城/通道名称定位高亮
- [ ] `CityLayer`：省会及主要负荷中心圆点

**交付物：** `backend/routers/trade.py`、`backend/routers/channels.py`、`components/ChannelLayer.tsx`、`components/TerrainLayer.tsx`、`components/CityLayer.tsx`、`components/SearchBox.tsx`。

**验收标准：** 至少渲染 PRD §3.1.4 列出的代表性通道；粒子方向与送/受端一致且密度随容量变化；图层开关即时生效；搜索能定位并高亮目标。

---

## 8. Phase 5：数据自动化 Pipeline（Week 9）

**目标：** 用脚本替代手工填库，实现北极星数据的「爬取 → 解析 → 清洗 → 入库」全链路。

**任务清单：**
- [ ] `fetcher/index_fetcher.py`：GET `bjx.geekbit.org`，关键词过滤（装机/电价/现货/省间交易/特高压）
- [ ] `fetcher/article_fetcher.py`：Playwright 抓正文 HTML + 图片，MD5/imagehash 去重，存 `data/raw/`
- [ ] `parser/text_parser.py`：正则粗提取 + LLM 精校验
- [ ] `parser/table_parser.py`：pandas DataFrame + LLM 表头映射
- [ ] `parser/image_parser.py`：PaddleOCR → LLM 结构化（图片表格 / 图表数据点）
- [ ] `parser/llm_client.py`：封装 OpenAI/本地 LLM，沉淀三类 Prompt 模板（文本/表格/图片）
- [ ] `processor/normalizer.py`：单位转换（万千瓦×10→MW、GW×1000→MW、亿千瓦时×1e8→MWh、元/千瓦时×1000→元/MWh）；省份名标准化（内蒙古/广西/新疆/宁夏/西藏…）；时间归一 `YYYY-MM`
- [ ] `processor/validator.py`：电价 >2000 或 <0 元/MWh 标记待审核
- [ ] `storage/db_writer.py`：写入 SQLite/PostgreSQL
- [ ] 组装 `update_data.py`：支持 `--mode full|incremental|price|capacity`、`--year --month`
- [ ] 日志：`logs/update_<ts>.log`、解析失败列表 `logs/failed_articles.json`

**交付物：** `scripts/update_data.py` 及 `scripts/{fetcher,parser,processor,storage}/` 全套。

**验收标准：** `uv run python scripts/update_data.py --mode incremental` 端到端跑通，至少成功解析并入库若干条装机/电价记录；`failed_articles.json` 正确记录失败项；数据单位与省份编码符合 PRD §2.2 规范；可选验证 `--mode price|capacity` 子模式。

---

## 9. Phase 6：优化与部署（Week 10）

**目标：** 性能达标、跨平台可用、生产上线。

**任务清单：**
- [ ] 性能：TopoJSON 压缩、SVG 路径简化、数据预加载、代码分割
- [ ] 首屏加载 ≤ 3s（常规网络）；交互帧率 ≥ 30fps
- [ ] 跨平台测试：Windows 11 / macOS / Ubuntu 24.04；浏览器 Chrome 90+/Firefox 88+/Edge 90+/Safari 14+
- [ ] 响应式：最低兼容 1366×768
- [ ] 可访问性：键盘 Tab/Enter 导航；色盲友好（避免仅红绿区分，加纹理）
- [ ] 部署文档 `docs/DEPLOY.md`、API 文档 `docs/API.md`、`README.md` 快速启动
- [ ] 生产部署：Nginx 反向代理 → FastAPI(:8380)、PostgreSQL(:5432)、systemd 托管后端
- [ ] cron 定时：每月 5 日 02:00 执行 `uv run python scripts/update_data.py --mode incremental`（生产 venv 改为 uv 环境）
- [ ] 腾讯云香港服务器部署验证，产出部署验证报告
- [ ] Docker：`docker/Dockerfile.backend`、`Dockerfile.frontend`、`docker-compose.yml`（可选）

**交付物：** `docs/DEPLOY.md`、`docker/docker-compose.yml`、`README.md`、生产部署验证报告。

**验收标准：** 生产域名可访问，地图与三类数据正常加载；cron 任务按时触发且数据增量更新；跨平台/跨浏览器无阻断性缺陷。

---

## 10. 关键里程碑与依赖

```
Phase 0 (脚手架)
   │
   ▼
Phase 1 (基础地图) ── 纯前端，无后端依赖
   │
   ▼
Phase 2 (装机数据) ── 首次打通后端/API/DB
   │
   ▼
Phase 3 (电价数据) ── 引入指标切换与对比
   │
   ▼
Phase 4 (通道与交易) ── 依赖 channels.json + 交易表
   │
   ▼
Phase 5 (数据自动化) ── 可与 3/4 并行编码，端到端测试需 4 完成
   │
   ▼
Phase 6 (优化与部署)
```

- **Mock 数据先行**：Phase 2-4 开发期一律用 mock，保证前端不被 Pipeline 阻塞。
- **`channels.json` 是关键外部依赖**：Phase 4 前需用户提供或完成网络检索（按 PRD §4.3 格式）。
- **省间交易数据可能缺失**：属预期情况，UI 以「数据缺失」灰态展示，不阻塞上线。

---

## 11. 风险与注意事项

| 风险 | 影响 | 应对 |
|---|---|---|
| 北极星站点结构变更导致爬取失败 | 高 | 异常捕获 + 日志告警 + 保留本地历史缓存 |
| LLM/OCR 解析图表准确率不足 | 中 | `failed_articles.json` 人工复核；关键数据多模型投票 |
| 部分省份电价缺失 | 中 | UI 灰态展示；允许手工补录 |
| 领土合规性 | 中 | Natural Earth 数据人工校验台湾/藏南/南海诸岛 |
| Python 依赖（PaddleOCR/PaddlePaddle）安装体积大 | 中 | 用 uv 可选依赖组隔离，按需 `uv sync --extra ocr` |
| Playwright 浏览器在 CI/生产缺失 | 低 | 文档化 `uv run playwright install chromium` 步骤 |

---

**附：常用命令速查（uv 工作流）**

```bash
# 环境
uv python pin 3.12 && uv venv --python 3.12
uv sync --extra pipeline --extra ocr
uv run playwright install chromium

# 后端
uv run uvicorn backend.main:app --reload --port 8380

# 前端
cd frontend && npm install && npm run dev

# 数据库初始化与更新
uv run python scripts/init_db.py
uv run python scripts/update_data.py --mode incremental

# 测试
uv run pytest
```
