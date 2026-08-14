# 全国电力数据可视化地图 — 开发设计文档（SDD）

**文档版本**：v1.0  
**对应 PRD**：v1.2（终稿）  
**撰写日期**：2026-08-11  
**状态**：已确认 — 待开发

---

## 目录

1. [架构设计](#1-架构设计)
2. [文件和目录设计](#2-文件和目录设计)
3. [关键模块的核心原理设计](#3-关键模块的核心原理设计)
4. [关键依赖库和组件](#4-关键依赖库和组件)
5. [项目工作流程](#5-项目工作流程)
6. [开发阶段规划](#6-开发阶段规划)
7. [API 接口设计](#7-api-接口设计)
8. [数据库设计](#8-数据库设计)
9. [附录](#9-附录)

---

## 1. 架构设计

### 1.1 整体架构

采用**前后端分离 + 数据自动化 Pipeline** 的三层架构：

```
前端展示层 (React + D3.js + ECharts)
         | HTTP/REST
API 服务层 (FastAPI + SQLAlchemy)
         | SQL
数据存储层 (SQLite/PostgreSQL)
         ^
         | 数据写入
数据自动化 Pipeline (Python + Playwright + LLM + OCR)
         ^
         | 爬取
北极星电力网 (bjx.geekbit.org)
```

### 1.2 部署架构

**本地开发环境**（Windows 11 / macOS）：
- Frontend: Vite dev server (:8220)
- Backend: FastAPI + Uvicorn (:8380)
- Database: SQLite (本地文件)
- Data Pipeline: 手动执行 update_data.py

**生产环境**（腾讯云 Ubuntu 24.04）：
- Nginx (:80/:443) 反向代理 -> FastAPI (:8380)
- PostgreSQL (:5432) 数据存储
- Cron 定时执行 update_data.py

### 1.3 数据流设计

```
北极星索引 -> 正文爬取(HTML+图片) -> 多模态解析(LLM+OCR) -> 结构化数据(JSON)
                                                                    |
                                                                    v
前端渲染 <- API响应(FastAPI) <- 数据查询(SQLAlchemy) <- 数据入库(SQLite/PostgreSQL)
```

---

## 2. 文件和目录设计

### 2.1 完整项目目录树

```
power-map-visualization/
├── README.md                          # 项目说明与快速启动指南
├── requirements.txt                   # Python 后端依赖
├── package.json                       # Node.js 前端依赖
├── vite.config.ts                     # Vite 构建配置
├── tsconfig.json                      # TypeScript 配置
├── tailwind.config.js                 # Tailwind CSS 配置
├── .env                               # 环境变量（本地）
├── .env.production                    # 环境变量（生产）
├── .gitignore
|
├── backend/                           # ===== 后端服务 =====
│   ├── main.py                        # FastAPI 入口文件
│   ├── config.py                      # 配置管理
│   ├── database.py                    # SQLAlchemy 数据库连接
│   ├── models/                        # ORM 模型
│   │   ├── capacity.py                # province_capacity 表
│   │   ├── price.py                   # province_price 表
│   │   ├── trade.py                   # inter_province_trade 表
│   │   └── channel.py                 # 输电通道模型
│   ├── schemas/                       # Pydantic 数据校验
│   │   ├── capacity.py
│   │   ├── price.py
│   │   ├── trade.py
│   │   └── channel.py
│   ├── routers/                       # API 路由
│   │   ├── capacity.py                # /api/capacity/*
│   │   ├── price.py                   # /api/price/*
│   │   ├── trade.py                   # /api/trade/*
│   │   ├── channels.py                # /api/channels/*
│   │   └── search.py                  # /api/search/*
│   ├── services/                      # 业务逻辑层
│   │   ├── data_service.py            # 数据查询聚合
│   │   └── geo_service.py             # 地理数据服务
│   └── static/                        # 静态文件
│       └── channels.json              # 输电通道数据
|
├── frontend/                          # ===== 前端应用 =====
│   ├── index.html                     # HTML 入口
│   ├── src/
│   │   ├── main.tsx                   # React 应用入口
│   │   ├── App.tsx                    # 根组件
│   │   ├── index.css                  # 全局样式
│   │   ├── components/                # 组件目录
│   │   │   ├── ui/                    # 基础 UI 组件
│   │   │   ├── MapContainer.tsx       # 地图容器
│   │   │   ├── ProvinceLayer.tsx      # 省份图层
│   │   │   ├── CityLayer.tsx          # 城市点位图层
│   │   │   ├── ChannelLayer.tsx       # 输电通道图层
│   │   │   ├── TerrainLayer.tsx       # 山脉河流图层
│   │   │   ├── Tooltip.tsx            # 悬停提示框
│   │   │   ├── DetailPanel.tsx        # 省份详情面板
│   │   │   ├── ControlBar.tsx         # 顶部控制栏
│   │   │   ├── Legend.tsx             # 动态图例
│   │   │   ├── SearchBox.tsx          # 搜索框
│   │   │   ├── TimeSelector.tsx       # 时间选择器
│   │   │   ├── ChartPanel.tsx         # 图表面板
│   │   │   └── ComparisonView.tsx     # 多省份对比视图
│   │   ├── hooks/                     # 自定义 Hooks
│   │   │   ├── useMapData.ts          # 地图数据加载
│   │   │   ├── useProvinceData.ts     # 省份指标数据
│   │   │   ├── useChannelData.ts      # 通道数据
│   │   │   ├── useMapInteraction.ts   # 地图交互逻辑
│   │   │   └── useColorScale.ts       # 分级设色逻辑
│   │   ├── stores/                    # Zustand 状态管理
│   │   │   ├── mapStore.ts            # 地图状态
│   │   │   ├── dataStore.ts           # 数据状态
│   │   │   └── uiStore.ts             # UI 状态
│   │   ├── utils/                     # 工具函数
│   │   │   ├── projection.ts          # D3 投影配置
│   │   │   ├── colorScales.ts         # 颜色比例尺
│   │   │   ├── formatters.ts          # 数据格式化
│   │   │   ├── geoHelpers.ts          # 地理计算
│   │   │   └── provinceCodeMap.ts     # 省份编码映射
│   │   ├── types/                     # TypeScript 类型
│   │   │   ├── geo.ts                 # 地理数据类型
│   │   │   ├── data.ts                # 业务数据类型
│   │   │   └── api.ts                 # API 响应类型
│   │   └── assets/                    # 静态资源
│   │       ├── geo/                   # 地理数据文件
│   │       │   ├── china.topojson     # 中国省份 TopoJSON
│   │       │   ├── china-cities.json  # 城市点位
│   │       │   ├── mountains.json     # 山脉数据
│   │       │   └── rivers.json        # 河流数据
│   │       └── styles/
│   │           └── map-theme.css      # 地图主题样式
│   └── public/                        # 公共静态资源
│       └── favicon.ico
|
├── scripts/                           # ===== 数据自动化脚本 =====
│   ├── update_data.py                 # 主更新脚本
│   ├── config.py                      # 脚本配置
│   ├── fetcher/
│   │   ├── index_fetcher.py           # 索引获取
│   │   └── article_fetcher.py         # 正文爬取
│   ├── parser/
│   │   ├── text_parser.py             # 文本解析
│   │   ├── table_parser.py            # 表格解析
│   │   ├── image_parser.py            # 图片 OCR + LLM
│   │   └── llm_client.py              # LLM API 封装
│   ├── processor/
│   │   ├── normalizer.py              # 数据标准化
│   │   ├── validator.py               # 数据校验
│   │   └── deduplicator.py            # 去重
│   ├── storage/
│   │   ├── db_writer.py               # 数据库写入
│   │   └── file_manager.py            # 文件管理
│   └── logs/                          # 运行日志
|
├── data/                              # ===== 数据目录 =====
│   ├── raw/                           # 原始爬取数据
│   │   ├── html/                      # 文章 HTML 存档
│   │   └── images/                    # 文章图片存档
│   ├── processed/                     # 解析后的结构化数据
│   │   ├── capacity/
│   │   ├── price/
│   │   └── trade/
│   └── channels.json                  # 输电通道数据
|
├── docs/                                # ===== 文档 =====
│   ├── PRD.md
│   ├── SDD.md
│   ├── DEPLOY.md                      # 部署指南
│   └── API.md                         # API 接口文档
|
└── docker/                              # ===== Docker 配置 =====
    ├── Dockerfile.backend
    ├── Dockerfile.frontend
    └── docker-compose.yml
```

---

## 3. 关键模块的核心原理设计

### 3.1 地图渲染模块（D3.js + TopoJSON）

#### 3.1.1 投影配置

采用 **Albers 等面积投影** 适配中国版图，核心参数：

- rotate: [-105, 0]  (中央经线 105°E)
- center: [0, 35]    (投影中心纬度 35°N)
- parallels: [25, 47] (标准纬线)
- scale: width * 0.9  (自适应缩放)

#### 3.1.2 省份图层渲染流程

1. 加载 TopoJSON -> topojson.feature() 转换为 GeoJSON FeatureCollection
2. 计算投影 -> projection 将经纬度映射为 SVG path 的 d 属性
3. 绑定数据 -> 将业务数据按 province_code 关联到 GeoJSON features
4. 分级设色 -> d3.scaleSequential / d3.scaleThreshold 映射数值到颜色
5. 渲染路径 -> <path> 元素绘制每个省份
6. 交互绑定 -> on("mouseover") / on("click") 绑定事件

#### 3.1.3 南海诸岛插图

在主地图右下角以 scale(0.25) 渲染独立的南海诸岛 SVG 组，确保领土完整性。

### 3.2 分级设色（Choropleth）模块

| 指标类型 | 颜色方案 | 比例尺类型 |
|---------|---------|-----------|
| 装机量（总） | 蓝-绿-黄 | d3.scaleSequential(d3.interpolateViridis) |
| 现货电价 | 白-橙-红 | d3.scaleThreshold |
| 中长期电价 | 白-蓝-紫 | d3.scaleThreshold |
| 省间交易 | 灰-绿 | d3.scaleSequential |

动态图例根据当前指标自动计算分级断点并渲染色带。

### 3.3 输电通道粒子动画模块

#### 3.3.1 通道路径生成

使用 **三次贝塞尔曲线** 连接起点与终点，避免直线穿越省份边界：

```
M{x1},{y1} Q{cx},{cy} {x2},{y2}
# 控制点为连线中点上方偏移，形成自然弧线
cx = (x1 + x2) / 2
cy = (y1 + y2) / 2 - abs(x2 - x1) * 0.2
```

#### 3.3.2 粒子流动画

使用 SVG + requestAnimationFrame 实现：

- 每个通道维护一组 Particle 对象
- Particle.progress: 0~1 沿路径的进度
- 每帧更新 progress，超出 1 则重置为 0
- 使用 path.getPointAtLength(progress * totalLength) 获取当前坐标
- 更新 <circle> 的 cx/cy 属性实现流动效果

#### 3.3.3 通道视觉编码

| 视觉属性 | 映射数据 |
|---------|---------|
| 线宽 | capacity_mw (1px ~ 6px) |
| 线型 | type: DC=实线, AC=虚线 |
| 粒子颜色 | avg_price_yuan_mwh |
| 粒子密度 | trade_volume_mwh |
| 粒子方向 | 从送端到受端 |

### 3.4 数据自动化 Pipeline 模块

#### 3.4.1 索引获取（index_fetcher.py）

- GET https://bjx.geekbit.org/
- 解析 HTML，提取标题、URL、日期
- 关键词过滤："装机"、"电价"、"现货"、"省间交易"、"特高压"
- 输出候选文章列表 [{title, url, date}]

#### 3.4.2 正文爬取（article_fetcher.py）

使用 Playwright 渲染动态页面：
- 提取正文 HTML -> 保存到 data/raw/html/
- 提取所有图片 -> 保存到 data/raw/images/
- 图片 MD5 哈希去重

#### 3.4.3 多模态解析

**文本解析**：正则粗提取 + LLM 精校验

**HTML表格**：pandas 解析 DataFrame + LLM 识别表头映射

**图片中的表格**：PaddleOCR 提取文本 -> LLM 结构化

**图片中的图表**：OCR + LLM 视觉模型提取数据点

#### 3.4.4 数据清洗与标准化（normalizer.py）

单位转换规则：

| 原始单位 | 转换规则 | 目标单位 |
|---------|---------|---------|
| 万千瓦 | x 10 | MW |
| GW | x 1000 | MW |
| 亿千瓦时 | x 1e8 | MWh |
| GWh | x 1000 | MWh |
| 元/千瓦时 | x 1000 | 元/MWh |

省份名称标准化：
- "内蒙古自治区" -> "内蒙古"
- "广西自治区" -> "广西"
- "新疆自治区" -> "新疆"
- "宁夏自治区" -> "宁夏"
- "西藏自治区" -> "西藏"

异常值阈值：
- 电价 > 2000 元/MWh 或 < 0 元/MWh -> 标记待审核

### 3.5 前端状态管理（Zustand）

三个独立的 Store：

1. **mapStore**: 地图状态（缩放级别、中心点、选中省份列表、悬停省份）
2. **dataStore**: 数据状态（当前指标、年月、各类数据缓存、加载状态）
3. **uiStore**: UI 状态（DetailPanel 开关、图层显隐、对比模式开关）

数据获取逻辑封装在 dataStore.fetchData() 中，根据当前 indicator 自动调用对应 API。

### 3.6 详情面板图表模块（ECharts）

**装机量堆叠柱状图**：
- X轴：省份名称
- Y轴：装机量（自动切换 MW/GW 显示）
- Series：火电(红)、水电(蓝)、风电(绿)、光伏(黄)、核电(紫)、其它(灰)

**电价时序折线图**：
- X轴：YYYY-MM
- Y轴：元/MWh
- Series：现货均价(红)、中长期均价(蓝)
- MarkPoint：标注负电价和限价触碰异常点

---

## 4. 关键依赖库和组件

### 4.1 前端依赖

| 依赖包 | 版本 | 用途 |
|-------|------|------|
| react | ^18.3.0 | UI 框架 |
| react-dom | ^18.3.0 | React DOM 渲染 |
| typescript | ^5.5.0 | 类型系统 |
| vite | ^5.4.0 | 构建工具 |
| @vitejs/plugin-react | ^4.3.0 | Vite React 插件 |
| d3 | ^7.9.0 | 地图渲染、投影、比例尺、交互 |
| d3-geo | ^3.1.0 | 地理投影与路径生成 |
| topojson-client | ^3.1.0 | TopoJSON -> GeoJSON 转换 |
| echarts | ^5.5.0 | 详情面板图表 |
| echarts-for-react | ^3.0.0 | ECharts React 封装 |
| zustand | ^4.5.0 | 轻量状态管理 |
| tailwindcss | ^3.4.0 | 原子化 CSS 框架 |
| lucide-react | ^0.400.0 | 图标库 |
| axios | ^1.7.0 | HTTP 请求 |
| date-fns | ^3.6.0 | 日期处理 |

### 4.2 后端依赖

| 依赖包 | 版本 | 用途 |
|-------|------|------|
| fastapi | ^0.111.0 | Web 框架 |
| uvicorn | ^0.30.0 | ASGI 服务器 |
| sqlalchemy | ^2.0.0 | ORM 数据库操作 |
| alembic | ^1.13.0 | 数据库迁移 |
| pydantic | ^2.8.0 | 数据校验与序列化 |
| pydantic-settings | ^2.3.0 | 配置管理 |
| python-multipart | ^0.0.9 | 文件上传支持 |
| psycopg2-binary | ^2.9.0 | PostgreSQL 驱动（生产） |
| python-dotenv | ^1.0.0 | 环境变量加载 |

### 4.3 数据脚本依赖

| 依赖包 | 版本 | 用途 |
|-------|------|------|
| requests | ^2.32.0 | HTTP 请求（索引爬取） |
| playwright | ^1.45.0 | 浏览器自动化（正文爬取） |
| beautifulsoup4 | ^4.12.0 | HTML 解析 |
| lxml | ^5.2.0 | XML/HTML 高速解析 |
| paddleocr | ^2.7.0 | 图片 OCR 识别 |
| paddlepaddle | ^2.6.0 | PaddleOCR 底层框架 |
| openai | ^1.37.0 | LLM API 调用 |
| pandas | ^2.2.0 | 数据处理与表格解析 |
| numpy | ^2.0.0 | 数值计算 |
| pillow | ^10.4.0 | 图像处理 |
| imagehash | ^4.3.0 | 图片感知哈希去重 |
| tqdm | ^4.66.0 | 进度条 |
| loguru | ^0.7.0 | 日志记录 |

### 4.4 开发工具

| 工具 | 用途 |
|-----|------|
| eslint + @typescript-eslint | 代码规范检查 |
| prettier | 代码格式化 |
| husky + lint-staged | Git 提交前检查 |
| pytest | Python 单元测试 |
| pytest-asyncio | 异步测试支持 |

---

## 5. 项目工作流程

### 5.1 完整数据生命周期

```
Day 1-5 (每月)
  |
  v
+---------------+
| update_data.py |  <- 手动或 cron 定时执行
+-------+-------+
        |
        v
+---------------+     +---------------+     +---------------+
| 1. 索引获取    | --> | 2. 正文爬取    | --> | 3. 内容解析    |
| geekbit.org   |     | Playwright    |     | LLM + OCR     |
| 关键词过滤    |     | HTML + 图片   |     | 文本/表格/图表 |
+---------------+     +---------------+     +---------------+
                                                      |
                                                      v
                                               +---------------+
                                               | 4. 数据清洗    |
                                               | 单位标准化     |
                                               | 省份编码统一   |
                                               | 异常值标记     |
                                               +---------------+
                                                      |
                                                      v
                                               +---------------+
                                               | 5. 数据入库    |
                                               | SQLite/Postgre |
                                               +---------------+
                                                      |
                                                      v
                                               +---------------+
                                               | 6. 日志与报告  |
                                               | failed_articles| <- 人工复核
                                               +---------------+
```

### 5.2 前端展示流程

```
1. 应用初始化
   - 加载 TopoJSON 底图数据
   - 初始化 D3 投影与路径生成器
   - 加载输电通道数据（channels.json）
   
2. 数据加载
   - 根据当前指标和时间调用对应 API
   - 数据按 province_code 关联到 GeoJSON features
   - 计算颜色比例尺 domain/range
   
3. 地图渲染
   - 省份路径 <path> 填充色（分级设色）
   - 省份边界 <path> 描边
   - 城市点位 <circle>
   - 通道曲线 <path> + 粒子 <circle>（动画）
   - 南海诸岛插图
   
4. 用户交互
   - Hover -> 省份高亮 + Tooltip 显示关键指标
   - Click -> 右侧滑出 DetailPanel，展示 ECharts 图表
   - Ctrl+Click -> 多选对比模式
   - 滚轮/拖拽 -> 地图缩放平移
   - 控制栏切换 -> 指标/时间/图层变更，触发数据重载
```

### 5.3 用户交互时序

```
用户 -> 前端(React) -> Zustand Store -> FastAPI -> SQLite
 |         |              |             |         |
 | Hover   |              |             |         |
 |-------->| setHoveredProvince()        |         |
 |         |<------------返回该省数据------|         |
 |         | 渲染 Tooltip(名称+总装机+电价)          |
 |<--------|              |             |         |
 |         |              |             |         |
 | Click   |              |             |         |
 |-------->| setSelectedProvince()     |         |
 |         |              | fetchDetailData()     |
 |         |              |<---返回12个月历史数据--| |
 |         |<---更新 DetailPanel 状态---|         |
 |         | 渲染 DetailPanel (ECharts)           |
 |<--------|              |             |         |
 |         |              |             |         |
 | 切换指标 |              |             |         |
 |-------->| setIndicator()            |         |
 |         |              | fetchPriceData()      |
 |         |              |<---返回价格数据-------| |
 |         |<---更新地图填充色(重算比例尺)        |
 |         | 重绘省份路径(过渡动画500ms)          |
 |<--------|              |             |         |
```

---

## 6. 开发阶段规划

### 6.1 阶段总览

| 阶段 | 周期 | 核心目标 | 可交付 Demo |
|-----|------|---------|------------|
| Phase 1 | 2 周 | 基础地图渲染 | 可交互的中国地图，支持缩放、悬停高亮 |
| Phase 2 | 2 周 | 装机数据接入 | 地图按总装机分级设色，详情面板展示堆叠图 |
| Phase 3 | 2 周 | 电价数据接入 | 切换现货/中长期电价指标，时序折线图 |
| Phase 4 | 2 周 | 通道与交易 | 输电通道绘制、粒子动画、省间交易价格展示 |
| Phase 5 | 1 周 | 数据自动化 | update_data.py 脚本、LLM 解析 Pipeline |
| Phase 6 | 1 周 | 优化与部署 | 跨平台测试、性能优化、腾讯云部署 |

### 6.2 Phase 1：基础地图（Week 1-2）

**技术目标**：
- [ ] 配置 Vite + React 18 + TypeScript 开发环境
- [ ] 引入 D3.js + TopoJSON，加载中国省份边界数据
- [ ] 实现 Albers 投影，渲染省份路径 <path>
- [ ] 实现悬停高亮（边框加粗 + 发光滤镜）
- [ ] 实现 Tooltip 组件（省份名称 + 占位数据）
- [ ] 实现点击选中 -> 右侧滑出 DetailPanel（空壳）
- [ ] 实现缩放与平移（d3.zoom）
- [ ] 添加南海诸岛插图
- [ ] 配置 Tailwind CSS 深色主题

**关键产出**：
- frontend/src/components/MapContainer.tsx
- frontend/src/components/ProvinceLayer.tsx
- frontend/src/components/Tooltip.tsx
- frontend/src/utils/projection.ts

### 6.3 Phase 2：装机数据（Week 3-4）

**技术目标**：
- [ ] 搭建 FastAPI 后端 + SQLite 数据库
- [ ] 定义 province_capacity 表模型与 Pydantic Schema
- [ ] 实现 /api/capacity 查询接口
- [ ] 前端接入 API，实现数据加载 Hook
- [ ] 实现分级设色逻辑（d3.scaleSequentialLog）
- [ ] 实现动态图例组件（Legend）
- [ ] 详情面板接入 ECharts 堆叠柱状图
- [ ] 全国概览卡片（总装机 + 各类电源占比）
- [ ] 准备 mock 数据（10 省份 x 3 个月）用于开发测试

**关键产出**：
- backend/routers/capacity.py
- frontend/src/hooks/useProvinceData.ts
- frontend/src/components/ChartPanel.tsx
- frontend/src/utils/colorScales.ts

### 6.4 Phase 3：电价数据（Week 5-6）

**技术目标**：
- [ ] 定义 province_price 表模型
- [ ] 实现 /api/price 接口（支持 spot / medium_long 参数）
- [ ] 顶部控制栏添加指标切换器（Tab 组件）
- [ ] 实现时间选择器（年月下拉）
- [ ] 电价分级设色（d3.scaleThreshold，突出异常值）
- [ ] 详情面板时序折线图（近12个月）
- [ ] 异常值标注（负电价、限价触碰）
- [ ] 多选对比模式（Ctrl+Click -> 并列对比视图）

**关键产出**：
- backend/routers/price.py
- frontend/src/components/ControlBar.tsx
- frontend/src/components/ComparisonView.tsx
- frontend/src/components/TimeSelector.tsx

### 6.5 Phase 4：通道与交易（Week 7-8）

**技术目标**：
- [ ] 定义 inter_province_trade 表模型
- [ ] 实现 /api/trade 接口
- [ ] 加载输电通道数据（用户提供 channels.json）
- [ ] 实现通道曲线路径生成（三次贝塞尔）
- [ ] 实现粒子流动画系统（SVG + requestAnimationFrame）
- [ ] 通道悬停交互（显示名称、容量、价格）
- [ ] 图层开关控制（城市、通道、山脉河流 Toggle）
- [ ] 搜索框（省份/城市/通道名称定位）

**关键产出**：
- backend/routers/trade.py
- backend/routers/channels.py
- frontend/src/components/ChannelLayer.tsx
- frontend/src/components/SearchBox.tsx
- frontend/src/components/TerrainLayer.tsx

### 6.6 Phase 5：数据自动化（Week 9）

**技术目标**：
- [ ] 实现 index_fetcher.py（从 geekbit 获取新闻索引）
- [ ] 实现 article_fetcher.py（Playwright 爬取正文+图片）
- [ ] 实现 text_parser.py（正则 + LLM 文本提取）
- [ ] 实现 table_parser.py（pandas + LLM 表格解析）
- [ ] 实现 image_parser.py（PaddleOCR + LLM 图片解析）
- [ ] 实现 normalizer.py（单位统一、省份标准化）
- [ ] 实现 validator.py（异常值检测）
- [ ] 实现 db_writer.py（数据写入 SQLite/PostgreSQL）
- [ ] 组装 update_data.py 主脚本（支持 --mode 参数）
- [ ] 编写 LLM Prompt 模板（文本/表格/图片三种场景）
- [ ] 测试脚本端到端运行

**关键产出**：
- scripts/update_data.py
- scripts/fetcher/
- scripts/parser/
- scripts/processor/
- scripts/storage/

### 6.7 Phase 6：优化与部署（Week 10）

**技术目标**：
- [ ] 性能优化：TopoJSON 数据压缩、SVG 路径简化
- [ ] 首屏加载优化：数据预加载、代码分割
- [ ] 跨平台测试：Windows 11 / macOS / Ubuntu 24.04
- [ ] 编写部署文档（DEPLOY.md）
- [ ] 配置 Nginx 反向代理（生产环境）
- [ ] 配置 systemd 服务（后端自动启动）
- [ ] 配置 cron 定时任务（数据更新）
- [ ] 腾讯云服务器部署验证
- [ ] 编写 README.md 快速启动指南

**关键产出**：
- docs/DEPLOY.md
- docker/docker-compose.yml
- README.md
- 生产环境部署验证报告

---

## 7. API 接口设计

### 7.1 装机量接口

```
GET /api/capacity
Query Parameters:
  - year: int (required)      # 年份，如 2026
  - month: int (optional)     # 月份，1-12；省略则返回年度汇总

Response 200:
{
  "data": [
    {
      "province_code": "440000",
      "province_name": "广东",
      "year": 2026,
      "month": 7,
      "thermal_mw": 98200,
      "hydro_mw": 12800,
      "wind_mw": 25600,
      "pv_mw": 42100,
      "nuclear_mw": 16140,
      "other_mw": 5600,
      "total_mw": 200440,
      "source_url": "https://news.bjx.com.cn/...",
      "updated_at": "2026-08-05T10:30:00Z"
    }
  ],
  "total": 34,
  "summary": {
    "national_total_mw": 3200000,
    "thermal_ratio": 0.42,
    "renewable_ratio": 0.51
  }
}
```

### 7.2 电价接口

```
GET /api/price
Query Parameters:
  - year: int (required)
  - month: int (required)
  - type: str (required)      # "spot" | "medium_long"

Response 200:
{
  "data": [
    {
      "province_code": "440000",
      "province_name": "广东",
      "year": 2026,
      "month": 7,
      "spot_avg_yuan_mwh": 485.50,
      "spot_high_yuan_mwh": 1250.00,
      "spot_low_yuan_mwh": -80.00,
      "medium_long_avg_yuan_mwh": 420.00,
      "is_anomaly": true,
      "anomaly_reason": "出现负电价"
    }
  ]
}
```

### 7.3 省间交易接口

```
GET /api/trade
Query Parameters:
  - year: int (required)
  - month: int (required)
  - from_province: str (optional)   # 送端省份编码
  - to_province: str (optional)      # 受端省份编码

Response 200:
{
  "data": [
    {
      "from_province_code": "640000",
      "from_province_name": "宁夏",
      "to_province_code": "330000",
      "to_province_name": "浙江",
      "year": 2026,
      "month": 7,
      "avg_price_yuan_mwh": 385.00,
      "trade_volume_mwh": 4500000,
      "channel_id": "nindong-zhejiang"
    }
  ]
}
```

### 7.4 输电通道接口

```
GET /api/channels
Query Parameters:
  - status: str (optional)    # "operational" | "under_construction" | "planned"

Response 200:
{
  "data": [
    {
      "id": "nindong-zhejiang",
      "name": "宁东-浙江+-800kV特高压直流",
      "type": "DC",
      "voltage_kv": 800,
      "capacity_mw": 8000,
      "start_point": {"name": "宁夏宁东换流站", "province": "宁夏", "lat": 38.1, "lng": 106.8},
      "end_point": {"name": "浙江绍兴换流站", "province": "浙江", "lat": 30.0, "lng": 120.6},
      "commissioning_date": "2016-09",
      "status": "operational"
    }
  ]
}
```

### 7.5 搜索接口

```
GET /api/search?q={keyword}

Response 200:
{
  "provinces": [{"code": "440000", "name": "广东"}],
  "cities": [{"name": "广州", "province": "广东", "lat": 23.13, "lng": 113.26}],
  "channels": [{"id": "nindong-zhejiang", "name": "宁东-浙江+-800kV特高压直流"}]
}
```

---

## 8. 数据库设计

### 8.1 E-R 关系图

```
province_capacity  <--- province_code --->  province_price
       |                                              |
       | province_code                                |
       v                                              v
       inter_province_trade (from_province_code / to_province_code)
              |
              | channel_id
              v
       channels.json (静态文件，非DB表)
```

### 8.2 SQLAlchemy 模型定义

**province_capacity（装机量表）**：
- id: INTEGER PK
- province_code: VARCHAR(6), index
- year: INTEGER, index
- month: INTEGER, index (0=年度汇总)
- thermal_mw: BIGINT, default=0
- hydro_mw: BIGINT, default=0
- wind_mw: BIGINT, default=0
- pv_mw: BIGINT, default=0
- nuclear_mw: BIGINT, default=0
- other_mw: BIGINT, default=0
- total_mw: BIGINT, default=0
- source_url: TEXT
- updated_at: TIMESTAMP

**province_price（电价表）**：
- id: INTEGER PK
- province_code: VARCHAR(6), index
- year: INTEGER, index
- month: INTEGER, index
- spot_avg_yuan_mwh: NUMERIC(10,2)
- medium_long_avg_yuan_mwh: NUMERIC(10,2)
- spot_high_yuan_mwh: NUMERIC(10,2)
- spot_low_yuan_mwh: NUMERIC(10,2)
- source_url: TEXT
- updated_at: TIMESTAMP

**inter_province_trade（省间交易表）**：
- id: INTEGER PK
- from_province_code: VARCHAR(6), index
- to_province_code: VARCHAR(6), index
- year: INTEGER, index
- month: INTEGER, index
- avg_price_yuan_mwh: NUMERIC(10,2)
- trade_volume_mwh: BIGINT
- channel_id: VARCHAR(50), index
- source_url: TEXT
- updated_at: TIMESTAMP

### 8.3 数据库初始化脚本

```python
# scripts/init_db.py
from sqlalchemy import create_engine
from backend.database import Base
from backend.models import capacity, price, trade

def init_database(db_url: str = "sqlite:///./data/power_map.db"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False} if "sqlite" in db_url else {}
    )
    Base.metadata.create_all(bind=engine)
    print(f"数据库初始化完成: {db_url}")

if __name__ == "__main__":
    init_database()
```

---

## 9. 附录

### 9.1 环境变量配置

```bash
# .env (本地开发)
DATABASE_URL=sqlite:///./data/power_map.db
LLM_API_KEY=sk-xxxxxxxxxxxxxxxx
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o
DEBUG=true
CORS_ORIGINS=http://localhost:8220

# .env.production (腾讯云)
DATABASE_URL=postgresql://user:pass@localhost:5432/power_map
LLM_API_KEY=sk-xxxxxxxxxxxxxxxx
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o
DEBUG=false
CORS_ORIGINS=https://your-domain.com
```

### 9.2 快速启动命令

```bash
# 1. 克隆项目
git clone <repo-url> && cd power-map-visualization

# 2. 安装前端依赖
cd frontend && npm install && cd ..

# 3. 安装后端依赖
pip install -r requirements.txt
playwright install chromium

# 4. 初始化数据库
python scripts/init_db.py

# 5. 启动后端
cd backend && uvicorn main:app --reload --port 8380

# 6. 启动前端（新终端）
cd frontend && npm run dev

# 7. 访问应用
open http://localhost:8220
```

### 9.3 生产部署命令

```bash
# Ubuntu 24.04 部署
sudo apt update && sudo apt install -y python3-pip nginx

# 后端部署
cd /opt/power-map
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# 配置 systemd 服务
sudo cp deploy/power-map.service /etc/systemd/system/
sudo systemctl enable --now power-map

# Nginx 配置
sudo cp deploy/nginx.conf /etc/nginx/sites-available/power-map
sudo ln -s /etc/nginx/sites-available/power-map /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 前端构建
cd frontend && npm install && npm run build
sudo cp -r dist/* /var/www/power-map/

# 定时任务（数据更新）
crontab -e
# 添加：0 2 5 * * cd /opt/power-map && venv/bin/python scripts/update_data.py --mode incremental >> logs/cron.log 2>&1
```

---

**文档结束。**
