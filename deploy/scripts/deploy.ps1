Write-Host "=== Kong Manager Deployment Script ===" -ForegroundColor Cyan

$ComposeFile = Join-Path $PSScriptRoot "..\docker-compose.yml"

# Kiểm tra nếu người dùng đã truyền DATABASE_URL qua biến môi trường
if (-not $env:DATABASE_URL) {
    Write-Host "DATABASE_URL is not set. A local Postgres container will be used." -ForegroundColor Yellow
    # Chạy toàn bộ stack
    docker compose -f $ComposeFile up -d --build
} else {
    Write-Host "DATABASE_URL is set. Using external database." -ForegroundColor Green
    # Chạy stack nhưng KHÔNG chạy postgres service
    docker compose -f $ComposeFile up -d --build --scale postgres=0 redis backend frontend
}

Write-Host "Deployment finished. Checking status..." -ForegroundColor Cyan
docker compose -f $ComposeFile ps
