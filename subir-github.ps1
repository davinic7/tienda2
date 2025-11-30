# Script para subir el proyecto a GitHub
# IMPORTANTE: Cambia TU_USUARIO por tu nombre de usuario de GitHub

$GITHUB_USER = "TU_USUARIO"  # ⚠️ CAMBIA ESTO
$REPO_NAME = "tienda2"

Write-Host "🚀 Preparando para subir a GitHub..." -ForegroundColor Cyan
Write-Host ""

# Verificar que Git esté inicializado
if (-not (Test-Path ".git")) {
    Write-Host "❌ Error: No se encontró un repositorio Git" -ForegroundColor Red
    Write-Host "   Ejecuta primero: git init" -ForegroundColor Yellow
    exit 1
}

# Verificar estado
Write-Host "📋 Verificando estado del repositorio..." -ForegroundColor Yellow
$status = git status --short
if ($status) {
    Write-Host "   ⚠️  Hay cambios sin commitear:" -ForegroundColor Yellow
    Write-Host $status
    Write-Host ""
    $confirm = Read-Host "¿Deseas hacer commit de estos cambios? (s/n)"
    if ($confirm -eq "s" -or $confirm -eq "S") {
        git add .
        $message = Read-Host "Mensaje del commit (Enter para usar mensaje por defecto)"
        if ([string]::IsNullOrWhiteSpace($message)) {
            $message = "Actualización del sistema POS"
        }
        git commit -m $message
    }
}

# Verificar si el remoto existe
$remote = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "📡 Configurando remoto de GitHub..." -ForegroundColor Yellow
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
} else {
    Write-Host "📡 Remoto ya configurado: $remote" -ForegroundColor Green
    $confirm = Read-Host "¿Deseas cambiar la URL del remoto? (s/n)"
    if ($confirm -eq "s" -or $confirm -eq "S") {
        git remote set-url origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
    }
}

# Verificar rama
$branch = git branch --show-current
if ($branch -ne "main" -and $branch -ne "master") {
    Write-Host "🌿 Cambiando a rama main..." -ForegroundColor Yellow
    if ($branch -eq "master") {
        git branch -M main
    } else {
        git checkout -b main
    }
}

Write-Host ""
Write-Host "📤 Subiendo a GitHub..." -ForegroundColor Cyan
Write-Host "   Repositorio: https://github.com/$GITHUB_USER/$REPO_NAME" -ForegroundColor Gray
Write-Host ""

# Intentar hacer push
try {
    git push -u origin main
    Write-Host ""
    Write-Host "✅ ¡Proyecto subido exitosamente!" -ForegroundColor Green
    Write-Host "   Visita: https://github.com/$GITHUB_USER/$REPO_NAME" -ForegroundColor Cyan
} catch {
    Write-Host ""
    Write-Host "❌ Error al subir:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Posibles soluciones:" -ForegroundColor Yellow
    Write-Host "   1. Verifica que el repositorio exista en GitHub" -ForegroundColor White
    Write-Host "   2. Verifica tu autenticación (token o SSH)" -ForegroundColor White
    Write-Host "   3. Asegúrate de tener permisos en el repositorio" -ForegroundColor White
    Write-Host ""
    Write-Host "   Para crear el repositorio, ve a:" -ForegroundColor Cyan
    Write-Host "   https://github.com/new" -ForegroundColor Cyan
}

