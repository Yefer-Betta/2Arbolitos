@echo off
setlocal EnableExtensions
title 2Arbolitos - Instalador

rem ============================================
rem  2Arbolitos POS - Instalador unico
rem  Requiere solo Docker Desktop.
rem  Doble clic y listo.
rem ============================================

rem --- Elevar a administrador si no estamos ---
net session >nul 2>&1
if not "%errorlevel%"=="0" (
    echo Solicita permisos de administrador...
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b 0
)

cd /d "%~dp0"

echo.
echo ==============================================
echo  2Arbolitos POS - Instalador (Docker)
echo ==============================================
echo.

rem --- Verificar que Docker CLI existe ---
where docker >nul 2>&1
if errorlevel 1 goto no_docker

echo [OK ] Docker CLI detectado
echo.

rem --- Verificar que el motor de Docker esta corriendo ---
docker info >nul 2>&1
if errorlevel 1 goto start_docker
goto daemon_ok

:start_docker
echo Docker Desktop no esta corriendo. Intentando arrancarlo...
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" (
    start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"
) else if exist "%LocalAppData%\Docker\Docker Desktop.exe" (
    start "" "%LocalAppData%\Docker\Docker Desktop.exe"
) else (
    start "Docker Desktop"
)
set tries=0
:wait_daemon
timeout /t 3 /nobreak >nul
docker info >nul 2>&1
if not errorlevel 1 goto :daemon_ok
set /a tries+=1
if %tries% LSS 14 goto :wait_daemon

echo.
echo [ERROR] No se pudo arrancar Docker Desktop.
echo  Abrelo manualmente y espera a que aparezca
echo  "Motor en ejecucion" antes de volver a ejecutar.
echo.
pause
exit /b 1

:daemon_ok
echo [OK] Motor de Docker corriendo
echo.

rem --- Detectar la IP de la red local ---
set "HOST_IP=0.0.0.0"
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' } | Select-Object -First 1).IPAddress"`) do set "HOST_IP=%%i"
if "%HOST_IP%"=="" set "HOST_IP=0.0.0.0"
echo [OK] IP LAN detectada: %HOST_IP%
echo.

rem --- Firewall: permitir acceso a la red local ---
netsh advfirewall firewall show rule name="2Arbolitos" >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name="2Arbolitos" dir=in action=allow protocol=TCP localport=80 >nul 2>&1
    echo [OK] Firewall: puerto 80 habilitado
) else (
    echo [OK] Firewall: regla ya configurada
)
echo.

rem --- Generar configuracion (.env) si no existe ---
if exist ".env" goto :env_exists

set "MYSQL_HEX="
for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "[guid]::NewGuid().ToString('N')"`) do set "MYSQL_HEX=%%v"
set "JWT_HEX="
for /f "usebackq delims=" %%v in (`powershell -NoProfile -Command "[guid]::NewGuid().ToString('N')"`) do set "JWT_HEX=%%v"

> ".env" echo MYSQL_ROOT_PASSWORD=%MYSQL_HEX%
>> ".env" echo JWT_SECRET=2arbolitos_jwt_%JWT_HEX%
>> ".env" echo HOST_IP=%HOST_IP%
>> ".env" echo FRONTEND_PORT=80
echo [OK] Configuracion generada en .env
goto :precheck

:env_exists
rem Si existe, solo actualizamos HOST_IP si estaba en 0.0.0.0
findstr /c:"HOST_IP=0.0.0.0" ".env" >nul 2>&1
if errorlevel 1 (
    echo [OK] Configuracion existente conservada
    goto :precheck
)
if "%HOST_IP%"=="0.0.0.0" (
    echo [OK] Configuracion existente conservada
    goto :precheck
)
powershell -NoProfile -Command "$p=(Resolve-Path '.env').Path; $c=Get-Content -Raw $p; $c=$c -replace '(?m)^HOST_IP=.*$','HOST_IP=%HOST_IP%'; Set-Content -Path $p -Value $c" >nul 2>&1
echo [OK] IP actualizada en .env a %HOST_IP%
goto :precheck

:precheck
rem --- Advertencia si el puerto 80 esta ocupado ---
netstat -ano | findstr ":80 " >nul 2>&1
if not errorlevel 1 (
    echo.
    echo [AVISO] El puerto 80 ya esta en uso por otro programa.
    echo Si la instalacion falla, edita FRONTEND_PORT en .env
    echo y usa otro puerto, por ejemplo FRONTEND_PORT=8080.
    echo.
)

echo Construyendo y levantando contenedores
echo Esto puede tardar varios minutos la primera vez...
echo.
docker compose up -d --build
if errorlevel 1 (
    echo.
    echo [ERROR] Docker construccion / arranque fallo.
    echo Revisa que el puerto 80 este libre o cambia FRONTEND_PORT en .env.
    echo.
    pause
    exit /b 1
)
echo.
echo [OK] Contenedores levantados
echo.

rem --- Esperar a que el sistema responda ---
echo [..] Esperando a que el sistema responda...
set tries=0
:wait_ready
powershell -NoProfile -Command "try { $r = Invoke-WebRequest 'http://localhost/' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 goto :ready_done
timeout /t 3 /nobreak >nul
set /a tries+=1
if %tries% LSS 30 goto :wait_ready
echo [AVISO] El sistema sigue arrancando. Abre http://localhost manualmente.
goto :open_browser

:ready_done
echo [OK] Sistema respondiendo
echo.

:open_browser
rem --- Abrir navegador ---
start "" http://localhost/
timeout /t 2 /nobreak >nul

echo ==============================================
echo  2Arbolitos POS instalado y corriendo
echo ==============================================
echo.
echo  Acceso local:  http://localhost
echo  Desde la red:  http://%HOST_IP%
echo.
echo  Credenciales iniciales:
echo    Admin:  admin   /  admin123
echo    Mesero: mesero / waiter123
echo.
echo  QR de acceso desde celulares:
echo    http://localhost/qr
echo.
echo  Para iniciar y detener el sistema cada dia
echo  usa el acceso directo "iniciar.ps1".
echo.
pause

rem --- Salir limpiamente tras el flujo exitoso ---
exit /b 0

:no_docker
echo.
echo [ERROR] Docker no esta instalado.
echo.
echo  Descargalo desde:
echo    https://www.docker.com/products/docker-desktop/
echo.
echo  Instala Docker Desktop, inicia el programa
echo  y vuelve a ejecutar este instalador.
echo.
pause
exit /b 1