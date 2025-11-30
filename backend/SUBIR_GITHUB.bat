@echo off
chcp 65001 >nul
echo ========================================
echo   SUBIR PROYECTO A GITHUB
echo ========================================
echo.

REM Verificar si Git está instalado
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Git NO está instalado en tu sistema.
    echo.
    echo 📥 Necesitas instalar Git primero:
    echo.
    echo    1. Descarga Git desde: https://git-scm.com/download/win
    echo    2. Instálalo con las opciones por defecto
    echo    3. O usa GitHub Desktop: https://desktop.github.com/
    echo.
    echo    Luego ejecuta este script nuevamente.
    echo.
    pause
    exit /b 1
)

echo ✅ Git está instalado
echo.

REM Verificar si ya es un repositorio Git
if exist .git (
    echo ℹ️  Ya es un repositorio Git
    echo.
) else (
    echo 📦 Inicializando repositorio Git...
    git init
    echo ✅ Repositorio inicializado
    echo.
)

REM Verificar archivos sensibles
echo 🔍 Verificando archivos sensibles...
echo.

if exist backend\.env (
    echo ⚠️  ADVERTENCIA: Encontrado backend\.env
    echo    Este archivo contiene credenciales y NO se debe subir.
    echo    Asegúrate de que esté en .gitignore
    echo.
    git check-ignore backend\.env >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ backend\.env NO está ignorado. Removiendo del staging...
        git rm --cached backend\.env 2>nul
    ) else (
        echo ✅ backend\.env está siendo ignorado correctamente
    )
)

if exist frontend\.env (
    echo ⚠️  ADVERTENCIA: Encontrado frontend\.env
    echo    Este archivo contiene credenciales y NO se debe subir.
    echo    Asegúrate de que esté en .gitignore
    echo.
    git check-ignore frontend\.env >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ frontend\.env NO está ignorado. Removiendo del staging...
        git rm --cached frontend\.env 2>nul
    ) else (
        echo ✅ frontend\.env está siendo ignorado correctamente
    )
)

echo.
echo 📋 Estado actual del repositorio:
echo.
git status --short
echo.

echo ========================================
echo   PASOS SIGUIENTES
echo ========================================
echo.
echo 1️⃣  Agregar archivos al staging:
echo    git add .
echo.
echo 2️⃣  Verificar qué se va a subir:
echo    git status
echo.
echo 3️⃣  Crear commit inicial:
echo    git commit -m "Initial commit: Sistema POS Multi-local"
echo.
echo 4️⃣  Crear repositorio en GitHub:
echo    - Ve a https://github.com
echo    - Click en "+" ^> "New repository"
echo    - Nombre: LaTienda
echo    - NO marques "Initialize with README"
echo    - Click en "Create repository"
echo.
echo 5️⃣  Conectar y subir:
echo    git branch -M main
echo    git remote add origin https://github.com/TU-USUARIO/LaTienda.git
echo    git push -u origin main
echo.
echo ========================================
echo.
echo ¿Quieres que agregue los archivos ahora? (S/N)
set /p respuesta="> "

if /i "%respuesta%"=="S" (
    echo.
    echo 📦 Agregando archivos...
    git add .
    echo ✅ Archivos agregados
    echo.
    echo 📋 Archivos que se van a subir:
    echo.
    git status --short
    echo.
    echo.
    echo ¿Quieres crear el commit ahora? (S/N)
    set /p respuesta2="> "
    
    if /i "%respuesta2%"=="S" (
        echo.
        echo 📝 Creando commit...
        git commit -m "Initial commit: Sistema POS Multi-local - Funcionalidades completas"
        echo ✅ Commit creado
        echo.
        echo.
        echo ⚠️  IMPORTANTE: Ahora necesitas:
        echo.
        echo    1. Crear el repositorio en GitHub (paso 4 arriba)
        echo    2. Ejecutar los comandos de conexión (paso 5 arriba)
        echo.
        echo    O usa GitHub Desktop para una interfaz gráfica más fácil.
        echo.
    )
)

echo.
echo 📖 Para más detalles, lee SUBIR_GITHUB.md
echo.
pause

