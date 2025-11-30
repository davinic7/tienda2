@echo off
echo ========================================
echo   INICIAR SISTEMA POS - INICIO RAPIDO
echo ========================================
echo.

echo [1/3] Verificando MySQL...
tasklist /FI "IMAGENAME eq mysqld.exe" 2>NUL | find /I /N "mysqld.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo    OK - MySQL esta corriendo
) else (
    echo    ADVERTENCIA - MySQL no esta corriendo
    echo    Por favor, inicia MySQL desde XAMPP Control Panel
    pause
)

echo.
echo [2/3] Iniciando Backend...
start "Backend - Puerto 3000" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo [3/3] Iniciando Frontend...
start "Frontend - Puerto 5173" cmd /k "cd frontend && npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   Sistema iniciado!
echo ========================================
echo.
echo Se abrieron 2 ventanas:
echo   - Backend (puerto 3000)
echo   - Frontend (puerto 5173)
echo.
echo Abre tu navegador en: http://localhost:5173
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause >nul

