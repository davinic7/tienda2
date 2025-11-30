@echo off
chcp 65001 >nul
title Subir a GitHub - LaTienda
color 0B

echo.
echo ============================================================
echo   SUBIR PROYECTO A GITHUB
echo ============================================================
echo.
echo Repositorio configurado: https://github.com/davinic7/LaTienda.git
echo.
echo IMPORTANTE: Asegurate de que el repositorio existe en GitHub
echo.
pause

echo.
echo 📤 Subiendo código a GitHub...
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
    echo ✅ Verifica que:
    echo    - Todos los archivos se subieron correctamente
    echo    - NO hay archivos .env (no deben estar)
    echo    - SÍ hay archivos .env.example (deben estar)
    echo.
) else (
    echo.
    echo ⚠️  Hubo un problema al subir el código
    echo.
    echo 🔑 Posibles causas:
    echo    1. El repositorio no existe en GitHub (crealo primero)
    echo    2. Problemas de autenticación
    echo.
    echo 💡 Solución:
    echo    1. Crea el repositorio: https://github.com/new
    echo       - Name: LaTienda
    echo       - NO marques ninguna opción adicional
    echo    2. Si te pide autenticación:
    echo       - Ve a: https://github.com/settings/tokens
    echo       - Generate new token (classic)
    echo       - Marca "repo" (todos los permisos)
    echo       - Usa el token como contraseña
    echo.
)

pause

