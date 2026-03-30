@echo off
setlocal
title Sistema 2Arbolitos - Iniciando
color 0A

echo ========================================
echo   SISTEMA DE GESTION 2ARBOLITOS
echo ========================================
echo.

cd /d "%~dp0"

echo [INFO] Verificando dependencias...

:: Verificar frontend
if not exist "node_modules" (
    echo [ERROR] Dependencias del frontend no instaladas.
    echo Por favor ejecuta INSTALAR.bat primero
    pause
    exit /b 1
)
echo [OK] Frontend instalado

:: Verificar server
if not exist "server\node_modules" (
    echo [ERROR] Dependencias del server no instaladas.
    echo Por favor ejecuta INSTALAR.bat primero
    pause
    exit /b 1
)
echo [OK] Server instalado

:: Verificar configuracion
if not exist "server\.env" (
    echo [ERROR] Configuracion del servidor no encontrada.
    echo Por favor ejecuta INSTALAR.bat primero
    pause
    exit /b 1
)
echo [OK] Configuracion encontrada

:: Verificar build
if not exist "dist" (
    echo [AVISO] No hay build. Construyendo...
    call npm run build
    if errorlevel 1 (
        echo [ERROR] Fallo la construccion
        pause
        exit /b 1
    )
)
echo [OK] Build listo

echo.
echo [1/3] Verificando MySQL...

:: Verificar si mysql esta disponible
mysql -u root -e "SELECT 1" 2>nul
if errorlevel 1 (
    echo [AVISO] MySQL no esta en PATH o no esta corriendo
    echo El sistema intentara iniciar de todas formas...
    echo Asegurate de tener MySQL corriendo en XAMPP o WAMP
) else (
    echo [OK] MySQL esta corriendo
)

echo.
echo [2/3] Iniciando Backend...
echo [INFO] Se abrira una nueva ventana para el backend
start cmd /k "cd /d "%~dp0server" && npm run dev"

echo.
echo [3/3] Iniciando Frontend...
echo [INFO] Se abrira una nueva ventana para el frontend
start cmd /k "npm run dev"

ping -n 4 127.0.0.1 >nul

echo.
echo ========================================
echo   Sistema iniciado correctamente
echo ========================================
echo.
echo REVISA LAS VENTANAS ABIERTAS
echo.
echo URLs:
echo   Frontend: http://localhost:5173
echo   Backend: http://localhost:3001
echo.
echo Credenciales:
echo   admin / admin123
echo   mesero / waiter123
echo   cocina / cook123
echo.
echo Presiona una tecla para salir...
pause >nul
