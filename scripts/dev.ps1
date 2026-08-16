# ============================================================================
#  开发环境一键启动：前端 Vite(:8220)
#  适用平台：Windows PowerShell / PowerShell Core
#
#  说明：方案调整后数据为静态 JSON（frontend/public/data/），前端独立运行，
#        不再需要后端服务。
#
#  流程：检测端口占用 -> 杀掉占用端口的旧进程(含子进程树) -> 启动前端
#  退出：Ctrl+C 自动停止
#
#  用法：  pwsh -File scripts/dev.ps1
#          powershell -ExecutionPolicy Bypass -File scripts\dev.ps1
# ============================================================================
[CmdletBinding()]
param(
    [int]$FrontendPort = 8220
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

# 取得占用某端口的监听进程 PID 列表
function Get-PortListenerPids([int]$Port) {
    @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique)
}

# 释放端口：杀掉监听该端口的进程及其子进程树
function Stop-PortTree([int]$Port, [string]$Label) {
    $pids = Get-PortListenerPids $Port
    if ($pids.Count -eq 0) {
        Write-Host "→ 端口 $Port ($Label) 空闲" -ForegroundColor DarkGray
        return
    }
    foreach ($procId in $pids) {
        $name = "unknown"
        try {
            $name = (Get-Process -Id $procId -ErrorAction Stop).ProcessName
        } catch { }
        Write-Host "→ 端口 $Port ($Label) 被占用 (PID=$procId, $name)，终止进程树..." -ForegroundColor Yellow
        # taskkill /T 杀掉整棵进程树
        & taskkill.exe /F /T /PID $procId 2>$null | Out-Null
    }
    Start-Sleep -Milliseconds 800
    Write-Host "✓ 端口 $Port 已释放" -ForegroundColor Green
}

Write-Host "== 检查端口 ==" -ForegroundColor White
Stop-PortTree $FrontendPort "前端"

Write-Host ""
Write-Host "== 启动服务 ==" -ForegroundColor White

$frontendSplat = @{
    FilePath         = "npm.cmd"
    ArgumentList     = @("run", "dev")
    WorkingDirectory = (Join-Path $ProjectRoot "frontend")
    PassThru         = $true
    NoNewWindow      = $true
}
Write-Host "→ 前端 Vite     http://localhost:$FrontendPort" -ForegroundColor Cyan
$frontend = Start-Process @frontendSplat

Write-Host ""
Write-Host "✓ 已启动：前端 PID=$($frontend.Id)" -ForegroundColor Green
Write-Host "  按 Ctrl+C 停止" -ForegroundColor Magenta
Write-Host ""

function Stop-All {
    Write-Host "→ 停止服务..." -ForegroundColor Yellow
    if ($null -ne $frontend -and -not $frontend.HasExited) {
        & taskkill.exe /F /T /PID $frontend.Id 2>$null | Out-Null
    }
    Stop-PortTree $FrontendPort "前端"
    Write-Host "✓ 已停止" -ForegroundColor Green
}

try {
    # 阻塞直到前端退出或用户按 Ctrl+C（Ctrl+C 会触发 finally）
    while ($frontend -and -not $frontend.HasExited) {
        Start-Sleep -Seconds 1
    }
}
finally {
    Stop-All
}
