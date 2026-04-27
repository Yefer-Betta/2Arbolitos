@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Panel de Control - 2Arbolitos POS
color 0B
cd /d "%~dp0"

:menu
cls
echo ========================================================
echo               PANEL DE CONTROL - 2ARBOLITOS
echo ========================================================
echo.
echo  1. Instalar Sistema por Primera Vez (Base de Datos)
echo  2. Iniciar Servidor en Produccion (Segundo plano)
echo  3. Actualizar Codigo y Reiniciar Servidor
echo  4. Iniciar en Modo Desarrollo (Solo Programadores)
echo  5. Salir
echo.
echo ========================================================
set /p opcion="Elige una opcion (1-5): "

if "%opcion%"=="1" goto instalar
if "%opcion%"=="2" goto produccion
if "%opcion%"=="3" goto actualizar
if "%opcion%"=="4" goto desarrollo
if "%opcion%"=="5" exit

goto menu

:instalar
cls
echo Iniciando Instalador del Sistema...
call scripts\INSTALAR.bat
echo.
pause
goto menu

:produccion
cls
echo Iniciando Configuracion de Produccion (PM2)...
call scripts\INSTALAR_PRODUCCION.bat
echo.
pause
goto menu

:actualizar
cls
echo Actualizando Sistema...
call scripts\ACTUALIZAR_SISTEMA.bat
echo.
pause
goto menu

:desarrollo
cls
echo Iniciando Modo Desarrollo...
call scripts\INICIAR_TODO.bat
echo.
pause
goto menu
