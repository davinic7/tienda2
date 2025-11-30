# Script para subir proyecto a GitHub
# Requiere Git instalado

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SUBIR PROYECTO LaTienda A GITHUB" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio del proyecto
Set-Location $PSScriptRoot

Write-Host "📂 Directorio actual: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Verificar si Git está instalado
Write-Host "🔍 Verificando instalación de Git..." -ForegroundColor Yellow

$gitPath = Get-Command git -ErrorAction SilentlyContinue

if (-not $gitPath) {
    Write-Host ""
    Write-Host "❌ Git NO está instalado en tu sistema." -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 INSTALACIÓN DE GIT NECESARIA:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   1. Descarga Git desde: https://git-scm.com/download/win" -ForegroundColor White
    Write-Host "   2. Instálalo con las opciones por defecto" -ForegroundColor White
    Write-Host "   3. IMPORTANTE: Marca 'Add Git to PATH' durante la instalación" -ForegroundColor White
    Write-Host "   4. Reinicia esta terminal después de instalar" -ForegroundColor White
    Write-Host ""
    
    # Preguntar si quiere abrir la página
    $response = Read-Host "   ¿Abrir página de descarga ahora? (S/N)"
    if ($response -eq "S" -or $response -eq "s") {
        Start-Process "https://git-scm.com/download/win"
        Write-Host ""
        Write-Host "   ⏳ Después de instalar Git, ejecuta este script nuevamente." -ForegroundColor Yellow
    }
    
    Write-Host ""
    pause
    exit 1
}

Write-Host "✅ Git está instalado: $($gitPath.Source)" -ForegroundColor Green
Write-Host "   Versión: $(git --version)" -ForegroundColor Gray
Write-Host ""

# Verificar si ya es un repositorio Git
Write-Host "🔍 Verificando si ya es un repositorio Git..." -ForegroundColor Yellow

if (Test-Path .git) {
    Write-Host "✅ Ya es un repositorio Git" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "📦 Inicializando repositorio Git..." -ForegroundColor Yellow
    git init
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Repositorio inicializado correctamente" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "❌ Error al inicializar repositorio" -ForegroundColor Red
        pause
        exit 1
    }
}

# Verificar archivos .env
Write-Host "🔍 Verificando archivos sensibles (.env)..." -ForegroundColor Yellow
Write-Host ""

$envFiles = @()
if (Test-Path "backend\.env") { $envFiles += "backend\.env" }
if (Test-Path "frontend\.env") { $envFiles += "frontend\.env" }

if ($envFiles.Count -gt 0) {
    foreach ($envFile in $envFiles) {
        Write-Host "   ⚠️  Encontrado: $envFile" -ForegroundColor Yellow
        $ignored = git check-ignore $envFile 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "      ❌ NO está siendo ignorado. Removiendo del staging..." -ForegroundColor Red
            git rm --cached $envFile 2>$null
            Write-Host "      ✅ Removido del staging" -ForegroundColor Green
        } else {
            Write-Host "      ✅ Está siendo ignorado correctamente" -ForegroundColor Green
        }
        Write-Host ""
    }
} else {
    Write-Host "✅ No se encontraron archivos .env (correcto)" -ForegroundColor Green
    Write-Host ""
}

# Configurar Git (si no está configurado)
Write-Host "🔧 Configurando Git..." -ForegroundColor Yellow
$gitUser = git config --global user.name
$gitEmail = git config --global user.email

if (-not $gitUser) {
    Write-Host "   📝 Configurando usuario..." -ForegroundColor Gray
    git config --global user.name "Davin"
}

if (-not $gitEmail) {
    Write-Host "   📝 Configurando email..." -ForegroundColor Gray
    git config --global user.email "davin@example.com"
}

Write-Host "✅ Configuración de Git lista" -ForegroundColor Green
if ($gitUser) {
    Write-Host "   Usuario: $gitUser" -ForegroundColor Gray
} else {
    Write-Host "   Usuario: Davin (puedes cambiar con: git config --global user.name 'Tu Nombre')" -ForegroundColor Gray
}
Write-Host ""

# Agregar archivos
Write-Host "📦 Agregando archivos al staging..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Archivos agregados correctamente" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "❌ Error al agregar archivos" -ForegroundColor Red
    pause
    exit 1
}

# Verificar que no hay .env en el staging
Write-Host "🔍 Verificando que no hay archivos .env en el staging..." -ForegroundColor Yellow
$stagedFiles = git status --short 2>$null | Select-String "\.env"
if ($stagedFiles) {
    Write-Host "   ⚠️  ADVERTENCIA: Se encontraron archivos .env en el staging" -ForegroundColor Yellow
    Write-Host "      Removiendo..." -ForegroundColor Gray
    git reset HEAD backend\.env 2>$null
    git reset HEAD frontend\.env 2>$null
    Write-Host "      ✅ Archivos .env removidos" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "✅ No hay archivos .env en el staging (correcto)" -ForegroundColor Green
    Write-Host ""
}

# Mostrar estado
Write-Host "📋 Estado actual del repositorio:" -ForegroundColor Yellow
Write-Host ""
git status --short | Select-Object -First 30
$fileCount = (git status --short 2>$null | Measure-Object -Line).Lines
Write-Host ""
Write-Host "📊 Total de archivos preparados: $fileCount" -ForegroundColor Cyan
Write-Host ""

# Crear commit
Write-Host "📝 Creando commit inicial..." -ForegroundColor Yellow
Write-Host ""

$commitMessage = @"
Initial commit: Sistema POS Multi-local - Funcionalidades completas

- Sistema de autenticación JWT (Access Token + Refresh Token)
- Gestión de roles (ADMIN, VENDEDOR)
- Sistema de turnos para vendedores
- Gestión multi-local de inventario y ventas
- Sistema de auditoría y actividades
- Reportes y analytics en tiempo real
- Atajos de teclado y focus trap en modales
- Confirmaciones para acciones críticas
- Integración con Socket.io para sincronización en tiempo real
- Sistema de crédito para clientes
- Tickets de venta imprimibles
- Dashboard diferenciado por rol
"@

git commit -m $commitMessage

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Commit creado correctamente" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "⚠️  No se pudo crear el commit" -ForegroundColor Yellow
    Write-Host "   (Puede ser que no haya cambios nuevos o que el commit esté vacío)" -ForegroundColor Gray
    Write-Host ""
}

# Cambiar rama a main
Write-Host "🔄 Configurando rama principal..." -ForegroundColor Yellow
git branch -M main 2>$null
Write-Host "✅ Rama configurada como 'main'" -ForegroundColor Green
Write-Host ""

# Instrucciones para crear repositorio en GitHub
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  CREAR REPOSITORIO EN GITHUB" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📌 Ahora necesitas crear el repositorio en GitHub:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Ve a: https://github.com/new" -ForegroundColor White
Write-Host "   2. Repository name: LaTienda" -ForegroundColor White
Write-Host "   3. Description: Sistema POS Multi-local - Gestión de inventario y ventas" -ForegroundColor White
Write-Host "   4. Visibility: " -ForegroundColor White
Write-Host "      ✅ Private (recomendado para proyectos personales)" -ForegroundColor Green
Write-Host "      ⚪ Public (si quieres que sea público)" -ForegroundColor White
Write-Host "   5. ❌ NO marques 'Initialize with README'" -ForegroundColor Red
Write-Host "   6. ❌ NO marques 'Add .gitignore'" -ForegroundColor Red
Write-Host "   7. ❌ NO marques 'Choose a license'" -ForegroundColor Red
Write-Host "   8. Click en 'Create repository'" -ForegroundColor White
Write-Host ""

$created = Read-Host "¿Ya creaste el repositorio en GitHub? (S/N)"

if ($created -ne "S" -and $created -ne "s") {
    Write-Host ""
    Write-Host "🔗 Abriendo GitHub para crear el repositorio..." -ForegroundColor Yellow
    Start-Process "https://github.com/new"
    Write-Host ""
    Write-Host "⏳ Espera a que crees el repositorio y luego presiona Enter..." -ForegroundColor Yellow
    Read-Host
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  CONFIGURAR REPOSITORIO REMOTO" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$githubUser = Read-Host "📝 Ingresa tu usuario de GitHub"

if ([string]::IsNullOrWhiteSpace($githubUser)) {
    Write-Host "❌ Usuario no puede estar vacío" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "🔗 Configurando repositorio remoto..." -ForegroundColor Yellow

# Remover remoto si existe
git remote remove origin 2>$null

# Agregar nuevo remoto
git remote add origin "https://github.com/$githubUser/LaTienda.git"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Repositorio remoto configurado: https://github.com/$githubUser/LaTienda.git" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "❌ Error al configurar repositorio remoto" -ForegroundColor Red
    pause
    exit 1
}

# Verificar remoto
Write-Host "🔍 Verificando configuración del remoto..." -ForegroundColor Yellow
git remote -v
Write-Host ""

# Subir código
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SUBIR CÓDIGO A GITHUB" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📤 Subiendo código a GitHub..." -ForegroundColor Yellow
Write-Host "   Esto puede pedirte credenciales de GitHub" -ForegroundColor Gray
Write-Host ""

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "  ✅ ¡PROYECTO SUBIDO EXITOSAMENTE!" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Tu proyecto está disponible en:" -ForegroundColor Cyan
    Write-Host "   https://github.com/$githubUser/LaTienda" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Próximos pasos:" -ForegroundColor Yellow
    Write-Host "   1. Ve a tu repositorio para verificar que todo se subió" -ForegroundColor White
    Write-Host "   2. Verifica que NO hay archivos .env (no deben estar)" -ForegroundColor White
    Write-Host "   3. Verifica que SÍ hay archivos .env.example (deben estar)" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "⚠️  Hubo un problema al subir el código" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔑 Posibles causas:" -ForegroundColor Yellow
    Write-Host "   1. El repositorio no existe en GitHub" -ForegroundColor White
    Write-Host "   2. Problemas de autenticación" -ForegroundColor White
    Write-Host "   3. Necesitas un Personal Access Token" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Solución:" -ForegroundColor Cyan
    Write-Host "   1. Verifica que el repositorio existe: https://github.com/$githubUser/LaTienda" -ForegroundColor White
    Write-Host "   2. Si te pide autenticación:" -ForegroundColor White
    Write-Host "      - Ve a: https://github.com/settings/tokens" -ForegroundColor White
    Write-Host "      - Generate new token (classic)" -ForegroundColor White
    Write-Host "      - Marca `"repo`" (todos los permisos)" -ForegroundColor White
    Write-Host "      - Usa el token como contraseña" -ForegroundColor White
    Write-Host ""
    Write-Host "   Intenta nuevamente con: git push -u origin main" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "📖 Para más detalles, lee COMANDOS_GITHUB.md" -ForegroundColor Cyan
Write-Host ""
pause

