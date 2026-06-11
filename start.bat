@echo off
title 2Arbolitos - Servidor (Docker)
cd /d "%~dp0"

echo ========================================
echo  2Arbolitos - Iniciando con Docker
echo ========================================
echo.

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker no encontrado.
    echo.
    echo Descarga e instala Docker Desktop desde:
    echo   https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

if not exist .env (
    echo [INFO] Creando archivo .env desde .env.example.docker...
    if exist .env.example.docker (
        copy .env.example.docker .env
        echo [INFO] Archivo .env creado. Puedes editarlo para personalizar las contraseñas.
    ) else (
        echo [ERROR] No se encuentra .env.example.docker
        pause
        exit /b 1
    )
)

echo [1/2] Construyendo imagenes...
docker compose build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al construir las imagenes.
    echo Revisa los logs con: docker compose logs
    pause
    exit /b 1
)
echo   OK

echo.
echo [2/2] Levantando servicios...
docker compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al iniciar los contenedores.
    echo Revisa los logs con: docker compose logs
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
timeout /t 3 /nobreak >nul
start "" "http://localhost"

echo.
echo Presiona cualquier tecla para ver los logs en vivo...
pause >nul
docker compose logs -f

:fin
exit /b 0
