# 全国电力数据可视化地图（power-map-visualization）

以**自定义矢量地图**为核心的可视化网页应用，空间化呈现全国各省的电力装机结构、电价水平、省间交易价格，并叠加特高压跨省输电通道。数据来源为北极星电力网（`bjx.geekbit.org`），经多模态解析（LLM + OCR）入库后由前后端分离架构提供服务。

- 需求文档：[docs/PRD.md](docs/PRD.md)　设计文档：[docs/SDD.md](docs/SDD.md)　开发计划：[plan.md](plan.md)
- 输电通道原始资料：[docs/输电线路.md](docs/输电线路.md)（Phase 4 转 `data/channels.json`）

## 技术栈

| 层 | 选型 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + D3.js + TopoJSON + ECharts + Zustand + Tailwind CSS |
| 后端 | Python 3.12 + FastAPI + SQLAlchemy 2.0 + Pydantic v2 |
| 数据库 | SQLite（本地）/ PostgreSQL（生产） |
| 数据 Pipeline | Python + Playwright + PaddleOCR + LLM |
| Python 环境 | **uv**（统一虚拟环境与依赖锁定） |

## 快速启动

### 1. 后端（uv + Python 3.12）

```bash
uv python pin 3.12
uv venv --python 3.12
uv sync                      # 安装基础运行时 + dev
# 按需追加：uv sync --extra pipeline / --extra ocr / --extra prod
uv run playwright install chromium   # 数据 Pipeline 需要时执行

# 初始化数据库（创建已注册的 ORM 表）
uv run python scripts/init_db.py

# 启动后端
uv run uvicorn backend.main:app --reload --port 8380
# 健康检查：http://localhost:8380/health
# API 文档：  http://localhost:8380/docs
```

### 2. 前端

```bash
cd frontend
npm install
npm run dev                  # http://localhost:8220
```

### 3. 一键启动（推荐）

打包好的启动脚本会自动**检查端口占用 → 杀掉旧进程 → 启动后端与前端**（后端 8380 / 前端 8220）。

**Linux / macOS（bash）：**

```bash
bash scripts/dev.sh
```

**Windows（PowerShell）：**

```powershell
powershell -ExecutionPolicy Bypass -File scripts\dev.ps1
# 或（PowerShell Core）：pwsh -File scripts/dev.ps1
```

> 也可只启动单一服务（原始命令）：
>
> ```bash
> # bash
> uv run uvicorn backend.main:app --reload --port 8380   # 后端
> cd frontend && npm run dev                             # 前端
> ```
>
> ```powershell
> # PowerShell
> uv run uvicorn backend.main:app --reload --port 8380   # 后端
> Push-Location frontend; npm run dev; Pop-Location       # 前端
> ```

## 目录结构

```
backend/     FastAPI 服务（main / config / database / models / schemas / routers / services）
frontend/    React + Vite 应用
scripts/     数据自动化脚本（update_data.py 等）、init_db.py、dev.sh / dev.ps1 启动脚本
data/        原始爬取数据(raw)、解析产物(processed)、channels.json
docs/        PRD / SDD / 部署与 API 文档
docker/      Docker 部署配置（Phase 6）
```

## 数据更新（Phase 5 起）

```bash
uv run python scripts/update_data.py --mode incremental   # 增量
uv run python scripts/update_data.py --mode full          # 全量
```

详见 [plan.md](plan.md) 的阶段规划与 [docs/SDD.md](docs/SDD.md) 第 6 章。
