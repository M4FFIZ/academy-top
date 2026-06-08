# Быстрая настройка после переноса проекта
# Запуск: правый клик → «Выполнить с PowerShell» или:
#   cd C:\Projects\academiya
#   .\scripts\setup-windows.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "=== Академия ТОП — настройка ===" -ForegroundColor Cyan
Write-Host "Папка: $Root" -ForegroundColor Gray

# Очистка кэша Next.js (исправляет ENOENT vendor-chunks)
$nextDir = Join-Path $Root "apps\web\.next"
if (Test-Path $nextDir) {
    Write-Host "Удаляю apps\web\.next ..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $nextDir
}

Write-Host "npm install ..." -ForegroundColor Green
npm install

Write-Host "Prisma: generate + db push + seed ..." -ForegroundColor Green
npm run db:generate
npm run db:push
npm run db:seed

Write-Host ""
Write-Host "Готово! Запуск:" -ForegroundColor Green
Write-Host "  npm run dev" -ForegroundColor White
Write-Host "  http://localhost:3000" -ForegroundColor White
Write-Host "  Пароль: password123" -ForegroundColor Gray
