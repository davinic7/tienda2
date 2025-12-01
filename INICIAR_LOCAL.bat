@echo off
echo ========================================
echo   Sistema POS - Inicio Local
echo ========================================
echo.

REM Verificar si existe .env
if not exist "backend\.env" (
    echo [ERROR] No se encontro el archivo backend\.env
    echo.
    echo Por favor crea el archivo backend\.env con las siguientes variables:
    echo.
    echo DATABASE_URL="postgresql://postgres:password@localhost:5432/tienda_pos"
    echo JWT_SECRET="tu-secreto-jwt-seguro"
    echo JWT_REFRESH_SECRET="tu-secreto-refresh-seguro"
    echo PORT=5000
    echo NODE_ENV=development
    echo FRONTEND_URL="http://localhost:5173"
    echo JWT_EXPIRES_IN=3600
    echo JWT_REFRESH_EXPIRES_IN=604800
    echo.
    echo Puedes copiar backend\ENV_EXAMPLE.txt como base.
    echo.
    pause
    exit /b 1
)

echo [1/4] Verificando dependencias...
call npm list >nul 2>&1
if errorlevel 1 (
    echo Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo [ERROR] No se pudieron instalar las dependencias
        pause
        exit /b 1
    )
)

echo [2/4] Generando cliente Prisma...
call npm run db:generate
if errorlevel 1 (
    echo [ADVERTENCIA] Error al generar cliente Prisma
)

echo [3/4] Sincronizando base de datos...
call npm run db:push
if errorlevel 1 (
    echo [ADVERTENCIA] Error al sincronizar base de datos
    echo Verifica que PostgreSQL este corriendo y la URL en backend\.env sea correcta
)

echo [4/4] Iniciando servidores...
echo.
echo ========================================
echo   Servidores iniciandose...
echo ========================================
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:5173
echo ========================================
echo.
echo Presiona Ctrl+C para detener los servidores
echo.

call npm run dev

pause

