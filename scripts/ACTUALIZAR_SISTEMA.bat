@echo off
title Actualizar Sistema en Produccion
color 0B
cd /d "%~dp0.."

echo ========================================
echo   ACTUALIZAR CODIGO Y REINICIAR SERVICIO
echo ========================================
echo.

echo [1/2] Reconstruyendo el Frontend para Produccion...
call npm run build
if errorlevel 1 (
  echo [ERROR] Hubo un problema al reconstruir el frontend.
  pause
  exit /b 1
)
echo [OK] Frontend actualizado
echo.

echo [2/2] Reiniciando Servicio en Segundo Plano (PM2)...
call pm2 restart 2arbolitos-api
echo [OK] Servicio reiniciado
echo.

echo ========================================
echo   Listo. Sistema actualizado.
echo ========================================
pause
