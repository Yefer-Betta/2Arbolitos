@echo off
title Sistema 2Arbolitos - Iniciando...
color 0A

echo ========================================
echo   SISTEMA DE GESTION 2ARBOLITOS
echo ========================================
echo.
echo Iniciando servidor local...
echo.

cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [ERROR] Dependencias no instaladas.
    echo Por favor ejecuta INSTALAR.bat primero
    pause
    exit
)

:: Start the dev server and open the browser automatically
:: The -- --open flag tells Vite to open the browser when it's ready.
start "2Arbolitos Server" cmd /k "npm run dev -- --open"

echo.
echo ========================================
echo   Sistema iniciado correctamente
echo ========================================
echo.
echo El servidor se esta iniciando en una nueva ventana...
echo El navegador se abrira automaticamente cuando este listo.
echo Cierra esta ventana para detener el sistema
echo.
pause
