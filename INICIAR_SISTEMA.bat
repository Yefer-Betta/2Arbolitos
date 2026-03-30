@echo off
setlocal enabledelayedexpansion
title Sistema 2Arbolitos - Iniciando
color 0A

echo ========================================
echo   SISTEMA DE GESTION 2ARBOLITOS
echo ========================================
echo.

cd /d "%~dp0"

:: Verificar que las dependencias del frontend esten instaladas
if not exist "node_modules\" (
    echo [ERROR] Dependencias del frontend no instaladas.
    echo Por favor ejecuta INSTALAR.bat primero
    pause
    exit /b 1
)

:: Verificar que las dependencias del server esten instaladas
if not exist "server\node_modules\" (
    echo [ERROR] Dependencias del server no instaladas.
    echo Por favor ejecuta INSTALAR.bat primero
    pause
    exit /b 1
)

:: Verificar que la base de datos este configurada
if not exist "server\.env" (
    echo [ERROR] Configuracion del servidor no encontrada.
    echo Por favor ejecuta INSTALAR.bat primero
    pause
    exit /b 1
)

:: Verificar que el build exista
if not exist "dist\" (
    echo [AVISO] No hay build. Construyendo frontend...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Fallo la construccion del frontend
        pause
        exit /b 1
    )
)

echo.
echo [1/3] Verificando MySQL...

:: Intentar verificar MySQL de diferentes formas
set MYSQL_OK=0

:: Intentar con mysql directo
mysql -u root -e "SELECT 1" 2>nul
if %errorlevel% equ 0 (
    set MYSQL_OK=1
    echo [OK] MySQL esta corriendo
)

:: Si no funciona, intentar con XAMPP
if %MYSQL_OK% equ 0 (
    if exist "C:\xampp\mysql\bin\mysql.exe" (
        "C:\xampp\mysql\bin\mysql.exe" -u root -e "SELECT 1" 2>nul
        if %errorlevel% equ 0 (
            set MYSQL_OK=1
            echo [OK] MySQL (XAMPP) esta corriendo
        )
    )
)

:: Si no funciona, intentar con WAMP
if %MYSQL_OK% equ 0 (
    for /f "delims=" %%i in ('dir /b "C:\wamp\bin\mysql\mysql*.*" 2^>nul') do (
        "C:\wamp\bin\mysql\%%i\bin\mysql.exe" -u root -e "SELECT 1" 2>nul
        if !errorlevel! equ 0 (
            set MYSQL_OK=1
            echo [OK] MySQL (WAMP) esta corriendo
        )
    )
)

if %MYSQL_OK% equ 0 (
    echo.
    echo [AVISO] No se detecto MySQL corriendo
    echo El sistema intentara iniciar de todas formas...
    echo IMPORTANTE: Asegurate de que MySQL este corriendo en XAMPP o WAMP
    echo.
)

echo.
echo [2/3] Iniciando Backend (Puerto 3001)...
start "2Arbolitos Backend" cmd /k "cd /d "%~dp0server" && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo [3/3] Iniciando Frontend (Puerto 5173)...
start "2Arbolitos Frontend" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Sistema iniciado correctamente
echo ========================================
echo.
echo Revisa las ventanas abiertas para ver los errores
echo.
echo URLs de acceso:
echo   - Frontend: http://localhost:5173
echo   - Backend API: http://localhost:3001
echo.
echo Si abres estas URLs en otros dispositivos de tu red,
echo asegurate de que esten conectados al mismo WiFi
echo.
echo Credenciales:
echo   Admin: admin / admin123
echo   Mesero: mesero / waiter123
echo   Cocina: cocina / cook123
echo.
pause
