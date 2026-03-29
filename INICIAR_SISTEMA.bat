@echo off
title Sistema 2Arbolitos - Iniciando...
color 0A

echo ========================================
echo   SISTEMA DE GESTION 2ARBOLITOS
echo ========================================
echo.
echo Iniciando servidor (PC + celular sincronizados)...
echo En la ventana del servidor veras la URL para este PC y para la red.
echo Abre esa URL en el celular (mismo WiFi) para atender desde el movil.
echo. 

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [ERROR] Dependencias no instaladas.
    echo Por favor ejecuta INSTALAR.bat primero
    pause
    exit
)

:: Check if dist exists (build required for server mode)
if not exist "dist\" (
    echo [AVISO] No hay build. Construyendo...
    call npm run build
)

:: Start the Node server: serves the app and API so PC and phones stay in sync
start "2Arbolitos Server" cmd /k "npm run start"
timeout /t 2 /nobreak >nul
start http://localhost:4173

echo.
echo ========================================
echo   Sistema iniciado correctamente
echo ========================================
echo.
pause
