@echo off
setlocal
rem Panel de control de 2Arbolitos POS.
rem Usa PowerShell 5.1 de Windows, sin dependencias adicionales.
set "ROOT=%~dp0"
start "" powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File "%ROOT%scripts\panel\Panel.ps1"
exit /b 0
