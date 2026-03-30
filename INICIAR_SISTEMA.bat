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

echo [1/3] Verificando MySQL...
set MYSQL_RUNNING=0
set MYSQL_PATH=

:: Buscar MySQL en XAMPP
if exist "C:\xampp\mysql\bin\mysql.exe" (
    set MYSQL_PATH=C:\xampp\mysql\bin
    :: Intentar conexion
    "C:\xampp\mysql\bin\mysql.exe" -u root -e "SELECT 1" >nul 2>&1
    if %errorlevel% equ 0 (
        set MYSQL_RUNNING=1
        echo [OK] MySQL (XAMPP) esta corriendo
    ) else (
        echo [AVISO] MySQL esta instalado pero no esta corriendo
        echo Por favor inicia MySQL desde XAMPP Control Panel
        echo.
        set /p START_MYSQL="Quieres que intente iniciar MySQL? (S/N): "
        if /i "!START_MYSQL!"=="S" (
            if exist "C:\xampp\xampp-control.exe" (
                start "" "C:\xampp\xampp-control.exe"
                echo [INFO] Por favor inicia MySQL desde el panel y luego presiona una tecla
                pause
            ) else (
                echo [ERROR] No se encontro XAMPP Control Panel
                pause
                exit /b 1
            )
        )
    )
)

:: Buscar MySQL en WAMP
if exist "C:\wamp\bin\mysql" (
    if !MYSQL_RUNNING! equ 0 (
        for /f "delims=" %%i in ('dir /b "C:\wamp\bin\mysql\mysql*.*" 2^>nul') do set "MYSQL_PATH=C:\wamp\bin\mysql\%%i\bin"
        "!MYSQL_PATH!\mysql.exe" -u root -e "SELECT 1" >nul 2>&1
        if !errorlevel! equ 0 (
            set MYSQL_RUNNING=1
            echo [OK] MySQL (WAMP) esta corriendo
        )
    )
)

:: Si no esta corriendo, intentar otras formas o avisar
if %MYSQL_RUNNING% equ 0 (
    echo.
    echo [AVISO] No se detecto MySQL corriendo
    echo El sistema intentara iniciar de todas formas...
    echo Si hay errores de conexion, verifica MySQL
    echo.
)

echo.
echo [2/3] Iniciando Backend (Puerto 3001)...
cd server
start "2Arbolitos Backend" cmd /k "npm run dev"
cd ..

echo.
echo [3/3] Iniciando Frontend (Puerto 5173)...
start "2Arbolitos Frontend" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Sistema iniciado correctamente
echo ========================================
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
