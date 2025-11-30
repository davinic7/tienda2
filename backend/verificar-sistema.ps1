# Script de Verificación del Sistema POS
# Ejecuta este script para verificar que todo esté funcionando correctamente

Write-Host "🔍 Verificando Sistema POS..." -ForegroundColor Cyan
Write-Host ""

# 1. Verificar MySQL/XAMPP
Write-Host "1️⃣ Verificando MySQL..." -ForegroundColor Yellow
$mysqlProcess = Get-Process -Name mysqld -ErrorAction SilentlyContinue
if ($mysqlProcess) {
    Write-Host "   ✅ MySQL está corriendo (PID: $($mysqlProcess.Id))" -ForegroundColor Green
} else {
    Write-Host "   ❌ MySQL NO está corriendo" -ForegroundColor Red
    Write-Host "   💡 Abre XAMPP Control Panel e inicia MySQL" -ForegroundColor Yellow
}

# 2. Verificar Backend
Write-Host ""
Write-Host "2️⃣ Verificando Backend (puerto 3000)..." -ForegroundColor Yellow
$backendPort = netstat -ano | Select-String ":3000" | Select-String "LISTENING"
if ($backendPort) {
    Write-Host "   ✅ Backend está corriendo en puerto 3000" -ForegroundColor Green
    
    # Probar conexión HTTP
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "   ✅ Backend responde correctamente" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Backend está corriendo pero no responde" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ Backend NO está corriendo" -ForegroundColor Red
    Write-Host "   💡 Ejecuta: cd backend; npm run dev" -ForegroundColor Yellow
}

# 3. Verificar Frontend
Write-Host ""
Write-Host "3️⃣ Verificando Frontend (puerto 5173)..." -ForegroundColor Yellow
$frontendPort = netstat -ano | Select-String ":5173" | Select-String "LISTENING"
if ($frontendPort) {
    Write-Host "   ✅ Frontend está corriendo en puerto 5173" -ForegroundColor Green
    Write-Host "   🌐 Abre: http://localhost:5173" -ForegroundColor Cyan
} else {
    Write-Host "   ❌ Frontend NO está corriendo" -ForegroundColor Red
    Write-Host "   💡 Ejecuta: cd frontend; npm run dev" -ForegroundColor Yellow
}

# 4. Verificar archivo .env
Write-Host ""
Write-Host "4️⃣ Verificando configuración (.env)..." -ForegroundColor Yellow
$envFile = "backend\.env"
if (Test-Path $envFile) {
    Write-Host "   ✅ Archivo .env existe" -ForegroundColor Green
    
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "DATABASE_URL") {
        Write-Host "   ✅ DATABASE_URL está configurado" -ForegroundColor Green
    } else {
        Write-Host "   ❌ DATABASE_URL NO está configurado" -ForegroundColor Red
    }
    
    if ($envContent -match "JWT_SECRET") {
        Write-Host "   ✅ JWT_SECRET está configurado" -ForegroundColor Green
    } else {
        Write-Host "   ❌ JWT_SECRET NO está configurado" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ Archivo .env NO existe" -ForegroundColor Red
    Write-Host "   💡 Copia backend\.env.example a backend\.env y configúralo" -ForegroundColor Yellow
}

# Resumen
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📊 RESUMEN" -ForegroundColor Cyan
Write-Host ""

$allOk = $true

if (-not $mysqlProcess) {
    Write-Host "❌ MySQL no está corriendo" -ForegroundColor Red
    $allOk = $false
}

if (-not $backendPort) {
    Write-Host "❌ Backend no está corriendo" -ForegroundColor Red
    $allOk = $false
}

if (-not $frontendPort) {
    Write-Host "❌ Frontend no está corriendo" -ForegroundColor Red
    $allOk = $false
}

if ($allOk) {
    Write-Host "✅ ¡Todo está funcionando correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Abre tu navegador en: http://localhost:5173" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "💡 Para iniciar todo automáticamente, ejecuta:" -ForegroundColor Yellow
    Write-Host "   .\iniciar-sistema.ps1" -ForegroundColor White
}

Write-Host ""

