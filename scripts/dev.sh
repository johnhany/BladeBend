#!/usr/bin/env bash
# ============================================================================
#  开发环境一键启动：后端 FastAPI(:8380) + 前端 Vite(:8220)
#  适用平台：Linux / macOS（Windows 请用 dev.ps1）
#
#  流程：检测端口占用 → 杀掉占用端口的旧进程 → 启动后端与前端
#  退出：Ctrl+C 自动停止本次启动的后端与前端
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKEND_PORT=8380
FRONTEND_PORT=8220

# 检测并释放端口：优先 lsof，其次 ss
free_port() {
  local port=$1
  local pids=""

  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  elif command -v ss >/dev/null 2>&1; then
    pids="$(ss -lptnH 2>/dev/null | grep -E "[:.]$port\b" | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u | tr '\n' ' ')"
  else
    echo "→ 警告：未找到 lsof / ss，跳过端口 $port 检测（请确认无残留进程）" >&2
    return 0
  fi

  if [ -n "$pids" ]; then
    echo "→ 端口 $port 被占用，正在终止旧进程：$pids"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 1
    # 仍未退出则强杀
    pids="$(lsof -ti tcp:"$port" 2>/dev/null || ss -lptnH 2>/dev/null | grep -E "[:.]$port\b" | grep -oE 'pid=[0-9]+' | cut -d= -f2 | tr '\n' ' ' || true)"
    # shellcheck disable=SC2086
    [ -n "$pids" ] && kill -9 $pids 2>/dev/null || true
    echo "✓ 端口 $port 已释放"
  else
    echo "→ 端口 $port 空闲"
  fi
}

echo "== 检查端口 =="
free_port "$BACKEND_PORT"
free_port "$FRONTEND_PORT"

cd "$PROJECT_ROOT"

echo ""
echo "== 启动服务 =="
echo "→ 后端 FastAPI  http://localhost:$BACKEND_PORT  (API 文档: /docs)"
uv run uvicorn backend.main:app --reload --port "$BACKEND_PORT" &
BACKEND_PID=$!

echo "→ 前端 Vite     http://localhost:$FRONTEND_PORT"
( cd "$PROJECT_ROOT/frontend" && npm run dev ) &
FRONTEND_PID=$!

echo ""
echo "✓ 已启动：后端 PID=$BACKEND_PID，前端 PID=$FRONTEND_PID"
echo "  按 Ctrl+C 停止全部服务"
echo ""

cleanup() {
  echo ""
  echo "→ 停止服务…"
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo "✓ 已停止"
}
trap cleanup EXIT INT TERM

# 任一服务退出则整体退出（触发 cleanup）
wait -n 2>/dev/null || wait
