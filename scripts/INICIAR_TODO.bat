@echo off
setlocal EnableExtensions EnableDelayedExpansion
title 2Arbolitos - Inicio completo (Vite + API)
color 0A

set "PROJ=%~dp0.."
cd /d "%~dp0.."

echo.
echo ============================================================
echo   2ARBOLITOS - Entorno de desarrollo
echo   Instala dependencias, prepara .env e inicia Vite + API
echo ============================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js no esta instalado. Instala LTS desde https://nodejs.org
  pause
  exit /b 1
)
echo [OK] Node: 
node -v
echo.

REM --- Dependencias raiz ---
if not exist "node_modules\" (
  echo [1/5] Instalando dependencias del frontend ^(npm install^)...
  call npm install
  if errorlevel 1 (
    echo [ERROR] Fallo npm install en la raiz.
    pause
    exit /b 1
  )
) else (
  echo [1/5] Dependencias del frontend: OK ^(node_modules^)
)

REM --- Dependencias servidor ---
if not exist "server\node_modules\" (
  echo [2/5] Instalando dependencias del servidor ^(server^)...
  pushd server
  call npm install
  set "ERR=!errorlevel!"
  popd
  if !ERR! neq 0 (
    echo [ERROR] Fallo npm install en server.
    pause
    exit /b 1
  )
) else (
  echo [2/5] Dependencias del servidor: OK
)

REM --- server\.env ---
if not exist "server\.env" (
  if exist "server\.env.example" (
    echo [3/5] Creando server\.env desde .env.example ...
    copy /Y "server\.env.example" "server\.env" >nul
    echo       Edita server\.env: DATABASE_URL, PORT ^(por defecto 3002^), JWT_SECRET.
  ) else (
    echo [3/5] [AVISO] No hay server\.env ni server\.env.example. Crea server\.env con PORT y DATABASE_URL.
  )
) else (
  echo [3/5] server\.env: OK
)

REM --- .env raiz (proxy Vite = puerto del API) ---
if not exist ".env" (
  if exist "server\.env" (
    echo [4/5] Creando .env en la raiz para el proxy de Vite...
    for /f "usebackq tokens=1,* delims==" %%A in (`findstr /b /i "PORT=" "server\.env"`) do set "SPORT=%%B"
    set "SPORT=!SPORT: =!"
    if not defined SPORT set "SPORT=3002"
    (
      echo # Generado por INICIAR_TODO.bat - proxy hacia el API local
      echo VITE_API_PROXY_TARGET=http://127.0.0.1:!SPORT!
    ) > .env
    echo       VITE_API_PROXY_TARGET=http://127.0.0.1:!SPORT!
  ) else (
    echo [4/5] Sin server\.env: creando .env minimo para puerto 3002...
    (
      echo VITE_API_PROXY_TARGET=http://127.0.0.1:3002
    ) > .env
  )
) else (
  echo [4/5] .env en la raiz: OK ^(Vite usa VITE_API_PROXY_TARGET si esta definido^)
)

echo [5/5] Iniciando Vite + API en nueva ventana ^(npm run dev:full^)...
echo       Cierra esa ventana para detener frontend y backend.
echo.
start "2Arbolitos Vite+API" cmd /k pushd "%PROJ%" ^&^& npm run dev:full

timeout /t 5 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo ============================================================
echo   Listo
echo ============================================================
echo   Frontend:  http://localhost:5173
echo   Proxy /api: lee VITE_API_PROXY_TARGET del .env o el PORT en server\.env
echo   En el celular ^(misma WiFi^): http://TU_IP:5173
echo.
echo   Si ves errores de proxy: MySQL debe estar en marcha y el API debe arrancar
echo   ^(mensaje "Base de datos conectada" en la ventana del servidor^).
echo ============================================================
echo.
pause
