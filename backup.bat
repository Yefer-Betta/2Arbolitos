@echo off
title 2Arbolitos - Backup de base de datos
cd /d "%~dp0"

if not exist .env (
    echo [ERROR] No se encuentra .env. Ejecuta start.bat primero.
    pause
    exit /b 1
)

:: Leer la contraseña del .env
for /f "tokens=2 delims==" %%a in ('findstr /b "MYSQL_ROOT_PASSWORD=" .env') do set PASS=%%a
if "%PASS%"=="" (
    echo [ERROR] No se pudo leer MYSQL_ROOT_PASSWORD de .env
    pause
    exit /b 1
)

set BACKUP_FILE=backup_%DATE:~-4%%DATE:~3,2%%DATE:~0,2%.sql

echo Haciendo backup de la base de datos...
docker exec 2arbolitos-db mysqldump -u root -p%PASS% 2arbolitos > %BACKUP_FILE%

if %errorlevel% neq 0 (
    echo [ERROR] Fallo al hacer backup.
    pause
    exit /b 1
)

echo Backup completado: %BACKUP_FILE%
pause