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
| 部署 | 腾讯云 Ubuntu 24.04 + Nginx，域名 **powermap.geekbit.org** |

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

## 部署（腾讯云 Ubuntu 24.04 · powermap.geekbit.org）

纯静态站点：**在服务器上从 GitHub 拉取代码、本地构建**，产物由 Nginx 直接托管，无后端进程、无数据库、不手动上传文件。

### 0. 前置条件

- 腾讯云服务器（Ubuntu 24.04），安全组已放行 **80/443** 端口
- 域名 `powermap.geekbit.org` 已在 DNS 解析中添加 A 记录指向服务器公网 IP
- 服务器可访问 GitHub（clone/pull）与 npm 镜像源

### 1. 服务器环境（一次性）

```bash
# Node.js 20+（Ubuntu 24.04 自带 node 18 较旧，用 NodeSource 装 20.x）
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v            # 确认 v20.x / npm 10+

# 拉取项目（不放 /opt 避免 root 权限问题）
sudo mkdir -p /home/ubuntu/BladeBend && sudo chown ubuntu:ubuntu /home/ubuntu/BladeBend
git clone git@github.com:johnhany/BladeBend.git /home/ubuntu/BladeBend

# 关键：nginx 以 www-data 运行，而 /home/ubuntu 通常是 750，www-data 无法进入读取 → 500
sudo chmod 755 /home/ubuntu   # 只放开目录遍历，不改动其中文件权限
```

> 项目已包含 `frontend/.npmrc`（镜像源 npmmirror），与 `package-lock.json` 中的下载地址一致，
> 服务器 `npm install` 不会触发 npm 11 的 `EALLOWREMOTE` 报错（详见下方 FAQ）。

### 2. 构建

```bash
cd /home/ubuntu/BladeBend/frontend
npm install                 # 或 npm ci
npm run build               # 产物在 frontend/dist/
ls dist/ dist/data/         # 校验：index.html、assets/*、data/ 下 7 个 JSON 齐全
```

### 3. Nginx 安装与站点配置

```bash
sudo apt update && sudo apt install -y nginx
sudo tee /etc/nginx/sites-available/powermap > /dev/null <<'EOF'
server {
    listen 80;
    server_name powermap.geekbit.org;

    root /home/ubuntu/BladeBend/frontend/dist;   # 必须绝对路径：nginx 配置中 ~ 不会展开
    index index.html;

    # 静态数据 JSON 不缓存（数据更新后重新 build 即生效）
    location /data/ {
        add_header Cache-Control "no-cache";
    }

    # 带 hash 的构建产物长缓存
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # SPA 兜底（当前为单页，无前端路由；保留以防后续增加页面）
    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
EOF
sudo ln -s /etc/nginx/sites-available/powermap /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 4. HTTPS（Let's Encrypt 免费证书）

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d powermap.geekbit.org --agree-tos -m <邮箱> --redirect
sudo systemctl enable --now certbot.timer     # 自动续期
sudo certbot renew --dry-run                  # 验证续期
```

### 5. 验证

```bash
curl -I https://powermap.geekbit.org                          # 期望 200
curl -s https://powermap.geekbit.org/data/capacity.json | head -c 120   # 返回 JSON
```

### 更新发布（代码或数据变更后，在服务器上执行）

```bash
cd /home/ubuntu/BladeBend
git pull
cd frontend && npm install && npm run build
# Nginx root 直接指向 dist/，无需拷贝、无需重启任何服务
```

### 可选加固

- **HTTP/2**：certbot 配好 443 后，在 `listen 443 ssl;` 后追加 `http2 on;` 再 `sudo systemctl reload nginx`
- **主机防火墙**：`sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable`
- **定期备份**：站点可随时由仓库重建，服务器无需备份；DNS 与证书配置建议记录在案

### 常见问题（FAQ）

**Q：在服务器上 `npm install` 报 `EALLOWREMOTE: Fetching packages of type "remote" have been disabled`？**

原因：`package-lock.json` 中的依赖下载地址指向 **npmmirror（registry.npmmirror.com）**（本地开发机使用的镜像源），
而服务器上的 npm（11+）默认只允许从「当前配置的 registry」拉取，其它地址一律拒绝。

处理：项目已包含 `frontend/.npmrc` 与根目录 `.npmrc`（内容为
`registry=https://registry.npmmirror.com`），`npm install` 会自动读取项目级配置，
使 registry 与 lockfile 地址一致，不再触发该错误。若仍报错（如 .npmrc 未提交/未拉取），可显式指定：

```bash
npm install --registry=https://registry.npmmirror.com
```

> ⚠️ 两份 `.npmrc` 是构建流程的组成部分，**必须随仓库提交**（当前在本地尚未提交，推送前请 `git add .npmrc frontend/.npmrc`）。
> 若团队统一改用官方源：删除两份 `.npmrc` 后在本地重新生成 lockfile
> （`rm frontend/package-lock.json && npm install`，需全局 registry 为 npmjs.org）。

**Q：访问站点返回 `500 Internal Server Error`？**

常见原因（都是 Nginx 找不到/读不到 `root` 下的 `index.html`）：

1. **服务器上还没构建**（最易忽略）：`frontend/dist/` 在 `.gitignore` 中，
   **`git clone` 拉下来的仓库里没有 dist**——必须在服务器上执行 `npm install && npm run build`（部署步骤 2）。
   若 dist 不存在，`try_files` 兜底到 `/index.html` 也找不到，就会报
   `rewrite or internal redirection cycle while internally redirecting to "/index.html"` → 500。
2. **`root` 写了 `~/apps/...`**：Nginx 配置中 **`~` 不会展开**（那是 shell 特性），
   会被当作字面路径导致找不到文件 → 500。必须写**绝对路径**（本配置用 `/home/ubuntu/BladeBend/frontend/dist`）。
3. **`root` 指向 `/home/ubuntu/...` 且未放开主目录权限**：nginx 以 `www-data` 用户运行，
   而 `/home/ubuntu` 通常是 `750`，`www-data` 无法进入读取 → 500/403。
   修复：`sudo chmod 755 /home/ubuntu`（只放开目录遍历）。

排查方法：

```bash
sudo tail -20 /var/log/nginx/error.log    # 看具体报错（redirection cycle / permission denied / open() failed）
sudo nginx -t                              # 校验配置
ls -la /home/ubuntu/BladeBend/frontend/dist/ # 确认 index.html 存在；不存在 → 回到部署步骤 2 构建
sudo -u www-data cat /home/ubuntu/BladeBend/frontend/dist/index.html > /dev/null && echo 可读  # 确认 www-data 能读
```

若已完成 HTTPS，certbot 改写过的配置里同样检查 `root` 是否为绝对路径。

**Q：从 GitHub 全新 clone 后构建，数据完整吗？**

完整。`.gitignore` 只忽略「可再生的中间产物」（`node_modules/`、`frontend/dist/`、
`data/raw/` 原始下载、`data/processed/`、`*.db`、`.env`）；页面所需的全部静态数据
均已入库并被 `vite build` 原样拷入 `dist/`：

| 构建输入 | git 跟踪 | 说明 |
|---|---|---|
| `frontend/public/data/*.json`（7 个） | ✅ | 装机/电价/电量/交易/通道/受送电/河流，`npm run build` 自动拷入 `dist/data/` |
| `frontend/src/assets/geo/china.topojson` | ✅ | 省界矢量（随 JS 资产打包） |
| `frontend/src/assets/geo/china-cities.json` | ✅ | 城市点位 |
| `frontend/package-lock.json` + `.npmrc` | ✅ | 依赖可复现安装 |
| `data/raw/ne_rivers.geojson` 等原始数据 | ❌（被忽略） | **仅重建 rivers.json 时需要**（`build_rivers.py` 会提示重新下载），常规构建不需要 |

即：`git clone → npm install → npm run build` 三步在任意机器都能得到完整站点；只有重新生成河流数据时才需要补下载 `data/raw/` 下的源文件（脚本内已注明下载地址）。
