@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Instalacion de Produccion con PM2
color 0B

echo ========================================
echo   INSTALADOR DE SERVICIO (PRODUCCION)
echo   (Asegurate de ejecutar como Administrador)
echo ========================================
echo.

net session >nul 2>&1
if %errorLevel% equ 0 (
    echo [OK] Permisos de administrador detectados.
) else (
    echo [ERROR] Debes ejecutar este script como Administrador.
    echo Da clic derecho sobre el archivo y selecciona "Ejecutar como administrador".
    pause
    exit /b 1
)
echo.

cd /d "%~dp0.."

echo [1/3] Instalando PM2 y herramientas de servicio de Windows...
call npm install -g pm2 pm2-windows-startup
if errorlevel 1 (
  echo [ERROR] No se pudo instalar PM2.
  pause
  exit /b 1
)
echo [OK] PM2 instalado
echo.

echo [2/3] Configurando PM2 para arrancar con Windows...
call pm2-startup install
echo [OK] Servicio de Windows configurado (o actualizado)
echo.

echo [3/3] Registrando e iniciando el servidor 2Arbolitos...
cd server
call pm2 start src/index.js --name "2arbolitos-api"
call pm2 save
cd ..
echo [OK] Servidor corriendo en PM2 y guardado para inicio automatico
echo.

echo ========================================
echo   LISTO - SISTEMA EN PRODUCCION
echo ========================================
echo Tu servidor ahora correra de fondo en el puerto 3002.
echo Puedes cerrar esta ventana. El sistema se encendera automaticamente
echo cada vez que prendas la PC, de forma invisible.
echo.
pause
