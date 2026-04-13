@echo off
setlocal
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
echo [2/3] Iniciando Backend...
echo [INFO] Se abrira una nueva ventana para el backend
start cmd /k "cd /d "%~dp0server" && npm run dev"

echo.
echo [3/3] Iniciando Frontend...
echo [INFO] Se abrira una nueva ventana para el frontend
start cmd /k "npm run dev"

ping -n 4 127.0.0.1 >nul

echo.
echo ========================================
echo   Sistema iniciado correctamente
echo ========================================
echo.
echo REVISA LAS VENTANAS ABIERTAS
echo.

:: Obtener IP local
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "ipv4" ^| findstr "192.168"') do (
    set LOCAL_IP=%%a
    goto :show_ip
)
set LOCAL_IP=localhost
:show_ip

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
