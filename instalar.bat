@echo off
title 2Arbolitos - Instalador automatico
cd /d "%~dp0"

:: ============================================
::  2Arbolitos - Instalador completo
::  Haz doble clic y todo se configura solo
:: ============================================

:: --- 0. Elevar a administrador ---
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell start -verb runas "%~dpnx0"
    exit /b
)

echo.
echo ==============================================
echo  2Arbolitos - Instalador automatico
echo ==============================================
echo.

:: --- 1. Verificar prerequisitos ---
echo [1/6] Verificando prerequisitos...

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo    [ERROR] Git no esta instalado.
    echo    Descargalo desde: https://git-scm.com/download/win
    echo    Instalalo y vuelve a ejecutar este instalador.
    pause
    exit /b 1
)
echo    Git: OK

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo    [ERROR] Docker no esta instalado.
    echo    Descargalo desde: https://www.docker.com/products/docker-desktop/
    echo    Instalalo, abre Docker Desktop, y vuelve a ejecutar este instalador.
    pause
    exit /b 1
)
echo    Docker: OK

docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo    [ERROR] Docker esta instalado pero no esta corriendo.
    echo    Abre Docker Desktop desde el menu Inicio y espera a que inicie.
    pause
    exit /b 1
)
echo    Docker corriendo: OK

:: Detectar docker-compose v1/v2
set COMPOSE_CMD=docker compose
docker compose version >nul 2>&1
if %errorlevel% neq 0 (
    docker-compose version >nul 2>&1
    if %errorlevel% equ 0 (
        set COMPOSE_CMD=docker-compose
    ) else (
        echo    [ERROR] No se encontro docker-compose ni docker compose.
        echo    Asegurate de tener Docker Compose instalado.
        pause
        exit /b 1
    )
)
echo    Docker Compose: OK
echo.

:: --- 2. Verificar/clonar repositorio ---
echo [2/6] Verificando repositorio...

if exist "docker-compose.yml" if exist "package.json" if exist "server\prisma\schema.prisma" (
    echo    Proyecto encontrado en esta carpeta.
    goto :repo_ok
)
if exist ".git" (
    echo    Repositorio encontrado.
    goto :repo_ok
)

echo    No se encontro el proyecto en esta carpeta.
echo    Clonando desde GitHub...
git clone https://github.com/Yefer-Betta/2Arbolitos.git
if %errorlevel% neq 0 (
    echo    [ERROR] No se pudo clonar el repositorio.
    pause
    exit /b 1
)
cd 2Arbolitos

:repo_ok
echo.

:: --- 3. Detectar IP Local ---
echo [3/6] Detectando IP local...

set LOCAL_IP=
for /f "tokens=3 delims=: " %%a in ('ipconfig ^| findstr /r "IPv4.*192\.168\.\|IPv4.*10\.\|IPv4.*172\."') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip

if "%LOCAL_IP%"=="" (
    for /f "tokens=3 delims=: " %%a in ('ipconfig ^| findstr "IPv4"') do (
        set LOCAL_IP=%%a
        goto :found_ip2
    )
)
:found_ip2

if "%LOCAL_IP%"=="" (
    echo    [ERROR] No se pudo detectar la IP local.
    pause
    exit /b 1
)
echo    IP detectada: %LOCAL_IP%
echo.

:: --- 4. Crear .env ---
echo [4/6] Configurando archivo .env...

if not exist .env (
    if exist .env.example.docker (
        copy .env.example.docker .env
    ) else (
        echo MYSQL_ROOT_PASSWORD=2arbolitos_segura_2024 > .env
        echo JWT_SECRET=2arbolitos_jwt_autogen >> .env
    )
    echo    Archivo .env creado.
)

findstr /b "HOST_IP=" .env >nul 2>&1
if %errorlevel% equ 0 (
    powershell -Command "(Get-Content .env) -replace '^HOST_IP=.*','HOST_IP=%LOCAL_IP%' | Set-Content .env"
) else (
    echo HOST_IP=%LOCAL_IP% >> .env
)
echo    HOST_IP = %LOCAL_IP%
echo.

:: --- 5. Configurar Firewall ---
echo [5/6] Configurando Firewall (puerto 80)...

netsh advfirewall firewall show rule name="2Arbolitos HTTP" >nul 2>&1
if %errorlevel% neq 0 (
    netsh advfirewall firewall add rule name="2Arbolitos HTTP" dir=in action=allow protocol=TCP localport=80
    if %errorlevel% equ 0 (
        echo    Regla de firewall agregada.
    ) else (
        echo    [AVISO] No se pudo agregar regla de firewall.
    )
) else (
    echo    Regla de firewall ya existe.
)
echo.

:: Verificar que el puerto 80 no este ocupado
echo    Verificando puerto 80...
netstat -ano | findstr ":80 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo    [AVISO] El puerto 80 esta en uso por otro programa.
    echo    Puedes cambiar el puerto editando FRONTEND_PORT en el archivo .env
    echo    Ejemplo: FRONTEND_PORT=8080  (accederias como http://localhost:8080)
    echo.
    echo    Continuando de todas formas...
) else (
    echo    Puerto 80 disponible.
)
echo.

:: --- 6. Construir e iniciar contenedores ---
echo [6/6] Construyendo e iniciando servidor...
echo.

echo    Construyendo imagenes (primera vez tarda 2-5 min)...
%COMPOSE_CMD% build
if %errorlevel% neq 0 (
    echo    [ERROR] Fallo la construccion de imagenes.
    pause
    exit /b 1
)

echo.
echo    Iniciando contenedores...
%COMPOSE_CMD% up -d
if %errorlevel% neq 0 (
    echo    [ERROR] Fallo al iniciar los contenedores.
    pause
    exit /b 1
)

echo.
echo    Esperando a que el servidor este listo...
echo    (Esto toma 30-60 segundos la primera vez)
echo.
set /a TIMEOUT=0
:wait_loop
powershell -Command "& { try { $r = Invoke-WebRequest -Uri 'http://localhost/api/auth/verify' -UseBasicParsing -TimeoutSec 3; exit 0 } catch { try { $c = [int]$_.Exception.Response.StatusCode; if ($c -ne 502) { exit 0 } } catch {}; exit 1 } }" >nul 2>&1
if %errorlevel% equ 0 goto :server_ready
set /a TIMEOUT=TIMEOUT+1
if %TIMEOUT% geq 45 (
    echo    [AVISO] Tiempo agotado. Abre http://localhost manualmente.
    goto :show_summary
)
ping -n 2 127.0.0.1 >nul
goto :wait_loop

:server_ready
echo    Servidor listo!

:show_summary
echo.
echo ==============================================
echo  Instalacion completada con exito!
echo.
echo  USUARIOS PREDETERMINADOS:
echo    admin / admin123   (Administrador)
echo    gerente / waiter123
echo    cajero / waiter123
echo    mesero / waiter123
echo    cocina / cook123
echo.
echo  ACCESO LOCAL:
echo    http://localhost
echo.
echo  ACCESO DESDE OTROS DISPOSITIVOS:
echo    http://%LOCAL_IP%
echo.
echo  CODIGO QR PARA MENU:
echo    http://%LOCAL_IP%/qr
echo.
echo  IMPORTANTE: Estar en la misma red WiFi
echo ==============================================
echo.
echo  Abriendo navegador...
start http://localhost
echo.
pause
