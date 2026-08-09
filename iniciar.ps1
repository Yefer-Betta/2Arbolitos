#requires -version 5.1
<#
.SYNOPSIS
    Lanzador diario de 2Arbolitos POS (Docker)
.DESCRIPTION
    Inicia/detiene los contenedores ya instalados y abre el sistema.
    Solo necesita Docker. No requiere Node.js.
    La primera instalacion se hace con instalar.bat (doble clic).
#>

$ErrorActionPreference = 'Stop'
$ROOT = Split-Path -Parent $PSCommandPath

function Write-Color {
    param($Text, $Color = 'White')
    Write-Host $Text -ForegroundColor $Color
}

function Show-Header {
    Clear-Host
    Write-Color "============================================" Cyan
    Write-Color "      2ARBOLITOS - POS RESTAURANTE" Cyan
    Write-Color "============================================" Cyan
    Write-Host ""
}

function Test-DockerReady {
    try {
        $null = docker info 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

function Get-FrontendPort {
    $envFile = Join-Path $ROOT ".env"
    if (Test-Path $envFile) {
        $line = (Get-Content $envFile | Select-String '^FRONTEND_PORT=' | Select-Object -First 1)
        if ($line) {
            $port = $line -replace '^FRONTEND_PORT=', ''
            if ($port) { return $port.Trim() }
        }
    }
    return '80'
}

function Get-AccessUrl {
    $port = Get-FrontendPort
    if ($port -eq '80') { return 'http://localhost' }
    return "http://localhost:$port"
}

function Start-System {
    Show-Header
    if (-not (Test-DockerReady)) {
        Write-Color "[ERROR] Docker no esta corriendo." Red
        Write-Color "  Abre Docker Desktop y espera a que diga"
        Write-Color "  'Motor en ejecucion', luego vuelve a intentar." Yellow
        Write-Host ""
        Read-Host "Presiona Enter para continuar"
        return
    }

    if (-not (Test-Path (Join-Path $ROOT '.env'))) {
        Write-Color "[ERROR] No se encontro configuracion." Red
        Write-Color "  Ejecuta instalar.bat (doble clic) para la primera instalacion." Yellow
        Write-Host ""
        Read-Host "Presiona Enter para continuar"
        return
    }

    Write-Color ">> Levantando contenedores Docker..." Yellow
    pushd $ROOT
    docker compose up -d
    $code = $LASTEXITCODE
    popd
    if ($code -ne 0) {
        Write-Color "[ERROR] No se pudieron levantar los contenedores." Red
        Write-Host ""
        Read-Host "Presiona Enter para continuar"
        return
    }

    $url = Get-AccessUrl
    Write-Color ">> Abriendo el sistema..." Yellow
    Start-Process $url
    Write-Host ""
    Write-Color "  Sistema corriendo en: $url" Green
    Write-Color "  QR desde celulares:   $url/qr" Cyan
    Write-Host ""
}

function Stop-System {
    Show-Header
    Write-Color ">> Deteniendo contenedores Docker..." Yellow
    pushd $ROOT
    docker compose down
    popd
    Write-Color ">> Sistema detenido." Green
    Write-Host ""
}

function Restart-System {
    Show-Header
    Write-Color ">> Reiniciando contenedores..." Yellow
    pushd $ROOT
    docker compose restart
    popd
    $url = Get-AccessUrl
    Write-Color ">> Listo. Abriendo el sistema..." Yellow
    Start-Process $url
    Write-Color ">> Sistema listo en: $url" Green
    Write-Host ""
}

function Show-QR {
    Show-Header
    $url = Get-AccessUrl
    Write-Color "  Abriendo la pagina QR para escanear desde el celular" Yellow
    Write-Color "  (misma red WiFi)." Yellow
    Write-Host ""
    Write-Color "  Pagina QR: $url/qr" Cyan
    Write-Host ""
    Start-Process "$url/qr"
    Write-Host ""
}

function Show-Status {
    Show-Header
    Write-Color "  Estado de los contenedores:" Yellow
    Write-Host ""
    pushd $ROOT
    docker compose ps
    popd
    Write-Host ""
}

function Show-Menu {
    Show-Header
    Write-Color "  1. Iniciar sistema (y abrir navegador)" White
    Write-Color "  2. Detener sistema" White
    Write-Color "  3. Reiniciar sistema" White
    Write-Color "  4. Ver QR de acceso (celulares)" White
    Write-Color "  5. Estado de contenedores" White
    Write-Color "  6. Abrir en el navegador" White
    Write-Color "  7. Salir" White
    Write-Host ""
    Write-Host -NoNewline "  Elige una opcion: " -ForegroundColor Yellow
    $opt = Read-Host

    switch ($opt) {
        '1' { Start-System }
        '2' { Stop-System }
        '3' { Restart-System }
        '4' { Show-QR }
        '5' { Show-Status }
        '6' { Start-Process (Get-AccessUrl) }
        '7' { exit }
        default { Show-Menu }
    }
    Read-Host "Presiona Enter para volver al menu"
    Show-Menu
}

# Main
try {
    Show-Menu
} catch {
    Write-Color "[ERROR] $($_.Exception.Message)" Red
    Read-Host "Presiona Enter para continuar"
    exit 1
}