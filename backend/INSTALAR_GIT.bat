@echo off
chcp 65001 >nul
title Instalar Git para LaTienda
color 0B

echo.
echo ============================================================
echo   INSTALAR GIT PARA SUBIR PROYECTO A GITHUB
echo ============================================================
echo.
echo Git es necesario para subir tu proyecto a GitHub.
echo.
echo Este script te ayudará a descargar e instalar Git.
echo.
pause

echo.
echo 🔍 Verificando si Git ya está instalado...
where git >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Git ya está instalado en tu sistema
    echo.
    git --version
    echo.
    echo Puedes ejecutar SUBIR_A_GITHUB.ps1 ahora.
    echo.
    pause
    exit /b 0
)

echo.
echo ❌ Git NO está instalado
echo.
echo 📥 Descargando Git para Windows...
echo.
echo Abriendo página de descarga de Git...
start https://git-scm.com/download/win
echo.
echo ============================================================
echo   INSTRUCCIONES DE INSTALACIÓN
echo ============================================================
echo.
echo 1. En la página que se abrió, descarga Git para Windows
echo.
echo 2. Ejecuta el instalador descargado
echo.
echo 3. Durante la instalación:
echo    ✅ Usa las opciones por defecto
echo    ✅ IMPORTANTE: Marca "Add Git to PATH"
echo    ✅ Click en "Next" hasta completar
echo.
echo 4. Después de instalar:
echo    - Cierra esta ventana
echo    - Abre una nueva terminal (PowerShell)
echo    - Ejecuta: .\SUBIR_A_GITHUB.ps1
echo.
echo ============================================================
echo.
pause

