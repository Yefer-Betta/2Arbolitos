$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "================================== 2ARBOLITOS ==================================" -ForegroundColor Cyan
Write-Host ""

# Get local IP
function Get-LocalIP {
    $adapter = Get-NetIPAddress -AddressFamily IPv4 -PrefixOrigin Manual,DHCP | Where-Object { $_.IPAddress -notlike "127.*" } | Select-Object -First 1
    return $adapter.IPAddress
}

$localIP = Get-LocalIP
$projectPath = $PSScriptRoot

Write-Host "[1/3] Iniciando servidor backend (Puerto 3001)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd `"$projectPath\server`" && npm run dev" -WindowStyle Normal -PassThru | Out-Null

Start-Sleep -Seconds 3

Write-Host "[2/3] Iniciando frontend (Puerto 5173)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/k cd `"$projectPath`" && npm run dev" -WindowStyle Normal -PassThru | Out-Null

Start-Sleep -Seconds 3

Write-Host "[3/3] Abriendo navegador..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"

$backendURL = "http://localhost:3001"
$frontendURL = "http://localhost:5173"
$networkURL = "http://$localIP"

if ($localIP) {
    $networkFrontend = "http://$localIP`:5173"
    $networkBackend = "http://$localIP`:3001"
} else {
    $networkFrontend = "http://192.168.88.33:5173"
    $networkBackend = "http://192.168.88.33:3001"
}

Write-Host ""
Write-Host "====================== SERVIDORES INICIADOS =======================" -ForegroundColor Green
Write-Host ""
Write-Host "  Local (esta PC):" -ForegroundColor White
Write-Host "    Frontend: $frontendURL" -ForegroundColor Cyan
Write-Host "    Backend:  $backendURL" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Red (otros dispositivos):" -ForegroundColor White
Write-Host "    Frontend: $networkFrontend" -ForegroundColor Cyan
Write-Host "    Backend:  $networkBackend" -ForegroundColor Cyan
Write-Host ""
Write-Host " NOTA: Asegurate de estar en la misma red WiFi" -ForegroundColor Yellow
Write-Host "       que esta computadora para acceder desde" -ForegroundColor Yellow
Write-Host "       telefono o tablet." -ForegroundColor Yellow
Write-Host ""
Write-Host " Presiona cualquier tecla para cerrar las ventanas de cmd..." -ForegroundColor Gray
Read-Host ""

# Close the cmd windows
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
taskkill /F /IM "node.exe" 2>$null | Out-Null

Write-Host ""
Write-Host "Servidores cerrados." -ForegroundColor Red
Start-Sleep -Seconds 1