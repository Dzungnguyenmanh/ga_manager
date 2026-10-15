# Local CI Verification Script for Windows PowerShell
$ErrorActionPreference = "Stop"

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "   Kong Manager - Local CI Quality Gate   " -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan

$RootDir = (Resolve-Path "$PSScriptRoot\..\..").Path
Write-Host "📂 Project root: $RootDir"

Write-Host "`n▶️ [1/6] Formatting & Vetting Backend (Go)..." -ForegroundColor Yellow
Set-Location "$RootDir\backend"
gofmt -w .
go vet ./...

Write-Host "`n▶️ [2/6] Running Backend Unit Tests (Go)..." -ForegroundColor Yellow
go test -v -cover ./...

Write-Host "`n▶️ [3/6] Testing Backend Build Compilation..." -ForegroundColor Yellow
$env:CGO_ENABLED = "0"
go build -o "$env:TEMP\api_test_bin.exe" ./cmd/api
if (Test-Path "$env:TEMP\api_test_bin.exe") {
    Remove-Item "$env:TEMP\api_test_bin.exe" -Force
}

Write-Host "`n▶️ [4/6] Linting Frontend (ESLint & TypeScript)..." -ForegroundColor Yellow
Set-Location "$RootDir\frontend"
npx tsc --noEmit
npm run lint

Write-Host "`n▶️ [5/6] Running Frontend Unit Tests (Vitest)..." -ForegroundColor Yellow
npm run test

Write-Host "`n▶️ [6/6] Testing Frontend Next.js Production Build..." -ForegroundColor Yellow
npm run build

Set-Location "$RootDir"
Write-Host "`n===========================================" -ForegroundColor Green
Write-Host "🎉 ALL LOCAL CI CHECKS PASSED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
