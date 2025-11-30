@echo off
echo ========================================
echo   VERIFICAR ESTADO DEL SISTEMA
echo ========================================
echo.

echo [1/4] Verificando MySQL...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo    OK - MySQL esta corriendo
    set MYSQL_OK=1
) else (
    echo    ERROR - MySQL NO esta corriendo
    echo    Inicia MySQL desde XAMPP Control Panel
    set MYSQL_OK=0
)

echo.
echo [2/4] Verificando Backend (puerto 3000)...
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul
if "%ERRORLEVEL%"=="0" (
    echo    OK - Backend esta corriendo
    set BACKEND_OK=1
) else (
    echo    ERROR - Backend NO esta corriendo
    echo    Ejecuta: INICIAR.bat o cd backend ^&^& npm run dev
    set BACKEND_OK=0
)

echo.
echo [3/4] Verificando Frontend (puerto 5173)...
netstat -ano | findstr ":5173" | findstr "LISTENING" >nul
if "%ERRORLEVEL%"=="0" (
    echo    OK - Frontend esta corriendo
    echo    Abre: http://localhost:5173
    set FRONTEND_OK=1
) else (
    echo    ERROR - Frontend NO esta corriendo
    echo    Ejecuta: INICIAR.bat o cd frontend ^&^& npm run dev
    set FRONTEND_OK=0
)

echo.
echo [4/4] Verificando configuracion (.env)...
if exist "backend\.env" (
    echo    OK - Archivo .env existe
    set ENV_OK=1
) else (
    echo    ERROR - Archivo .env NO existe
    echo    Copia backend\.env.example a backend\.env
    set ENV_OK=0
)

echo.
echo ========================================
echo   RESUMEN
echo ========================================
echo.

if "%MYSQL_OK%"=="1" if "%BACKEND_OK%"=="1" if "%FRONTEND_OK%"=="1" if "%ENV_OK%"=="1" (
    echo TODO OK - Sistema funcionando correctamente!
    echo.
    echo Abre tu navegador en: http://localhost:5173
) else (
    echo Hay problemas que resolver:
    if "%MYSQL_OK%"=="0" echo   - Inicia MySQL desde XAMPP
    if "%BACKEND_OK%"=="0" echo   - Inicia el Backend
    if "%FRONTEND_OK%"=="0" echo   - Inicia el Frontend
    if "%ENV_OK%"=="0" echo   - Configura el archivo .env
    echo.
    echo Para iniciar todo automaticamente, ejecuta: INICIAR.bat
)

echo.
pause

