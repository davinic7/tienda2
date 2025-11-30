@echo off
chcp 65001 >nul
title Verificar y Subir a GitHub
color 0B

echo.
echo ============================================================
echo   VERIFICAR Y SUBIR A GITHUB
echo ============================================================
echo.

cd /d "%~dp0"

echo 🔍 Verificando conexión con GitHub...
git remote -v
echo.

echo 🔍 Verificando estado del repositorio...
git status --short | head -n 10
echo.

echo 📤 Intentando subir código a GitHub...
echo    Repositorio: https://github.com/davinic7/LaTienda.git
echo.

git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo   ✅ ¡PROYECTO SUBIDO EXITOSAMENTE!
    echo ============================================================
    echo.
    echo 🌐 Tu proyecto está disponible en:
    echo    https://github.com/davinic7/LaTienda
    echo.
    echo ✅ Verifica en GitHub que:
    echo    - Todos los archivos se subieron correctamente
    echo    - NO hay archivos .env (no deben estar)
    echo    - SÍ hay archivos .env.example (deben estar)
    echo.
) else (
    echo.
    echo ============================================================
    echo   ❌ ERROR AL SUBIR
    echo ============================================================
    echo.
    echo Posibles causas:
    echo.
    echo 1. El repositorio NO existe en GitHub
    echo    → Crea el repositorio en: https://github.com/new
    echo      Name: LaTienda
    echo      NO marques ninguna opción adicional
    echo.
    echo 2. Problemas de autenticación
    echo    → Ve a: https://github.com/settings/tokens
    echo      Generate new token (classic)
    echo      Marca "repo" (todos los permisos)
    echo      Usa el token como contraseña cuando Git lo pida
    echo.
    echo 3. El repositorio existe pero el nombre del usuario es diferente
    echo    → Verifica que tu usuario sea: davinic7
    echo.
    echo Después de resolver el problema, ejecuta este script nuevamente.
    echo.
)

pause

