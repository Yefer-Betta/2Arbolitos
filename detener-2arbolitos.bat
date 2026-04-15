@echo off
title 2Arbolitos - Detener Servidores
echo.
echo ========== DETENIENDO 2ARBOLITOS ==========
echo.

echo Buscando procesos de Node.js...
taskkill /F /FI "WINDOWTITLE eq ServidorBackend*" 2>nul
taskkill /F /FI "WINDOWTITLE eq Frontend*" 2>nul

echo.
echo ========== SERVIDORES DETENIDOS ==========
echo.
echo Los servidores han sido cerrados.
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause >nul