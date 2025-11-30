@echo off
chcp 65001 >nul
title Conectar con GitHub - LaTienda
color 0B

echo.
echo ============================================================
echo   CONECTAR Y SUBIR A GITHUB
echo ============================================================
echo.
echo El repositorio Git local ya esta listo.
echo Ahora necesitas conectarlo con GitHub.
echo.
pause

echo.
set /p GITHUB_USER="Ingresa tu usuario de GitHub: "

if "%GITHUB_USER%"=="" (
    echo.
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
) else (
    echo.
    echo ⚠️  Hubo un problema al subir el código
    echo.
    echo 🔑 Si te pide autenticación:
    echo    1. Ve a: https://github.com/settings/tokens
    echo    2. Generate new token (classic)
    echo    3. Marca "repo" (todos los permisos)
    echo    4. Usa el token como contraseña
    echo.
)

pause

