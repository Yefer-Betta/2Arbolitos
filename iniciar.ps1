#requires -version 5.1
<#
.SYNOPSIS
    Lanzador de 2Arbolitos POS
.DESCRIPTION
    Inicia el servidor, muestra QR de acceso y abre el navegador.
    Sin .bat, sin comandos raros.
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

function Test-NodeInstalled {
    try {
        $v = node --version
        return $true
    } catch {
        return $false
    }
}

function Test-SetupDone {
    $serverEnv = Join-Path $ROOT "server\.env"
    $nodeModules = Join-Path $ROOT "node_modules"
    return (Test-Path $serverEnv) -and (Test-Path $nodeModules)
}

function Get-LocalIP {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*'
    } | Select-Object -First 1).IPAddress
    if (-not $ip) { $ip = '127.0.0.1' }
    return $ip
}

function Show-QR {
    param([string]$Url)
    try {
        $qrJs = @"
const QR = require('qrcode');
QR.toString('$Url', { type: 'terminal', small: true }, (e, s) => console.log(s || ''));
"@
        $result = node -e $qrJs 2>$null
        if ($result) { Write-Host $result }
    } catch {}
}

function Start-Server {
    Show-Header

    $serverDir = Join-Path $ROOT "server"
    $nodeModules = Join-Path $ROOT "node_modules"

    if (-not (Test-Path $nodeModules)) {
        Write-Color ">> Instalando dependencias..." Yellow
        pushd $ROOT
        npm install --silent 2>&1 | Out-Null
        popd
    }

    $serverModules = Join-Path $serverDir "node_modules"
    if (-not (Test-Path $serverModules)) {
        Write-Color ">> Instalando dependencias del servidor..." Yellow
        pushd $serverDir
        npm install --silent 2>&1 | Out-Null
        popd
    }

    $localIP = Get-LocalIP

    Write-Color ">> Iniciando servidor en ventana separada..." Green
    $env:FORCE_COLOR = 1
    $serverProcess = Start-Process -FilePath "node" -ArgumentList "$serverDir\src\index.js" -WorkingDirectory $ROOT -PassThru -WindowStyle Normal
    Start-Sleep -Seconds 4

    Show-Header
    Write-Color "  SERVIDOR CORRIENDO" Green
    Write-Host ""
    Write-Color "  Local:    http://localhost:3002" Cyan
    Write-Color "  Red:      http://$localIP`:3002" Cyan
    Write-Host ""

    Write-Color "  Desde tu celular (misma red WiFi):" Yellow
    Write-Color "  http://$localIP`:3002" Cyan
    Write-Host ""
    Write-Color "  O escanea el QR en:" Yellow
    Write-Color "  http://localhost:3002/qr" Cyan

    Write-Host ""
    Write-Color "  Abriendo navegador..." Yellow
    Start-Process "http://localhost:3002"

    Write-Host ""
    Write-Color "  Presiona ENTER para cerrar el servidor" DarkGray
    Read-Host

    try { Stop-Process -Id $serverProcess.Id -Force } catch {}
}

function Show-Menu {
    Show-Header
    Write-Color "  1. Iniciar 2Arbolitos" White
    Write-Color "  2. Abrir en el navegador" White
    Write-Color "  3. Mostrar codigo QR" White
    Write-Color "  4. Instalar / configurar" White
    Write-Color "  5. Salir" White
    Write-Host ""
    Write-Host -NoNewline "  Elige una opcion: " -ForegroundColor Yellow
    $opt = Read-Host

    switch ($opt) {
        '1' { Start-Server }
        '2' { Start-Process "http://localhost:3002"; Show-Menu }
        '3' {
            $ip = Get-LocalIP
            Show-QR "http://${ip}:3002"
            Write-Host ""
            Pause
            Show-Menu
        }
        '4' {
            Show-Header
            Write-Color ">> Ejecutando instalador..." Yellow
            pushd $ROOT
            node scripts/commands/install.js
            popd
            Pause
            Show-Menu
        }
        '5' { exit }
        default { Show-Menu }
    }
}

# Main
try {
    if (-not (Test-NodeInstalled)) {
        Show-Header
        Write-Color "[ERROR] Node.js no esta instalado" Red
        Write-Color ""
        Write-Color "Descargalo desde: https://nodejs.org" Yellow
        Write-Color "Instalalo y vuelve a ejecutar este lanzador." Yellow
        Write-Host ""
        Pause
        exit 1
    }

    if (-not (Test-SetupDone)) {
        Show-Header
        Write-Color ">> Parece que es la primera vez." Yellow
        Write-Color ">> Vamos a configurar todo..." Yellow
        Write-Host ""
        pushd $ROOT
        node scripts/commands/install.js
        popd
        Write-Host ""
        Write-Color "Configuracion completada. Iniciando servidor..." Green
        Start-Sleep 1
    }

    Show-Menu
} catch {
    Write-Color "[ERROR] $($_.Exception.Message)" Red
    Pause
    exit 1
}
