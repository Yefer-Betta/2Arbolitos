@echo off
title Sistema 2Arbolitos - Instalador
color 0B

echo ========================================
echo   INSTALADOR 2ARBOLITOS
echo ========================================
echo.
echo Este proceso puede tardar varios minutos
echo Por favor, mantente conectado a internet
echo.
pause

cd /d "%~dp0"

echo.
echo [1/3] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado
    echo.
    echo Por favor descarga e instala Node.js desde:
    echo https://nodejs.org
    echo.
    pause
    exit
)

echo [OK] Node.js detectado
echo.

echo [2/3] Instalando dependencias...
call npm install

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Fallo la instalacion
    pause
    exit
)

echo.
echo [3/3] Preparando el sistema...
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   INSTALACION COMPLETADA
echo ========================================
echo.
echo Ahora puedes usar INICIAR_SISTEMA.bat
echo para abrir el sistema
echo.
pause
