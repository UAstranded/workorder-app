<#
.SYNOPSIS
  Start the Work Order Manager natively on Windows (no Docker).
.DESCRIPTION
  Checks prerequisites, installs dependencies, seeds the database
  if needed, then launches the backend and frontend in separate
  terminal windows and opens the app in the default browser.
#>

param([switch]$NoBrowser)

$host.ui.RawUI.WindowTitle = "Work Order Manager - Startup"

$rootDir    = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"
$envTarget  = Join-Path $backendDir ".env"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Work Order Manager - Native Windows Startup" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# -------------------------------
# 1. PostgreSQL
# -------------------------------
Write-Host "[1/5] Checking PostgreSQL..." -ForegroundColor Yellow
$pg = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if (-not $pg) {
    Write-Host "[ERROR] PostgreSQL service not found." -ForegroundColor Red
    Write-Host "        Install from: https://www.postgresql.org/download/windows/" -ForegroundColor Red
    Write-Host "        Make sure the service name starts with 'postgresql'." -ForegroundColor Red
    exit 1
}
if ($pg.Status -eq "Running") {
    Write-Host "  [OK] PostgreSQL is running ($($pg.Name))." -ForegroundColor Green
} else {
    Write-Host "  [..] PostgreSQL is stopped. Starting it..." -ForegroundColor Yellow
    Start-Service -Name $pg.Name -ErrorAction Stop
    Write-Host "  [OK] PostgreSQL started." -ForegroundColor Green
}

# -------------------------------
# 2. Environment file
# -------------------------------
Write-Host "[2/5] Setting up environment..." -ForegroundColor Yellow
$envWindows = Join-Path $rootDir ".env.windows"
if (-not (Test-Path $envTarget)) {
    if (Test-Path $envWindows) {
        Copy-Item $envWindows $envTarget
        Write-Host "  [OK] Copied .env.windows to backend\.env" -ForegroundColor Green
    } else {
        Write-Host "  [..] No .env.windows found - using existing backend\.env or defaults" -ForegroundColor Yellow
    }
} else {
    Write-Host "  [OK] backend\.env already exists (using as-is)" -ForegroundColor Green
}

# -------------------------------
# 3. Backend dependencies
# -------------------------------
Write-Host "[3/5] Backend Python dependencies..." -ForegroundColor Yellow
$venvDir = Join-Path $backendDir ".venv"
$pythonExe = Join-Path $venvDir "Scripts" "python.exe"
$pipExe    = Join-Path $venvDir "Scripts" "pip.exe"

if (-not (Test-Path $pythonExe)) {
    Write-Host "       Creating virtual environment..." -ForegroundColor Gray
    & python -m venv $venvDir
    if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Failed to create venv"; exit 1 }
}
Write-Host "       Installing requirements..." -ForegroundColor Gray
& $pipExe install -q -r (Join-Path $backendDir "requirements.txt")
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] pip install failed"; exit 1 }
Write-Host "  [OK] Backend dependencies ready" -ForegroundColor Green

# -------------------------------
# 4. Frontend dependencies
# -------------------------------
Write-Host "[4/5] Frontend npm dependencies..." -ForegroundColor Yellow
$nodeModules = Join-Path $frontendDir "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "       Running npm install..." -ForegroundColor Gray
    Push-Location $frontendDir
    & npm install --silent
    Pop-Location
    if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] npm install failed"; exit 1 }
}
Write-Host "  [OK] Frontend dependencies ready" -ForegroundColor Green

# -------------------------------
# 5. Seed
# -------------------------------
Write-Host "[5/5] Seeding database..." -ForegroundColor Yellow
Push-Location $backendDir
$env:PYTHONPATH = $backendDir
& $pythonExe seed.py
Pop-Location
Write-Host ""

# -------------------------------
# Launch
# -------------------------------
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host " Launching services..." -ForegroundColor Cyan
Write-Host ""

# Backend
Write-Host "  [..] Backend (port 8000) - starting in new window..." -ForegroundColor Cyan
Start-Process -FilePath $pythonExe -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" `
    -WorkingDirectory $backendDir -WindowStyle Normal

# Frontend
Write-Host "  [..] Frontend (port 4170) - starting in new window..." -ForegroundColor Cyan
Start-Process -FilePath "npx.cmd" -ArgumentList "vite --host" `
    -WorkingDirectory $frontendDir -WindowStyle Normal

Start-Sleep -Seconds 5

$url = "http://localhost:4170"
if (-not $NoBrowser) {
    Write-Host "       Opening browser..." -ForegroundColor Gray
    Start-Process $url
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  App is ready at $url" -ForegroundColor Green
Write-Host "  Login:  admin / admin123" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "To stop, close the two terminal windows that just opened." -ForegroundColor Gray
Write-Host "(Or press Ctrl+C in each one.)" -ForegroundColor Gray
