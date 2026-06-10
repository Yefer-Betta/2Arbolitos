@echo off
title 2Arbolitos - Setup (Docker)
cd /d "%~dp0"

echo ========================================
echo  2Arbolitos - Instalacion con Docker
echo ========================================
echo.

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no encontrado. Instala Docker Desktop.
    pause
    exit /b 1
)

echo [1/5] Construyendo imagenes Docker...
docker compose build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al construir las imagenes.
    pause
    exit /b 1
)
echo   OK
echo.

echo [2/5] Iniciando servicios (db + backend)...
docker compose up -d --wait
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al iniciar los servicios.
    pause
    exit /b 1
)
echo   OK
echo.

echo [3/5] Creando tablas en la base de datos...
docker compose exec -T backend npx prisma db push --accept-data-loss 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se pudieron crear las tablas.
    pause
    exit /b 1
)
echo   OK
echo.

echo [4/5] Sembrando datos de prueba...
docker compose exec -T backend node prisma/seed.js 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] El seed fallo - puede ignorarse si ya hay datos.
) else (
    echo   OK
)
echo.

echo [5/5] Verificando frontend...
docker compose ps
echo.
echo ========================================
echo  Instalacion completada.
echo.
echo  Accede a: http://localhost
echo.
echo  Usuarios de prueba:
echo    admin   / admin123  (Administrador)
echo    mesero  / waiter123 (Mesero)
echo    cajero  / waiter123 (Cajero)
echo    cocina  / cook123   (Cocina)
echo ========================================
echo.
start "" "http://localhost"

pause
