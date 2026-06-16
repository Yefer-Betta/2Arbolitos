@echo off
title 2Arbolitos - Configuracion automatica
cd /d "%~dp0"

echo.
echo ==============================================
echo  2Arbolitos - Configuracion automatica
echo ==============================================
echo.

:: --- 1. Detectar IP Local ---
echo [1/5] Detectando IP local...

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
    echo [ERROR] No se pudo detectar la IP local.
    pause
    exit /b 1
)

echo    IP detectada: %LOCAL_IP%
echo.

:: --- 2. Asegurar .env ---
echo [2/5] Configurando archivo .env...

if not exist .env (
    if exist .env.example.docker (
        copy .env.example.docker .env
    ) else (
        echo MYSQL_ROOT_PASSWORD=2arbolitos_segura_2024 > .env
        echo JWT_SECRET=2arbolitos_jwt_autogen >> .env
    )
    echo    Archivo .env creado desde plantilla.
)

:: Actualizar o agregar HOST_IP
findstr /b "HOST_IP=" .env >nul 2>&1
if %errorlevel% equ 0 (
    :: Reemplazar linea existente
    powershell -Command "(Get-Content .env) -replace '^HOST_IP=.*','HOST_IP=%LOCAL_IP%' | Set-Content .env"
) else (
    :: Agregar al final
    echo HOST_IP=%LOCAL_IP% >> .env
)
echo    HOST_IP actualizado a %LOCAL_IP%
echo.

:: --- 3. Firewall ---
echo [3/5] Verificando Firewall (puerto 80)...

netsh advfirewall firewall show rule name="2Arbolitos HTTP" >nul 2>&1
if %errorlevel% neq 0 (
    netsh advfirewall firewall add rule name="2Arbolitos HTTP" dir=in action=allow protocol=TCP localport=80 >nul
    if %errorlevel% equ 0 (
        echo    Regla de firewall agregada.
    ) else (
        echo    [ADVERTENCIA] No se pudo agregar regla. Ejecuta como Administrador.
    )
) else (
    echo    Regla de firewall ya existe.
)
echo.

:: --- 4. Construir e iniciar ---
echo [4/5] Construyendo e iniciando contenedores...

docker compose build --quiet 2>nul
if %errorlevel% neq 0 (
    echo    Construyendo (puede tomar unos minutos)...
    docker compose build
)

docker compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] Fallo al iniciar los contenedores.
    pause
    exit /b 1
)

echo    Esperando a que el servidor esté listo (30-60s la primera vez)...
echo.
set /a TIMEOUT=0
:wait_loop
powershell -Command "& { try { $r = Invoke-WebRequest -Uri 'http://localhost/api/auth/verify' -UseBasicParsing -TimeoutSec 3; exit 0 } catch { try { $c = [int]$_.Exception.Response.StatusCode; if ($c -ne 502) { exit 0 } } catch {}; exit 1 } }" >nul 2>&1
if %errorlevel% equ 0 goto :server_ready
set /a TIMEOUT=TIMEOUT+1
if %TIMEOUT% geq 45 (
    echo    [ADVERTENCIA] Tiempo agotado. Abre http://localhost manualmente.
    goto :skip_wait
)
ping -n 2 127.0.0.1 >nul
goto :wait_loop

:server_ready
echo    Servidor listo.
echo.

:skip_wait

:: --- 5. Resumen ---
echo [5/5] Mostrando resumen...
echo.
echo ==============================================
echo  Configuracion completada.
echo.
echo  Accede desde el servidor:
echo    http://localhost
echo.
echo  Accede desde otros dispositivos en la red:
echo    http://%LOCAL_IP%
echo.
echo  Escanea el codigo QR desde el servidor:
echo    http://%LOCAL_IP%/qr
echo.
echo  Si no carga desde el celular:
echo    1. Verifica que esten en la misma red WiFi.
echo    2. Revisa que el firewall permita el puerto 80.
echo    3. Prueba escribiendo la IP manualmente.
echo ==============================================
echo.
echo  Abriendo el navegador...
start http://localhost
echo.
pause
