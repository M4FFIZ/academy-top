# Запуск dev-серверов
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$nextDir = Join-Path $Root "apps\web\.next"
if (Test-Path $nextDir) {
    # Опционально: раскомментируйте следующую строку при ошибках кэша
    # Remove-Item -Recurse -Force $nextDir
}

Write-Host "Запуск API + Web ..." -ForegroundColor Cyan
npm run dev
