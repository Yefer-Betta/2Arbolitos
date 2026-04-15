@echo off
title 2Arbolitos - Iniciando Servidores
echo.
echo ========== INICIANDO 2ARBOLITOS ==========
echo.

cd /d "%~dp0"

echo [1/3] Iniciando servidor backend...
start "ServidorBackend" cmd /k "cd server && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/3] Iniciando frontend...
start "Frontend" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

echo [3/3] Abriendo navegador...
start http://localhost:5173

echo.
echo ========== SERVIDORES INICIADOS ==========
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001
echo.
echo Para acceder de otros dispositivos en la misma red WiFi:
echo   http://192.168.88.33:5173
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause >nul