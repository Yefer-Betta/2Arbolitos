#requires -version 5.1
<#
.SYNOPSIS
    Capa de operaciones de 2Arbolitos POS (panel e instalador).
.DESCRIPTION
    Aqui vive todo lo que toca Docker, el sistema de archivos o la red.
    La ventana del panel (Panel.ps1), el instalador (Install.ps1) y cualquier
    otro lanzador consumen estas funciones.
    No escribe por pantalla: devuelve objetos y lanza excepciones con mensajes
    pensados para el usuario final.
.NOTES
    Guardar siempre en UTF-8 con BOM: PowerShell 5.1 lee sin BOM como ANSI y
    rompe los acentos.
#>

$Script:ArbolitosRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$Script:EngineCache = $null

# ---------------------------------------------------------------------------
# Rutas, configuracion y entorno
# ---------------------------------------------------------------------------

function Get-ArbolitosRoot {
    return $Script:ArbolitosRoot
}

function Get-EnvMap {
    $file = Join-Path (Get-ArbolitosRoot) '.env'
    $map = @{}
    if (-not (Test-Path -LiteralPath $file)) { return $map }

    foreach ($line in (Get-Content -LiteralPath $file -Encoding UTF8)) {
        $text = $line.Trim()
        if (-not $text) { continue }
        if ($text.StartsWith('#')) { continue }
        $idx = $text.IndexOf('=')
        if ($idx -lt 1) { continue }
        $key = $text.Substring(0, $idx).Trim()
        $value = $text.Substring($idx + 1).Trim()
        if ($value.Length -ge 2) {
            $first = $value.Substring(0, 1)
            $last = $value.Substring($value.Length - 1, 1)
            if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
                $value = $value.Substring(1, $value.Length - 2)
            }
        }
        $map[$key] = $value
    }
    return $map
}

function Get-EnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$Key,
        [string]$Default = ''
    )
    $map = Get-EnvMap
    if ($map.ContainsKey($Key) -and $map[$Key]) { return $map[$Key] }
    return $Default
}

function Get-AppVersion {
    $pkg = Join-Path (Get-ArbolitosRoot) 'package.json'
    if (Test-Path -LiteralPath $pkg) {
        try {
            $json = Get-Content -LiteralPath $pkg -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($json.version) { return [string]$json.version }
        } catch { }
    }
    return 'desconocida'
}

function Get-FrontendPort {
    return (Get-EnvValue -Key 'FRONTEND_PORT' -Default '80')
}

function Get-AccessUrl {
    $port = Get-FrontendPort
    if ($port -eq '80') { return 'http://localhost' }
    return "http://localhost:$port"
}

function Get-LocalIP {
    $candidates = New-Object System.Collections.ArrayList

    try {
        foreach ($nic in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
            if ($nic.OperationalStatus -ne [System.Net.NetworkInformation.OperationalStatus]::Up) { continue }
            if ($nic.NetworkInterfaceType -eq [System.Net.NetworkInformation.NetworkInterfaceType]::Loopback) { continue }
            if ($nic.NetworkInterfaceType -eq [System.Net.NetworkInformation.NetworkInterfaceType]::Tunnel) { continue }
            foreach ($addr in $nic.GetIPProperties().UnicastAddresses) {
                if ($addr.Address.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) { continue }
                $ip = $addr.Address.ToString()
                if ($ip.StartsWith('169.254.')) { continue }
                [void]$candidates.Add($ip)
            }
        }
    } catch { }

    if ($candidates.Count -eq 0) { return '127.0.0.1' }

    $ordered = $candidates | Sort-Object -Property @{
        Expression = {
            if ($_ -like '192.168.*') { 0 }
            elseif ($_ -like '10.*') { 1 }
            elseif ($_ -match '^172\.(1[6-9]|2[0-9]|3[0-1])\.') { 2 }
            else { 3 }
        }
    }
    return @($ordered)[0]
}

function Get-LanUrl {
    return ((Get-AccessUrl) -replace 'localhost', (Get-LocalIP))
}

function Get-Mode {
    $root = Get-ArbolitosRoot
    $hasCompose = Test-Path -LiteralPath (Join-Path $root 'docker-compose.yml')
    $hasPortableNode = Test-Path -LiteralPath (Join-Path $root 'node\node.exe')
    $hasServer = Test-Path -LiteralPath (Join-Path $root 'server\src\index.js')

    if ($hasCompose) { return 'docker' }
    if ($hasPortableNode -and $hasServer) { return 'portable' }
    return 'missing'
}

function Get-DiskFreeGb {
    try {
        $qualifier = Split-Path -Qualifier (Get-ArbolitosRoot)
        $drive = New-Object -TypeName System.IO.DriveInfo -ArgumentList $qualifier
        return [math]::Round($drive.AvailableFreeSpace / 1GB, 1)
    } catch {
        return 0
    }
}

# ---------------------------------------------------------------------------
# Ejecucion de procesos
# ---------------------------------------------------------------------------

function ConvertTo-ArgumentString {
    param([string[]]$Tokens = @())
    $parts = foreach ($token in $Tokens) {
        if ($null -eq $token -or $token -eq '') {
            '""'
        } elseif ($token -match '[\s"]') {
            '"' + ($token -replace '"', '\"') + '"'
        } else {
            $token
        }
    }
    return ($parts -join ' ')
}

function Invoke-Native {
    param(
        [Parameter(Mandatory = $true)][string]$FileName,
        [string]$Arguments = '',
        [int]$TimeoutSec = 30,
        [string]$WorkingDirectory = ''
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $FileName
    $psi.Arguments = $Arguments
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    # docker y prisma escriben UTF-8: sin esto los acentos llegan rotos.
    $psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $psi.StandardErrorEncoding = [System.Text.Encoding]::UTF8
    if ($WorkingDirectory) { $psi.WorkingDirectory = $WorkingDirectory }

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi

    try {
        [void]$proc.Start()
        $outTask = $proc.StandardOutput.ReadToEndAsync()
        $errTask = $proc.StandardError.ReadToEndAsync()

        if (-not $proc.WaitForExit($TimeoutSec * 1000)) {
            try { $proc.Kill() } catch { }
            return [pscustomobject]@{
                ExitCode = -1
                Out      = ''
                Err      = "Tiempo de espera agotado ($TimeoutSec s)."
                TimedOut = $true
            }
        }

        return [pscustomobject]@{
            ExitCode = $proc.ExitCode
            Out      = [string]$outTask.Result
            Err      = [string]$errTask.Result
            TimedOut = $false
        }
    } catch {
        return [pscustomobject]@{
            ExitCode = -1
            Out      = ''
            Err      = $_.Exception.Message
            TimedOut = $false
        }
    } finally {
        $proc.Dispose()
    }
}

function Test-DockerCli {
    $cmd = Get-Command docker -ErrorAction SilentlyContinue
    return [bool]$cmd
}

function Test-DockerEngine {
    param([switch]$Force)

    if (-not (Test-DockerCli)) { return $false }

    if (-not $Force -and $Script:EngineCache) {
        $age = (Get-Date) - $Script:EngineCache.At
        if ($age.TotalSeconds -lt 10) { return $Script:EngineCache.Ok }
    }

    $result = Invoke-Native -FileName 'docker' -Arguments 'info' -TimeoutSec 12
    $ok = ($result.ExitCode -eq 0)
    $Script:EngineCache = [pscustomobject]@{ Ok = $ok; At = Get-Date }
    return $ok
}

function Invoke-DockerCompose {
    param(
        [string[]]$Tokens = @(),
        [int]$TimeoutSec = 120
    )

    if (-not (Test-DockerCli)) {
        return [pscustomobject]@{
            ExitCode = -1
            Out      = ''
            Err      = 'Docker no esta instalado o no esta en el PATH.'
            TimedOut = $false
        }
    }

    $all = @('compose') + $Tokens
    return Invoke-Native -FileName 'docker' `
        -Arguments (ConvertTo-ArgumentString -Tokens $all) `
        -TimeoutSec $TimeoutSec `
        -WorkingDirectory (Get-ArbolitosRoot)
}

function Get-FirstLine {
    param([string]$Text)
    if (-not $Text) { return '' }
    foreach ($line in ($Text -split "`r?`n")) {
        $clean = $line.Trim()
        if ($clean) { return $clean }
    }
    return ''
}

function Open-DockerDesktop {
    $paths = @(
        (Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Docker\Docker\Docker Desktop.exe'),
        (Join-Path $env:LOCALAPPDATA 'Docker\Docker Desktop.exe')
    )
    foreach ($path in $paths) {
        if ($path -and (Test-Path -LiteralPath $path)) {
            Start-Process -FilePath $path
            return $true
        }
    }
    return $false
}

# ---------------------------------------------------------------------------
# Sondas de red
# ---------------------------------------------------------------------------

function Test-Port {
    param(
        [string]$ComputerName = '127.0.0.1',
        [int]$Port = 3002,
        [int]$TimeoutMs = 1500
    )
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($ComputerName, $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs)) { return $false }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

function Test-HttpStatus {
    param(
        [Parameter(Mandatory = $true)][string]$Url,
        [int]$TimeoutSec = 4
    )
    try {
        $request = [System.Net.HttpWebRequest]::Create($Url)
        $request.Proxy = $null
        $request.Timeout = $TimeoutSec * 1000
        $request.ReadWriteTimeout = $TimeoutSec * 1000
        $request.UserAgent = '2ArbolitosPanel/1.0'
        $response = $request.GetResponse()
        $code = [int]$response.StatusCode
        $response.Close()
        return $code
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
        return 0
    } catch {
        return 0
    }
}

# ---------------------------------------------------------------------------
# Estado
# ---------------------------------------------------------------------------

function Get-ComposePs {
    $map = @{}
    if (-not (Test-DockerCli)) { return $map }

    $result = Invoke-DockerCompose -Tokens @('ps', '-a', '--format', 'json') -TimeoutSec 20
    if ($result.ExitCode -eq 0) {
        $raw = ([string]$result.Out).Trim()
        if ($raw) {
            $items = @()
            try {
                $items = @($raw | ConvertFrom-Json)
            } catch {
                foreach ($line in ($raw -split "`r?`n")) {
                    if (-not $line.Trim()) { continue }
                    try { $items += ($line | ConvertFrom-Json) } catch { }
                }
            }
            foreach ($item in $items) {
                if ($item.Service) { $map[[string]$item.Service] = $item }
            }
            if ($map.Count -gt 0) { return $map }
        } else {
            return $map
        }
    }

    # Respaldo para versiones antiguas de Compose que no aceptan --format json.
    $fallback = Invoke-Native -FileName 'docker' `
        -Arguments 'ps -a --filter "name=2arbolitos-" --format "{{.Names}}|{{.State}}|{{.Status}}"' `
        -TimeoutSec 20
    if ($fallback.ExitCode -eq 0) {
        foreach ($line in (([string]$fallback.Out) -split "`r?`n")) {
            $parts = $line -split '\|'
            if ($parts.Count -lt 3) { continue }
            $service = ($parts[0] -replace '^2arbolitos-', '')
            $map[$service] = [pscustomobject]@{
                Service = $service
                Name    = $parts[0]
                State   = $parts[1]
                Status  = $parts[2]
                Health  = ''
            }
        }
    }
    return $map
}

function Get-LogsSnapshot {
    param(
        [string]$Service = 'todos',
        [int]$Tail = 200
    )

    if ((Get-Mode) -ne 'docker') {
        return 'Los registros solo estan disponibles en modo Docker.'
    }

    $tokens = @('logs', '--tail', "$Tail", '--no-color')
    if ($Service -and $Service -ne 'todos') { $tokens += $Service }

    $result = Invoke-DockerCompose -Tokens $tokens -TimeoutSec 25
    $text = [string]$result.Out
    if ($result.Err) { $text = $text + [Environment]::NewLine + [string]$result.Err }
    if (-not $text.Trim() -and $result.ExitCode -ne 0) {
        return 'No se pudieron leer los registros.'
    }
    return $text.TrimEnd()
}

function Get-BackupInfo {
    $dir = Join-Path (Get-ArbolitosRoot) 'backups'
    if (-not (Test-Path -LiteralPath $dir)) { return $null }

    $file = Get-ChildItem -LiteralPath $dir -Filter 'backup-*.sql' -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $file) { return $null }
    return [pscustomobject]@{
        Path   = $file.FullName
        Name   = $file.Name
        Date   = $file.LastWriteTime
        SizeKb = [math]::Round($file.Length / 1KB, 0)
    }
}

function Get-SystemSnapshot {
    param(
        [string]$LogService = 'todos',
        [int]$LogTail = 200
    )

    $mode = Get-Mode
    $snap = [pscustomobject]@{
        Mode              = $mode
        Version           = Get-AppVersion
        Port              = Get-FrontendPort
        Url               = Get-AccessUrl
        LanUrl            = Get-LanUrl
        DockerCli         = (Test-DockerCli)
        Engine            = $false
        Containers        = @{}
        ApiStatus         = 0
        ApiUrl            = ''
        DatabaseState     = 'n/a'
        DiskFreeGb        = (Get-DiskFreeGb)
        LastBackup        = $null
        LastBackupAgeDays = $null
        Logs              = ''
        CheckedAt         = Get-Date
    }

    if ($mode -eq 'docker') {
        $snap.Engine = (Test-DockerEngine)
        if ($snap.Engine) {
            $snap.Containers = Get-ComposePs
        }

        $snap.ApiUrl = (Get-AccessUrl) + '/api/health'
        $snap.ApiStatus = Test-HttpStatus -Url $snap.ApiUrl -TimeoutSec 4

        $dbContainer = $null
        if ($snap.Containers.ContainsKey('db')) { $dbContainer = $snap.Containers['db'] }
        if ($dbContainer) {
            if ($dbContainer.State -ne 'running') {
                $snap.DatabaseState = 'down'
            } elseif ($dbContainer.Health -eq 'healthy') {
                $snap.DatabaseState = 'ok'
            } elseif ($dbContainer.Health) {
                $snap.DatabaseState = 'starting'
            } else {
                $snap.DatabaseState = 'ok'
            }
        } else {
            $snap.DatabaseState = 'down'
        }
    } elseif ($mode -eq 'portable') {
        $port = [int](Get-EnvValue -Key 'PORT' -Default '3002')
        $snap.Url = "http://localhost:$port"
        $snap.LanUrl = ((Get-LocalIP) | ForEach-Object { "http://$($_):$port" })
        $snap.Port = "$port"
        $snap.ApiUrl = "http://localhost:$port/api/health"
        $snap.ApiStatus = Test-HttpStatus -Url $snap.ApiUrl -TimeoutSec 4
        if (Test-Port -Port 3306 -TimeoutMs 800) {
            $snap.DatabaseState = 'ok'
        } else {
            $snap.DatabaseState = 'down'
        }
    } else {
        $snap.ApiStatus = 0
        $snap.DatabaseState = 'n/a'
    }

    $backup = Get-BackupInfo
    if ($backup) {
        $snap.LastBackup = $backup.Date
        $snap.LastBackupAgeDays = [math]::Floor(((Get-Date) - $backup.Date).TotalDays)
    }

    $snap.Logs = Get-LogsSnapshot -Service $LogService -Tail $LogTail
    return $snap
}

# ---------------------------------------------------------------------------
# Acciones
# ---------------------------------------------------------------------------

function Start-ArbolitosSystem {
    $root = Get-ArbolitosRoot
    $mode = Get-Mode

    if ($mode -eq 'missing') {
        throw 'No se encontro una instalacion de 2Arbolitos en esta carpeta.'
    }

    if ($mode -eq 'docker') {
        if (-not (Test-DockerCli)) {
            throw 'Docker no esta instalado o no esta en el PATH.'
        }

        if (-not (Test-DockerEngine -Force)) {
            $opened = Open-DockerDesktop
            if (-not $opened) {
                throw 'Docker Desktop no esta corriendo y no se encontro el acceso directo. Abrelo manualmente y vuelve a intentar.'
            }
            $deadline = (Get-Date).AddSeconds(150)
            while ((Get-Date) -lt $deadline) {
                Start-Sleep -Seconds 3
                if (Test-DockerEngine -Force) { break }
            }
            if (-not (Test-DockerEngine -Force)) {
                throw 'Docker Desktop no respondio en 150 segundos. Abrelo manualmente y vuelve a intentar.'
            }
        }

        $up = Invoke-DockerCompose -Tokens @('up', '-d') -TimeoutSec 240
        if ($up.ExitCode -ne 0) {
            $detail = Get-FirstLine -Text $up.Err
            if (-not $detail) { $detail = Get-FirstLine -Text $up.Out }
            throw ("No se pudieron levantar los contenedores. " + $detail)
        }

        $healthUrl = (Get-AccessUrl) + '/api/health'
        $deadline = (Get-Date).AddSeconds(120)
        while ((Get-Date) -lt $deadline) {
            if ((Test-HttpStatus -Url $healthUrl -TimeoutSec 5) -eq 200) {
                return ("Sistema iniciado. Abrelo en " + (Get-AccessUrl))
            }
            Start-Sleep -Seconds 2
        }
        return 'Los contenedores arrancaron, pero la interfaz todavia no responde. Revisa el registro.'
    }

    $bat = Join-Path $root 'start.bat'
    if (-not (Test-Path -LiteralPath $bat)) {
        throw 'No se encontro start.bat en la carpeta de la instalacion.'
    }
    Start-Process -FilePath $bat -WorkingDirectory $root -WindowStyle Minimized
    return 'Servidor portable iniciando. Puede tardar unos segundos.'
}

function Stop-ArbolitosSystem {
    $mode = Get-Mode

    if ($mode -eq 'docker') {
        $result = Invoke-DockerCompose -Tokens @('stop') -TimeoutSec 120
        if ($result.ExitCode -ne 0) {
            $detail = Get-FirstLine -Text $result.Err
            throw ("No se pudo detener el sistema. " + $detail)
        }
        return 'Sistema detenido.'
    }

    if ($mode -eq 'portable') {
        $stopped = $false
        try {
            $connections = Get-NetTCPConnection -LocalPort 3002 -State Listen -ErrorAction SilentlyContinue
            foreach ($connection in $connections) {
                Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
                $stopped = $true
            }
        } catch { }

        if (-not $stopped) {
            throw 'No se encontro el servidor portable corriendo en el puerto 3002.'
        }
        return 'Servidor portable detenido.'
    }

    throw 'No hay una instalacion que detener.'
}

function Restart-ArbolitosSystem {
    $mode = Get-Mode

    if ($mode -eq 'docker') {
        $result = Invoke-DockerCompose -Tokens @('restart') -TimeoutSec 180
        if ($result.ExitCode -ne 0) {
            $detail = Get-FirstLine -Text $result.Err
            throw ("No se pudo reiniciar el sistema. " + $detail)
        }
        return 'Sistema reiniciado.'
    }

    [void](Stop-ArbolitosSystem)
    Start-Sleep -Seconds 1
    return (Start-ArbolitosSystem)
}

function New-ArbolitosBackup {
    $root = Get-ArbolitosRoot
    if ((Get-Mode) -ne 'docker') {
        throw 'El respaldo automatico solo esta disponible en modo Docker.'
    }
    if (-not (Test-DockerEngine)) {
        throw 'El motor de Docker no esta corriendo. Inicia el sistema y vuelve a intentar.'
    }

    $dir = Join-Path $root 'backups'
    if (-not (Test-Path -LiteralPath $dir)) {
        [void](New-Item -ItemType Directory -Path $dir)
    }

    $stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
    $file = Join-Path $dir "backup-$stamp.sql"
    $password = Get-EnvValue -Key 'MYSQL_ROOT_PASSWORD' -Default '2arbolitos_segura_2024'
    $database = Get-EnvValue -Key 'MYSQL_DATABASE' -Default '2arbolitos'

    $tokens = @(
        'compose', 'exec', '-T', 'db', 'mysqldump',
        '-u', 'root', "-p$password",
        '--single-transaction', '--default-character-set=utf8mb4', $database
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'docker'
    $psi.Arguments = (ConvertTo-ArgumentString -Tokens $tokens)
    $psi.WorkingDirectory = $root
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.RedirectStandardInput = $true

    $proc = New-Object System.Diagnostics.Process
    $proc.StartInfo = $psi

    $err = ''
    $code = -1

    try {
        [void]$proc.Start()
        $proc.StandardInput.Close()
        $errTask = $proc.StandardError.ReadToEndAsync()

        $stream = [System.IO.File]::Create($file)
        try {
            $proc.StandardOutput.BaseStream.CopyTo($stream)
        } finally {
            $stream.Close()
        }

        if (-not $proc.WaitForExit(120000)) {
            try { $proc.Kill() } catch { }
            $err = 'Tiempo de espera agotado (120 s).'
        } else {
            $code = $proc.ExitCode
            $err = [string]$errTask.Result
        }
    } catch {
        $err = $_.Exception.Message
    } finally {
        $proc.Dispose()
    }

    $valid = $false
    if (Test-Path -LiteralPath $file) {
        $info = Get-Item -LiteralPath $file
        if ($info.Length -ge 2048) {
            $reader = New-Object -TypeName System.IO.StreamReader -ArgumentList $file
            try {
                $head = $reader.ReadLine()
                if ($head -and $head.Contains('MySQL dump')) { $valid = $true }
            } finally {
                $reader.Close()
            }
        }
    }

    if ($code -ne 0 -or -not $valid) {
        if (Test-Path -LiteralPath $file) { Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue }
        $detail = Get-FirstLine -Text $err
        if (-not $detail) { $detail = 'El archivo generado quedo vacio o incompleto.' }
        throw ("No se pudo crear el respaldo. " + $detail)
    }

    $sizeBytes = (Get-Item -LiteralPath $file).Length
    if ($sizeBytes -ge 1MB) {
        $sizeText = '{0:N1} MB' -f ($sizeBytes / 1MB)
    } else {
        $sizeText = '{0:N0} KB' -f ($sizeBytes / 1KB)
    }
    return "Respaldo creado: $(Split-Path -Leaf $file) ($sizeText)"
}

# ---------------------------------------------------------------------------
# Diagnostico
# ---------------------------------------------------------------------------

function Get-Diagnostics {
    $root = Get-ArbolitosRoot
    $rows = New-Object System.Collections.ArrayList
    $mode = Get-Mode

    [void]$rows.Add([pscustomobject]@{
        Label  = 'Equipo'
        State  = 'info'
        Detail = "$env:COMPUTERNAME - $([System.Environment]::OSVersion.VersionString)"
    })
    [void]$rows.Add([pscustomobject]@{
        Label  = 'PowerShell'
        State  = 'info'
        Detail = $PSVersionTable.PSVersion.ToString()
    })
    [void]$rows.Add([pscustomobject]@{
        Label  = 'Modo de instalacion'
        State  = if ($mode -eq 'missing') { 'bad' } else { 'ok' }
        Detail = switch ($mode) {
            'docker' { 'Docker (contenedores)' }
            'portable' { 'Portable (Node embebido)' }
            default { 'No se detecto una instalacion en esta carpeta' }
        }
    })

    $envFile = Join-Path $root '.env'
    [void]$rows.Add([pscustomobject]@{
        Label  = 'Archivo .env'
        State  = if (Test-Path -LiteralPath $envFile) { 'ok' } else { 'bad' }
        Detail = if (Test-Path -LiteralPath $envFile) { $envFile } else { 'Falta: ejecuta instalar.bat' }
    })

    if ($mode -eq 'docker') {
        $composeFile = Join-Path $root 'docker-compose.yml'
        [void]$rows.Add([pscustomobject]@{
            Label  = 'docker-compose.yml'
            State  = if (Test-Path -LiteralPath $composeFile) { 'ok' } else { 'bad' }
            Detail = $composeFile
        })

        if (-not (Test-DockerCli)) {
            [void]$rows.Add([pscustomobject]@{ Label = 'Docker CLI'; State = 'bad'; Detail = 'No esta instalado o no esta en el PATH' })
        } else {
            $version = Invoke-Native -FileName 'docker' -Arguments '--version' -TimeoutSec 10
            [void]$rows.Add([pscustomobject]@{
                Label  = 'Docker CLI'
                State  = if ($version.ExitCode -eq 0) { 'ok' } else { 'bad' }
                Detail = ([string]$version.Out).Trim()
            })

            $composeVersion = Invoke-Native -FileName 'docker' -Arguments 'compose version' -TimeoutSec 10
            [void]$rows.Add([pscustomobject]@{
                Label  = 'Docker Compose'
                State  = if ($composeVersion.ExitCode -eq 0) { 'ok' } else { 'bad' }
                Detail = ([string]$composeVersion.Out).Trim()
            })

            $engine = Test-DockerEngine -Force
            [void]$rows.Add([pscustomobject]@{
                Label  = 'Motor Docker'
                State  = if ($engine) { 'ok' } else { 'bad' }
                Detail = if ($engine) { 'Respondiendo' } else { 'Detenido: abre Docker Desktop' }
            })

            if ($engine) {
                $containers = Get-ComposePs
                foreach ($service in @('db', 'backend', 'frontend')) {
                    $container = $null
                    if ($containers.ContainsKey($service)) { $container = $containers[$service] }
                    if (-not $container) {
                        [void]$rows.Add([pscustomobject]@{ Label = "Contenedor $service"; State = 'bad'; Detail = 'No esta creado ni corriendo' })
                    } elseif ($container.State -eq 'running') {
                        $detail = 'Corriendo'
                        if ($container.Health) { $detail = "Corriendo ($($container.Health))" }
                        [void]$rows.Add([pscustomobject]@{ Label = "Contenedor $service"; State = 'ok'; Detail = $detail })
                    } else {
                        [void]$rows.Add([pscustomobject]@{ Label = "Contenedor $service"; State = 'bad'; Detail = [string]$container.State })
                    }
                }
            }
        }
    } else {
        $nodeExe = Join-Path $root 'node\node.exe'
        [void]$rows.Add([pscustomobject]@{
            Label  = 'Node embebido'
            State  = if (Test-Path -LiteralPath $nodeExe) { 'ok' } else { 'bad' }
            Detail = $nodeExe
        })
        [void]$rows.Add([pscustomobject]@{
            Label  = 'MySQL en el puerto 3306'
            State  = if (Test-Port -Port 3306 -TimeoutMs 1200) { 'ok' } else { 'bad' }
            Detail = 'Necesario para el modo portable'
        })
    }

    $frontPort = Get-FrontendPort
    if ($mode -eq 'portable') { $frontPort = Get-EnvValue -Key 'PORT' -Default '3002' }
    $listening = Test-Port -Port ([int]$frontPort) -TimeoutMs 1500
    [void]$rows.Add([pscustomobject]@{
        Label  = "Puerto $frontPort"
        State  = if ($listening) { 'ok' } else { 'bad' }
        Detail = if ($listening) { 'Escuchando' } else { 'Nada escucha en ese puerto' }
    })

    $url = if ($mode -eq 'portable') { "http://localhost:$frontPort" } else { Get-AccessUrl }
    $apiCode = Test-HttpStatus -Url "$url/api/health" -TimeoutSec 5
    [void]$rows.Add([pscustomobject]@{
        Label  = 'API /api/health'
        State  = if ($apiCode -eq 200) { 'ok' } else { 'bad' }
        Detail = if ($apiCode -eq 0) { 'Sin respuesta' } else { "HTTP $apiCode" }
    })

    $qrCode = Test-HttpStatus -Url "$url/qr" -TimeoutSec 5
    [void]$rows.Add([pscustomobject]@{
        Label  = 'Pagina QR'
        State  = if ($qrCode -eq 200) { 'ok' } else { 'bad' }
        Detail = if ($qrCode -eq 0) { 'Sin respuesta' } else { "HTTP $qrCode" }
    })

    $free = Get-DiskFreeGb
    [void]$rows.Add([pscustomobject]@{
        Label  = 'Disco libre'
        State  = if ($free -lt 2) { 'bad' } elseif ($free -lt 5) { 'warn' } else { 'ok' }
        Detail = "$free GB disponibles"
    })

    $backup = Get-BackupInfo
    if (-not $backup) {
        [void]$rows.Add([pscustomobject]@{ Label = 'Ultimo respaldo'; State = 'warn'; Detail = 'Nunca se genero un respaldo' })
    } else {
        $days = [math]::Floor(((Get-Date) - $backup.Date).TotalDays)
        [void]$rows.Add([pscustomobject]@{
            Label  = 'Ultimo respaldo'
            State  = if ($days -gt 7) { 'warn' } else { 'ok' }
            Detail = "$($backup.Name) - hace $days dia(s)"
        })
    }

    [void]$rows.Add([pscustomobject]@{
        Label  = 'Red local'
        State  = 'info'
        Detail = "$(Get-LanUrl) (para celulares en la misma WiFi)"
    })

    return $rows
}
