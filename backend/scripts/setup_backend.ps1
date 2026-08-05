#!/usr/bin/env pwsh
# setup_backend.ps1
# ============================================================
#  One-shot script to set up the backend from scratch.
#  Run from the project root:  .\backend\scripts\setup_backend.ps1
# ============================================================

param(
    [string]$PgSuperUser = "postgres",      # PostgreSQL superuser
    [string]$PgHost      = "localhost",
    [int]   $PgPort      = 5432
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Fleet Tracking — Backend Setup Script      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Create DB + user ──────────────────────────────────────────────────
Write-Host "▶  [1/4] Creating PostgreSQL database and user..." -ForegroundColor Yellow
$sqlScript = Join-Path $PSScriptRoot "create_db.sql"
psql -U $PgSuperUser -h $PgHost -p $PgPort -f $sqlScript
Write-Host "✅  Database ready." -ForegroundColor Green

# ── Step 2: Create virtual environment ───────────────────────────────────────
$backendDir = Join-Path $PSScriptRoot ".."
Set-Location $backendDir

if (-not (Test-Path "venv")) {
    Write-Host ""
    Write-Host "▶  [2/4] Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
} else {
    Write-Host ""
    Write-Host "ℹ️   [2/4] Virtual environment already exists — skipping." -ForegroundColor DarkGray
}

# Activate
& ".\venv\Scripts\Activate.ps1"
Write-Host "✅  Virtual environment activated." -ForegroundColor Green

# ── Step 3: Install dependencies ──────────────────────────────────────────────
Write-Host ""
Write-Host "▶  [3/4] Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet
Write-Host "✅  Dependencies installed." -ForegroundColor Green

# ── Step 4: Copy .env and run Alembic migrations ─────────────────────────────
Write-Host ""
Write-Host "▶  [4/4] Setting up environment and running migrations..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "  📄 Created .env from .env.example" -ForegroundColor DarkGray
} else {
    Write-Host "  ℹ️  .env already exists — not overwriting." -ForegroundColor DarkGray
}

alembic upgrade head
Write-Host "✅  Migrations applied." -ForegroundColor Green

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅  Setup complete!                                  ║" -ForegroundColor Green
Write-Host "║                                                       ║" -ForegroundColor Green
Write-Host "║  Start the server:                                    ║" -ForegroundColor Green
Write-Host "║    uvicorn app.main:app --reload --port 8000          ║" -ForegroundColor Green
Write-Host "║                                                       ║" -ForegroundColor Green
Write-Host "║  Swagger UI: http://localhost:8000/docs               ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
