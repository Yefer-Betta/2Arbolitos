@echo off
setlocal enabledelayedexpansion
title Sistema 2Arbolitos - Instalador
color 0B

echo ========================================
echo   INSTALADOR 2ARBOLITOS
echo   (Frontend + Backend + MySQL)
echo ========================================
echo.
echo Este proceso puede tardar varios minutos
echo Por favor, mantente conectado a internet
echo.
pause

cd /d "%~dp0"

echo.
echo [1/7] Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado
    echo Abriendo la pagina de descarga...
    echo.
    echo Por favor descarga e instala la version LTS de Node.js desde:
    echo https://nodejs.org
    echo.
    start https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js detectado: 
node --version
echo.

echo [2/7] Verificando MySQL...
set MYSQL_FOUND=0
set MYSQL_PATH=
set DB_HOST=localhost
set DB_USER=root
set DB_PASS=

:: Buscar MySQL en XAMPP
if exist "C:\xampp\mysql\bin\mysql.exe" (
    set MYSQL_FOUND=1
    set MYSQL_PATH=C:\xampp\mysql\bin
    echo [OK] MySQL encontrado en XAMPP
)

:: Buscar MySQL en WAMP
if exist "C:\wamp\bin\mysql\mysql[0-9].[0-9]\bin\mysql.exe" (
    set MYSQL_FOUND=1
    for /f "delims=" %%i in ('dir /b "C:\wamp\bin\mysql\mysql*.*" 2^>nul') do set MYSQL_VERSION=%%i
    set MYSQL_PATH=C:\wamp\bin\mysql\!MYSQL_VERSION!\bin
    echo [OK] MySQL encontrado en WAMP
)

:: Buscar MySQL instalado en sistema
if exist "C:\Program Files\MySQL\MySQL Server [0-9]*\bin\mysql.exe" (
    set MYSQL_FOUND=1
    for /f "delims=" %%i in ('dir /b "C:\Program Files\MySQL\MySQL Server*" 2^>nul') do set MYSQL_VERSION=%%i
    set MYSQL_PATH=C:\Program Files\MySQL\!MYSQL_VERSION!\bin
    echo [OK] MySQL encontrado en sistema
)

:: Si no encontro MySQL, pedir datos
if %MYSQL_FOUND% equ 0 (
    echo.
    echo [INFO] No se detecto MySQL local
    echo Por favor proporciona los datos de tu servidor MySQL:
    echo.
    set /p DB_HOST="Host MySQL (ej: localhost): "
    set /p DB_USER="Usuario MySQL (ej: root): "
    set /p DB_PASS="Contrasena MySQL (dejar vacio si no tiene): "
    echo.
) else (
    :: Preguntar si quiere usar XAMPP/WAMP
    if defined MYSQL_PATH (
        echo.
        set /p USE_XAMPP="Quieres iniciar MySQL ahora? (S/N): "
        if /i "!USE_XAMPP!"=="S" (
            if exist "C:\xampp\xampp-control.exe" (
                start "" "C:\xampp\xampp-control.exe"
                echo [INFO] Por favor inicia MySQL desde el panel de XAMPP
                pause
            ) else if exist "C:\wamp\wampmanager.exe" (
                start "" "C:\wamp\wampmanager.exe"
                echo [INFO] Por favor inicia MySQL desde el panel de WAMP
                pause
            )
        )
    )
)

echo.
echo [3/6] Obteniendo IP local del equipo...

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "ipv4" ^| findstr "192.168"') do (
    set LOCAL_IP=%%a
    goto :got_ip
)
:set LOCAL_IP=127.0.0.1
:got_ip

echo [OK] IP detectada: %LOCAL_IP%
echo.

echo [4/6] Actualizando configuracion de base de datos...

:: Generar DATABASE_URL
set "DATABASE_URL=mysql://%DB_USER%"
if defined DB_PASS set "DATABASE_URL=%DATABASE_URL%:%DB_PASS%"
set "DATABASE_URL=%DATABASE_URL%@%DB_HOST%:3306/2arbolitos?schema=public&charset=utf8mb4"

:: Escribir en .env
echo # Servidor > server\.env
echo PORT=3001 >> server\.env
echo NODE_ENV=development >> server\.env
echo. >> server\.env
echo # Base de datos MySQL >> server\.env
echo DATABASE_URL="%DATABASE_URL%" >> server\.env
echo. >> server\.env
echo # JWT >> server\.env
echo JWT_SECRET=super_secret_jwt_change_this_in_production >> server\.env
echo JWT_EXPIRES_IN=7d >> server\.env
echo. >> server\.env
echo # Frontend (para CORS) >> server\.env
echo FRONTEND_URL=http://localhost:5173 >> server\.env

echo [OK] Configuracion guardada en server\.env
echo.

:: Escribir configuracion del frontend
echo # Frontend - URL del API > .env
echo VITE_API_URL=http://%LOCAL_IP%:3001/api >> .env
echo [OK] Configuracion del frontend guardada en .env
echo.

echo [5/6] Conectando a MySQL y creando base de datos...
echo [INFO] Eliminando base de datos existente (si hay) para recrear con nuevo schema...
if %MYSQL_FOUND% equ 1 (
    "%MYSQL_PATH%\mysql.exe" -u %DB_USER% -p%DB_PASS% -e "DROP DATABASE IF EXISTS 2arbolitos;" 2>nul
    "%MYSQL_PATH%\mysql.exe" -u %DB_USER% -p%DB_PASS% -e "CREATE DATABASE 2arbolitos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
    if %errorlevel% equ 0 (
        echo [OK] Base de datos creada desde cero
    ) else (
        echo [ERROR] No se pudo crear la base de datos
        echo Verifica que MySQL este corriendo y las credenciales sean correctas
        pause
        exit /b 1
    )
) else (
    echo [INFO] Conectando al servidor MySQL remoto...
    mysql -h %DB_HOST% -u %DB_USER% -p%DB_PASS% -e "DROP DATABASE IF EXISTS 2arbolitos;" 2>nul
    mysql -h %DB_HOST% -u %DB_USER% -p%DB_PASS% -e "CREATE DATABASE 2arbolitos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
    if %errorlevel% equ 0 (
        echo [OK] Base de datos creada/verificada
    ) else (
        echo [ERROR] No se pudo crear la base de datos
        echo Verifica que MySQL este corriendo y las credenciales sean correctas
        pause
        exit /b 1
    )
)
echo.

echo [6/6] Instalando dependencias...
echo.
echo Instalando frontend...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la instalacion del frontend
    pause
    exit /b 1
)

echo.
echo Instalando server...
cd server
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la instalacion del server
    pause
    exit /b 1
)
cd ..
echo.

echo [7/7] Configurando base de datos...
cd server
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al generar Prisma client
    pause
    exit /b 1
)

call npx prisma db push --force-reset
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al sincronizar schema con MySQL
    pause
    exit /b 1
)

echo.
call node prisma\seed.js
if %errorlevel% neq 0 (
    echo [WARNING] El seed no se ejecuto (puede que ya haya datos)
) else (
    echo [OK] Datos de ejemplo creados
)
cd ..

echo.
echo Construyendo frontend...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Fallo la construccion del sistema
    pause
    exit /b 1
)

echo.
echo ========================================
echo   INSTALACION COMPLETADA
echo ========================================
echo.
echo Ahora ejecuta INICIAR_SISTEMA.bat
echo para iniciar el sistema
echo.
echo Credenciales por defecto:
echo   - Admin: admin / admin123
echo   - Mesero: mesero / waiter123  
echo   - Cocina: cocina / cook123
echo.
pause
