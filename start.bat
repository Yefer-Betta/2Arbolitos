@echo off
title 2Arbolitos - Servidor (Docker)
cd /d "%~dp0"

echo ========================================
echo  2Arbolitos - Iniciando con Docker
echo ========================================
echo.

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no encontrado. Instala Docker Desktop.
    pause
    exit /b 1
)

echo [1/2] Construyendo imagenes...
docker compose build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al construir las imagenes.
    pause
    exit /b 1
)
echo   OK

echo.
echo [2/2] Levantando servicios...
docker compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al iniciar los contenedores.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Servidores iniciados.
echo    Frontend: http://localhost
echo    API:      http://localhost/api
echo ========================================
echo.
start "" "http://localhost"

echo Presiona cualquier tecla para ver los logs en vivo...
pause >nul
docker compose logs -f
