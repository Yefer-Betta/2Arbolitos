@echo off
setlocal EnableExtensions
title 2 Arbolitos POS - Instalador

rem ===========================================================================
rem  Instalador de 2 Arbolitos POS
rem
rem  Uso normal:  doble clic          -> ventana visual
rem  Respaldo:    instalar.bat /consola -> instalacion en texto
rem ===========================================================================

if /i "%~1"=="/consola" goto consola
if /i "%~1"=="-consola" goto consola

net session >nul 2>&1
if not "%errorlevel%"=="0" (
    echo Solicitando permisos de administrador...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs" >nul 2>&1
    if errorlevel 1 (
        echo.
        echo No se obtuvieron permisos de administrador.
        echo El sistema funciona igual, pero la regla de firewall y el acceso
        echo desde celulares pueden necesitar configuracion manual.
        echo.
        start "" powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0scripts\setup\Installer.ps1"
    )
    exit /b 0
)

start "" powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0scripts\setup\Installer.ps1"
exit /b 0

:consola
net session >nul 2>&1
if not "%errorlevel%"=="0" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -ArgumentList '/consola' -Verb RunAs"
    exit /b 0
)

echo.
echo  2 Arbolitos POS - instalacion en modo texto
echo  ==========================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup\SetupOps.ps1" -Action Install -Console
set "RESULT=%errorlevel%"
echo.
if not "%RESULT%"=="0" (
    echo La instalacion no termino bien. Codigo: %RESULT%
    echo Revisa la carpeta logs para el detalle completo.
) else (
    echo Instalacion terminada.
)
pause
exit /b %RESULT%
