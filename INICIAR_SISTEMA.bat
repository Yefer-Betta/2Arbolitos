@echo off
title Sistema 2Arbolitos - Iniciando...
color 0A

echo ========================================
echo   SISTEMA DE GESTION 2ARBOLITOS
echo ========================================
echo.
echo Iniciando servidor local...
echo BUSCA LA LINEA 'Network:' en los mensajes del servidor.
echo Esa es la direccion para los celulares (Ej: http://192.168.1.5:4173)
echo. 

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [ERROR] Dependencias no instaladas.
    echo Por favor ejecuta INSTALAR.bat primero
    pause
    exit
)

:: Start the production preview server and open the browser automatically
:: The --open flag tells Vite to open the browser when it's ready.
:: The --host flag exposes it to the network.
start "2Arbolitos Server" cmd /k "npm run preview -- --host --open"

echo.
echo ========================================
echo   Sistema iniciado correctamente
echo ========================================
echo.
pause
