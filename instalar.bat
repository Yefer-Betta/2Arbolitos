@echo off
title 2Arbolitos - Instalador
cd /d "%~dp0"

:: ============================================
::  2Arbolitos - Lanzador
::  Usa el instalador Node.js (mas amigable)
:: ============================================

echo.
echo ==============================================
echo  2Arbolitos - Verificando requisitos...
echo ==============================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo Descargalo desde: https://nodejs.org
    echo Instalalo y vuelve a ejecutar este programa.
    echo.
    pause
    exit /b 1
)

echo Node.js detectado
echo.
echo Abriendo instalador...

node scripts/commands/install.js

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] La instalacion fallo.
    pause
    exit /b 1
)

echo.
echo ==============================================
echo  Hecho! Puedes abrir el sistema desde:
echo    http://localhost:3002
echo ==============================================
echo.
echo  O usa el lanzador:  iniciar.ps1
echo  (haz clic derecho - Ejecutar con PowerShell)
echo.
pause
