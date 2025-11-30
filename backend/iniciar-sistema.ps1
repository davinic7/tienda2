# Script de Inicio Automático del Sistema POS
# Este script inicia MySQL, Backend y Frontend automáticamente

Write-Host "🚀 Iniciando Sistema POS..." -ForegroundColor Cyan
Write-Host ""

# Verificar si XAMPP está instalado
$xamppPath = "C:\xampp\xampp-control.exe"
if (Test-Path $xamppPath) {
    Write-Host "📦 XAMPP encontrado" -ForegroundColor Green
} else {
    Write-Host "⚠️  XAMPP no encontrado en la ruta por defecto" -ForegroundColor Yellow
    Write-Host "   Asegúrate de iniciar MySQL manualmente desde XAMPP Control Panel" -ForegroundColor Yellow
}

# Verificar MySQL
Write-Host ""
Write-Host "1️⃣ Verificando MySQL..." -ForegroundColor Yellow
$mysqlProcess = Get-Process -Name mysqld -ErrorAction SilentlyContinue
if ($mysqlProcess) {
    Write-Host "   ✅ MySQL ya está corriendo" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  MySQL no está corriendo" -ForegroundColor Yellow
    Write-Host "   💡 Por favor, inicia MySQL desde XAMPP Control Panel" -ForegroundColor Yellow
    Write-Host "   Presiona cualquier tecla después de iniciar MySQL..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}

# Detener procesos anteriores de Node
Write-Host ""
Write-Host "2️⃣ Limpiando procesos anteriores..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   Deteniendo $($nodeProcesses.Count) proceso(s) Node.js..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "   ✅ Procesos anteriores detenidos" -ForegroundColor Green
} else {
    Write-Host "   ✅ No hay procesos anteriores" -ForegroundColor Green
}

# Verificar .env
Write-Host ""
Write-Host "3️⃣ Verificando configuración..." -ForegroundColor Yellow
$envFile = "backend\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "   ❌ Archivo .env no existe" -ForegroundColor Red
    Write-Host "   💡 Copia backend\.env.example a backend\.env y configúralo" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "   ✅ Archivo .env encontrado" -ForegroundColor Green
}

# Iniciar Backend
Write-Host ""
Write-Host "4️⃣ Iniciando Backend..." -ForegroundColor Yellow
$backendScript = @"
cd backend
Write-Host '🚀 Iniciando Backend...' -ForegroundColor Cyan
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendScript
Start-Sleep -Seconds 3

# Iniciar Frontend
Write-Host ""
Write-Host "5️⃣ Iniciando Frontend..." -ForegroundColor Yellow
$frontendScript = @"
cd frontend
Write-Host '🚀 Iniciando Frontend...' -ForegroundColor Cyan
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendScript
Start-Sleep -Seconds 3

# Esperar y verificar
Write-Host ""
Write-Host "⏳ Esperando que los servicios inicien..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verificar
Write-Host ""
Write-Host "6️⃣ Verificando servicios..." -ForegroundColor Yellow
$backendPort = netstat -ano | Select-String ":3000" | Select-String "LISTENING"
$frontendPort = netstat -ano | Select-String ":5173" | Select-String "LISTENING"

if ($backendPort) {
    Write-Host "   ✅ Backend está corriendo" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Backend aún no está listo (puede tardar unos segundos)" -ForegroundColor Yellow
}

if ($frontendPort) {
    Write-Host "   ✅ Frontend está corriendo" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Frontend aún no está listo (puede tardar unos segundos)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✅ Sistema iniciado" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Se abrieron 2 ventanas de PowerShell:" -ForegroundColor Cyan
Write-Host "   - Una para el Backend (puerto 3000)" -ForegroundColor White
Write-Host "   - Una para el Frontend (puerto 5173)" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Abre tu navegador en: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Para detener los servicios, cierra las ventanas de PowerShell" -ForegroundColor Yellow
Write-Host ""

