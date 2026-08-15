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

rem --- Verificar consistencia entre la BD anterior y la configuracion ---
rem El volumen mysql_data persiste aunque borres la carpeta. Si existe el
rem volumen pero no hay .env, la contrasena nueva no coincidira con la
rem guardada en MySQL -> error P1000. En ese caso hay que resetearla.
docker volume inspect 2arbolitos_mysql_data >nul 2>&1
if errorlevel 1 goto :verify_env
if exist ".env" goto :verify_env
echo.
echo [AVISO] Se detecto una base de datos de una instalacion anterior
echo que no coincide con la configuracion nueva.
echo Para poder arrancar hay que BORRAR esa base de datos
echo (los datos previos se pierden).
echo.
choice /c SN /m "Borrar la base de datos anterior y continuar"
if errorlevel 2 (
    echo.
    echo Cancelado: no se borro nada.
    pause
    exit /b 1
)
echo.
echo [OK] Eliminando base de datos anterior...
docker compose down -v >nul 2>&1
echo [OK] Listo. Reinstalando con datos limpios...
echo.
:verify_env

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

rem --- Esperar a que el frontend responda ---
echo [..] Esperando a que el sistema responda...
set tries=0
:wait_ready
powershell -NoProfile -Command "try { $r = Invoke-WebRequest 'http://localhost/' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 goto :backend_wait
timeout /t 3 /nobreak >nul
set /a tries+=1
if %tries% LSS 30 goto :wait_ready
echo [ERROR] El servidor web no responde.
goto :diagnose

rem --- Esperar a que el API del backend responda ---
:backend_wait
echo [..] Esperando a que el API del backend responda...
set tries=0
:wait_api
powershell -NoProfile -Command "try { $r = Invoke-WebRequest 'http://localhost/api/auth/verify' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 401 -or $r.StatusCode -eq 200) { exit 0 } } catch { try { if ([int]$_.Exception.Response.StatusCode -eq 401) { exit 0 } } catch {} }; exit 1" >nul 2>&1
if not errorlevel 1 goto :ready_done
timeout /t 3 /nobreak >nul
set /a tries+=1
if %tries% LSS 30 goto :wait_api
echo [ERROR] El frontend carga pero el backend no responde.
goto :diagnose

:ready_done
echo [OK] Sistema respondiendo
echo.
goto :open_browser

rem --- Diagnostico automatico ---
:diagnose
echo.
echo ==============================================
echo  DIAGNOSTICO - Causa del problema
echo ==============================================
echo.
echo  Estado de los contenedores:
echo  ---------------------------
docker compose ps 2>&1
echo.
echo  Ultimas lineas del backend (ahi esta la causa):
echo  ----------------------------------------------
docker compose logs backend --tail 40 2>&1
echo  ----------------------------------------------
echo.

docker compose logs backend 2>&1 | findstr /c:"P1000" >nul 2>&1
if not errorlevel 1 goto :fix_p1000

echo  Interpretacion:
echo.
echo   1) Si el log menciona "@prisma/client" o "prisma"
echo      -> Instalacion de una version VIEJA. Descarga la
echo         version nueva y reinstala desde cero.
echo.
echo   2) Si el log muestra  $'\r': command not found
echo      -> Line endings de Windows en los scripts. Descarga
echo         la version nueva (ya esta corregido).
echo.
echo   3) Si el puerto 80 esta ocupado por otro programa
echo      -> Edita FRONTEND_PORT en .env y usa otro (ej: 8080),
echo         luego vuelve a ejecutar.
echo.
echo   4) Si docker ps falla o Docker Desktop no abre
echo      -> Problema de WSL2. Reinicia Docker Desktop y
echo         vuelve a ejecutar.
echo.
echo   5) Si el log se ve normal, comparte este log para revisar.
echo.
pause
goto :open_browser

:fix_p1000
echo  SE DETECTO EL ERROR P1000: el backend no puede entrar a MySQL.
echo  Causa: quedaron datos de una instalacion anterior con otra
echo  contrasena guardada en el volumen de Docker.
echo.
choice /c SN /m "Borrar la base de datos anterior y reinstalar"
if errorlevel 2 (
    echo.
    echo Sin cambios. Vuelve a ejecutar el instalador cuando quieras.
    pause
    goto :open_browser
)
echo.
echo [OK] Eliminando base de datos anterior...
docker compose down -v >nul 2>&1
echo [OK] Base de datos eliminada. Ejecuta de nuevo este
echo      instalador para completar la instalacion.
echo.
pause
goto :open_browser

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