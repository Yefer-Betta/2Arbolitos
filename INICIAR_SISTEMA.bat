@echo off
setlocal enabledelayedexpansion
title Sistema 2Arbolitos - Iniciando
color 0A

echo ========================================
echo   SISTEMA DE GESTION 2ARBOLITOS
echo ========================================
echo.

cd /d "%~dp0"

echo [INFO] Verificando dependencias...

:: Verificar frontend
if not exist "node_modules" (
    echo [ERROR] Dependencias del frontend no instaladas.
    echo Por favor ejecuta INSTALAR.bat primero
    pause
    exit /b 1
)
echo [OK] Frontend instalado

:: Verificar server
if not exist "server\node_modules" (
    echo [ERROR] Dependencias del server no instaladas.
    echo Por favor ejecuta INSTALAR.bat primero
    pause
    exit /b 1
)
echo [OK] Server instalado

:: Verificar configuracion
if not exist "server\.env" (
    echo [ERROR] Configuracion del servidor no encontrada.
    echo Por favor ejecuta INSTALAR.bat primero
    pause
    exit /b 1
)
echo [OK] Configuracion del servidor encontrada

:: Verificar configuracion del frontend
if not exist ".env" (
    echo [AVISO] Configuracion del frontend no encontrada.
    echo Usando valores por defecto (localhost)
)
echo [OK] Verificacion completada

:: Verificar build (opcional para desarrollo)
echo [INFO] Modo desarrollo - no requiere build
echo [OK] Ejecutando en modo desarrollo

:: Detectar IP Local dinamicamente (Soporta 192.168.x.x y 10.x.x.x)
set LOCAL_IP=localhost
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "ipv4" ^| findstr "192.168 10."') do (
    for /f "tokens=*" %%b in ("%%a") do (
        set "TEMP_IP=%%b"
        set "LOCAL_IP=!TEMP_IP: =!"
    )
    goto :found_ip
)
:found_ip

:: Actualizar el archivo .env del frontend con la IP detectada
echo VITE_API_URL=http://%LOCAL_IP%:3001/api> .env
echo [OK] Configuracion de red actualizada: %LOCAL_IP%

echo.
echo [1/3] Verificando MySQL...

:: Verificar si mysql esta disponible
mysql -u root -e "SELECT 1" 2>nul
if errorlevel 1 (
    echo [AVISO] MySQL no esta en PATH o no esta corriendo
    echo El sistema intentara iniciar de todas formas...
    echo Asegurate de tener MySQL corriendo en XAMPP o WAMP
) else (
    echo [OK] MySQL esta corriendo
)

echo.
echo [2/3] Iniciando Backend (Puerto 3001)...
echo [INFO] Se abrira una nueva ventana para el backend
start "Backend 2Arbolitos" cmd /c "cd /d "%~dp0server" && npm run dev"

echo.
echo [3/3] Iniciando Frontend (Puerto 5173)...
echo [INFO] Se abrira una nueva ventana para el frontend
:: Usamos --host para que Vite escuche peticiones externas del celular
start "Frontend 2Arbolitos" cmd /c "npm run dev -- --host --clearScreen false"

:: Intentar abrir los puertos en el Firewall de Windows (solo funciona como admin)
netsh advfirewall firewall add rule name="2Arbolitos-API" dir=in action=allow protocol=TCP localport=3001 >nul 2>&1
netsh advfirewall firewall add rule name="2Arbolitos-Web" dir=in action=allow protocol=TCP localport=5173 >nul 2>&1

ping -n 4 127.0.0.1 >nul

echo.
echo ========================================
echo   SISTEMA LISTO PARA USAR
echo ========================================
echo.
echo URLs:
echo   Frontend Local:    http://localhost:5173
echo   Frontend Red:     http://%LOCAL_IP%:5173
echo   Backend:          http://%LOCAL_IP%:3001/api
echo.
echo   COPIAR Y PEGAR EN NAVEGADOR DE OTROS DISPOSITIVOS:
echo   http://%LOCAL_IP%:5173
echo.
echo Credenciales:
echo   admin / admin123
echo   mesero / waiter123
echo   cocina / cook123
echo.
echo Presiona una tecla para salir...
pause >nul
