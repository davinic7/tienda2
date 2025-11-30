@echo off
chcp 65001 >nul
title Subir Proyecto a GitHub - LaTienda
color 0A

echo.
echo ============================================================
echo   SUBIR PROYECTO LaTienda A GITHUB
echo ============================================================
echo.

REM Cambiar al directorio del proyecto
cd /d "%~dp0"

echo 📂 Directorio actual: %CD%
echo.

REM Verificar si Git está instalado
echo 🔍 Verificando instalación de Git...
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Git NO está instalado en tu sistema.
    echo.
    echo 📥 INSTALACIÓN DE GIT NECESARIA:
    echo.
    echo    1. Abriendo página de descarga de Git...
    echo.
    start https://git-scm.com/download/win
    echo.
    echo    ⚠️  Por favor:
    echo       - Descarga Git para Windows
    echo       - Instálalo con las opciones por defecto
    echo       - Asegúrate de marcar "Add Git to PATH"
    echo       - Reinicia esta terminal después de instalar
    echo.
    echo    Una vez instalado, ejecuta este script nuevamente.
    echo.
    pause
    exit /b 1
)

echo ✅ Git está instalado
git --version
echo.

REM Verificar si ya es un repositorio Git
echo 🔍 Verificando si ya es un repositorio Git...
if exist .git (
    echo ✅ Ya es un repositorio Git
    echo.
) else (
    echo 📦 Inicializando repositorio Git...
    git init
    if %ERRORLEVEL% EQU 0 (
        echo ✅ Repositorio inicializado correctamente
        echo.
    ) else (
        echo ❌ Error al inicializar repositorio
        pause
        exit /b 1
    )
)

REM Verificar archivos sensibles
echo 🔍 Verificando archivos sensibles (.env)...
echo.

set ENV_FOUND=0

if exist backend\.env (
    echo ⚠️  Encontrado: backend\.env
    set ENV_FOUND=1
    git check-ignore backend\.env >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo    ❌ NO está siendo ignorado. Removiendo...
        git rm --cached backend\.env 2>nul
        echo    ✅ Removido del staging
    ) else (
        echo    ✅ Está siendo ignorado correctamente
    )
    echo.
)

if exist frontend\.env (
    echo ⚠️  Encontrado: frontend\.env
    set ENV_FOUND=1
    git check-ignore frontend\.env >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo    ❌ NO está siendo ignorado. Removiendo...
        git rm --cached frontend\.env 2>nul
        echo    ✅ Removido del staging
    ) else (
        echo    ✅ Está siendo ignorado correctamente
    )
    echo.
)

if %ENV_FOUND% EQU 0 (
    echo ✅ No se encontraron archivos .env (bueno)
    echo.
)

REM Configurar Git (si no está configurado)
echo 🔧 Configurando Git...
git config --global user.name "Davin" >nul 2>&1
git config --global user.email "davin@example.com" >nul 2>&1
echo ✅ Configuración de Git lista
echo    (Puedes cambiar esto después con: git config --global user.name "Tu Nombre")
echo.

REM Agregar archivos
echo 📦 Agregando archivos al staging...
git add .
if %ERRORLEVEL% EQU 0 (
    echo ✅ Archivos agregados correctamente
    echo.
) else (
    echo ❌ Error al agregar archivos
    pause
    exit /b 1
)

REM Mostrar estado
echo 📋 Estado actual del repositorio:
echo.
git status --short | head -n 30
echo.
set /a FILE_COUNT=0
for /f %%i in ('git status --short 2^>nul ^| find /c /v ""') do set FILE_COUNT=%%i
echo 📊 Total de archivos preparados: %FILE_COUNT%
echo.

REM Verificar que no hay .env en el staging
git status --short | findstr /i "\.env" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  ADVERTENCIA: Se encontraron archivos .env en el staging
    echo    Removiendo archivos .env del staging...
    git reset HEAD backend\.env 2>nul
    git reset HEAD frontend\.env 2>nul
    echo    ✅ Archivos .env removidos
    echo.
)

REM Crear commit
echo 📝 Creando commit inicial...
echo.
git commit -m "Initial commit: Sistema POS Multi-local - Funcionalidades completas

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
- Dashboard diferenciado por rol"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Commit creado correctamente
    echo.
) else (
    echo.
    echo ❌ Error al crear commit
    echo    (Puede ser que no haya cambios nuevos)
    echo.
)

REM Cambiar rama a main
echo 🔄 Configurando rama principal...
git branch -M main 2>nul
echo ✅ Rama configurada como 'main'
echo.

echo ============================================================
echo   CREAR REPOSITORIO EN GITHUB
echo ============================================================
echo.
echo 📌 Ahora necesitas crear el repositorio en GitHub:
echo.
echo    1. Ve a: https://github.com/new
echo    2. Repository name: LaTienda
echo    3. Description: Sistema POS Multi-local - Gestión de inventario y ventas
echo    4. Visibility: 
echo       - ✅ Private (recomendado para proyectos personales)
echo       - ⚪ Public (si quieres que sea público)
echo    5. ❌ NO marques "Initialize with README"
echo    6. ❌ NO marques "Add .gitignore" 
echo    7. ❌ NO marques "Choose a license"
echo    8. Click en "Create repository"
echo.
echo 📌 Una vez creado, GitHub te mostrará comandos.
echo    Usa estos comandos en lugar de los de GitHub:
echo.
echo ============================================================
echo.
echo ¿Ya creaste el repositorio en GitHub? (S/N)
set /p CREATED="> "

if /i not "%CREATED%"=="S" (
    echo.
    echo 🔗 Abriendo GitHub para crear el repositorio...
    start https://github.com/new
    echo.
    echo ⏳ Espera a que crees el repositorio y luego presiona Enter...
    pause >nul
)

echo.
echo ============================================================
echo   CONFIGURAR REPOSITORIO REMOTO
echo ============================================================
echo.
echo 📝 Ingresa tu usuario de GitHub:
set /p GITHUB_USER="Usuario de GitHub: "

if "%GITHUB_USER%"=="" (
    echo ❌ Usuario no puede estar vacío
    pause
    exit /b 1
)

echo.
echo 🔗 Configurando repositorio remoto...
git remote remove origin 2>nul
git remote add origin https://github.com/%GITHUB_USER%/LaTienda.git

if %ERRORLEVEL% EQU 0 (
    echo ✅ Repositorio remoto configurado: https://github.com/%GITHUB_USER%/LaTienda.git
    echo.
) else (
    echo ❌ Error al configurar repositorio remoto
    pause
    exit /b 1
)

REM Verificar remoto
echo 🔍 Verificando configuración del remoto...
git remote -v
echo.

echo ============================================================
echo   SUBIR CÓDIGO A GITHUB
echo ============================================================
echo.
echo 📤 Subiendo código a GitHub...
echo    Esto puede pedirte credenciales de GitHub
echo.

git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo   ✅ ¡PROYECTO SUBIDO EXITOSAMENTE!
    echo ============================================================
    echo.
    echo 🌐 Tu proyecto está disponible en:
    echo    https://github.com/%GITHUB_USER%/LaTienda
    echo.
    echo 📋 Próximos pasos:
    echo    1. Ve a tu repositorio para verificar que todo se subió
    echo    2. Verifica que NO hay archivos .env (no deben estar)
    echo    3. Verifica que SÍ hay archivos .env.example (deben estar)
    echo.
) else (
    echo.
    echo ⚠️  Hubo un problema al subir el código
    echo.
    echo 🔑 Posibles causas:
    echo    1. El repositorio no existe en GitHub
    echo    2. Problemas de autenticación
    echo    3. Necesitas un Personal Access Token
    echo.
    echo 💡 Solución:
    echo    1. Verifica que el repositorio existe: https://github.com/%GITHUB_USER%/LaTienda
    echo    2. Si te pide autenticación:
    echo       - Ve a: https://github.com/settings/tokens
    echo       - Generate new token (classic)
    echo       - Marca "repo" (todos los permisos)
    echo       - Usa el token como contraseña
    echo.
    echo    Intenta nuevamente con: git push -u origin main
    echo.
)

echo.
echo 📖 Para más detalles, lee SUBIR_GITHUB.md
echo.
pause

