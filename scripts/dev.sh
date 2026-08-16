#!/usr/bin/env bash
# ============================================================================
#  开发环境一键启动：前端 Vite(:8220)
#  适用平台：Linux / macOS（Windows 请用 dev.ps1）
#
#  说明：方案调整后数据为静态 JSON（frontend/public/data/），前端独立运行，
#        不再需要后端服务。
#
#  流程：检测端口占用 -> 杀掉旧进程 -> 启动前端；Ctrl+C 停止
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_PORT=8220

free_port() {
  local port=$1 pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  elif command -v ss >/dev/null 2>&1; then
    pids="$(ss -lptnH 2>/dev/null | grep -E "[:.]$port\b" | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u | tr '\n' ' ')"
  else
    echo "→ 警告：未找到 lsof / ss，跳过端口 $port 检测" >&2
    return 0
  fi
  if [ -n "$pids" ]; then
    echo "→ 端口 $port 被占用，终止旧进程：$pids"
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 1
    echo "✓ 端口 $port 已释放"
  else
    echo "→ 端口 $port 空闲"
  fi
}

echo "== 检查端口 =="
free_port "$FRONTEND_PORT"

echo ""
echo "== 启动服务 =="
echo "→ 前端 Vite     http://localhost:$FRONTEND_PORT"
( cd "$PROJECT_ROOT/frontend" && npm run dev ) &
FRONTEND_PID=$!

echo ""
echo "✓ 已启动：前端 PID=$FRONTEND_PID"
echo "  按 Ctrl+C 停止"
echo ""

cleanup() {
  echo ""
  echo "→ 停止服务…"
  kill "$FRONTEND_PID" 2>/dev/null || true
  wait "$FRONTEND_PID" 2>/dev/null || true
  echo "✓ 已停止"
}
trap cleanup EXIT INT TERM

wait -n 2>/dev/null || wait
