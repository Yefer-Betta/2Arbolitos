@echo off
title 2Arbolitos - Restaurar base de datos
cd /d "%~dp0"

if not exist .env (
    echo [ERROR] No se encuentra .env. Ejecuta start.bat primero.
    pause
    exit /b 1
)

set PASSTMP=
for /f "tokens=2 delims==" %%a in ('findstr /b "MYSQL_ROOT_PASSWORD=" .env') do set PASSTMP=%%a
if "%PASSTMP%"=="" (
    echo [ERROR] No se pudo leer MYSQL_ROOT_PASSWORD de .env
    pause
    exit /b 1
)

:ask
echo Archivos SQL disponibles:
dir /b *.sql 2>nul
echo.
set /p FILE="Nombre del archivo a restaurar (ej: backup.sql): "

if not exist "%FILE%" (
    echo [ERROR] Archivo no encontrado.
    goto ask
)

echo Restaurando desde %FILE%...
type "%FILE%" | docker exec -i 2arbolitos-db mysql -u root -p%PASSTMP% 2arbolitos

if %errorlevel% neq 0 (
    echo [ERROR] Fallo al restaurar.
    pause
    exit /b 1
)

echo Restauracion completada.
pause