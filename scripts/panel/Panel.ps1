#requires -version 5.1
<#
.SYNOPSIS
    Panel de control de 2Arbolitos POS (WPF, sin dependencias).
.DESCRIPTION
    Ventana unica para arrancar, detener, reiniciar, respaldar y diagnosticar
    la instalacion (Docker o portable). Pensada para la PC del restaurante.
.PARAMETER SelfTest
    Ejecuta las comprobaciones y valida el XAML sin abrir la ventana.
.NOTES
    Guardar siempre en UTF-8 con BOM. PowerShell 5.1 lee sin BOM como ANSI
    y rompe los acentos.
#>

param(
    [switch]$SelfTest
)

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

trap {
    $message = $_.Exception.Message
    $logFile = Join-Path $env:TEMP '2arbolitos-panel-error.log'
    $details = "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`r`n$message`r`n`r`n$($_.ScriptStackTrace)"
    try { Set-Content -LiteralPath $logFile -Value $details -Encoding UTF8 } catch { }
    try {
        [void][System.Windows.MessageBox]::Show(
            "No se pudo abrir el panel.`n`n$message`n`nDetalle en:`n$logFile",
            '2 Arbolitos - Panel',
            [System.Windows.MessageBoxButton]::OK,
            [System.Windows.MessageBoxImage]::Error)
    } catch { }
    exit 1
}

$Script:OpsPath = Join-Path $PSScriptRoot 'Ops.ps1'
if (-not (Test-Path -LiteralPath $Script:OpsPath)) {
    throw "No se encontro Ops.ps1 junto a Panel.ps1 ($Script:OpsPath)."
}
. $Script:OpsPath

$Script:Window = $null
$Script:StatusDots = @{}
$Script:StatusValues = @{}
$Script:Busy = $false
$Script:Snapshot = $null
$Script:LogService = 'todos'
$Script:DiagRows = @()
$Script:PollRs = $null
$Script:PollPs = $null
$Script:PollHandle = $null
$Script:ActionRs = $null
$Script:ActionPs = $null
$Script:ActionHandle = $null
$Script:PollTimer = $null
$Script:ActionTimer = $null

# ---------------------------------------------------------------------------
# Ventana
# ---------------------------------------------------------------------------

$xamlText = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="2 Arbolitos - Panel de control"
        Width="1060" Height="802" MinWidth="940" MinHeight="640"
        WindowStartupLocation="CenterScreen"
        Background="#F9F7F2"
        FontFamily="Segoe UI"
        TextOptions.TextFormattingMode="Display"
        UseLayoutRounding="True"
        SnapsToDevicePixels="True">

  <Window.Resources>

    <Style x:Key="FlatButton" TargetType="Button">
      <Setter Property="Background" Value="Transparent"/>
      <Setter Property="Foreground" Value="#374151"/>
      <Setter Property="BorderThickness" Value="0"/>
      <Setter Property="Padding" Value="16,0"/>
      <Setter Property="Height" Value="42"/>
      <Setter Property="FontSize" Value="13.5"/>
      <Setter Property="FontWeight" Value="SemiBold"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="FocusVisualStyle" Value="{x:Null}"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border x:Name="Bd"
                    Background="{TemplateBinding Background}"
                    BorderBrush="{TemplateBinding BorderBrush}"
                    BorderThickness="{TemplateBinding BorderThickness}"
                    CornerRadius="10"
                    Padding="{TemplateBinding Padding}"
                    SnapsToDevicePixels="True">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True">
                <Setter TargetName="Bd" Property="Opacity" Value="0.86"/>
              </Trigger>
              <Trigger Property="IsPressed" Value="True">
                <Setter TargetName="Bd" Property="Opacity" Value="0.70"/>
              </Trigger>
              <Trigger Property="IsEnabled" Value="False">
                <Setter TargetName="Bd" Property="Opacity" Value="0.45"/>
              </Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>

    <Style x:Key="PrimaryButton" TargetType="Button" BasedOn="{StaticResource FlatButton}">
      <Setter Property="Background" Value="#1A4D2E"/>
      <Setter Property="Foreground" Value="#FFFFFF"/>
    </Style>

    <Style x:Key="DangerButton" TargetType="Button" BasedOn="{StaticResource FlatButton}">
      <Setter Property="Background" Value="#FFFFFF"/>
      <Setter Property="Foreground" Value="#B91C1C"/>
      <Setter Property="BorderBrush" Value="#FCA5A5"/>
      <Setter Property="BorderThickness" Value="1"/>
    </Style>

    <Style x:Key="GhostButton" TargetType="Button" BasedOn="{StaticResource FlatButton}">
      <Setter Property="Background" Value="#F3F4F6"/>
      <Setter Property="Foreground" Value="#374151"/>
    </Style>

    <Style x:Key="LinkButton" TargetType="Button" BasedOn="{StaticResource FlatButton}">
      <Setter Property="Height" Value="26"/>
      <Setter Property="FontSize" Value="12"/>
      <Setter Property="Foreground" Value="#1A4D2E"/>
    </Style>

    <Style x:Key="SectionLabel" TargetType="TextBlock">
      <Setter Property="FontSize" Value="10.5"/>
      <Setter Property="FontWeight" Value="Bold"/>
      <Setter Property="Foreground" Value="#9CA3AF"/>
      <Setter Property="Margin" Value="0,0,0,10"/>
    </Style>

    <Style x:Key="Card" TargetType="Border">
      <Setter Property="Background" Value="#FFFFFF"/>
      <Setter Property="BorderBrush" Value="#E5E7EB"/>
      <Setter Property="BorderThickness" Value="1"/>
      <Setter Property="CornerRadius" Value="14"/>
      <Setter Property="Padding" Value="18,16"/>
    </Style>

  </Window.Resources>

  <Grid>
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="*"/>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="Auto"/>
    </Grid.RowDefinitions>

    <!-- Encabezado -->
    <Border Grid.Row="0" Background="#FFFFFF" BorderBrush="#E5E7EB" BorderThickness="0,0,0,1" Padding="20,14">
      <Grid>
        <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
          <Border Width="36" Height="36" CornerRadius="10" Background="#1A4D2E" Margin="0,0,12,0">
            <TextBlock Text="2A" Foreground="#FFFFFF" FontWeight="Bold" FontSize="13"
                       HorizontalAlignment="Center" VerticalAlignment="Center"/>
          </Border>
          <StackPanel VerticalAlignment="Center">
            <TextBlock Text="2 Arbolitos - Panel de control" FontSize="15" FontWeight="SemiBold" Foreground="#113520"/>
            <TextBlock x:Name="TxtSubtitle" Text="Comprobando el estado..." FontSize="11.5" Foreground="#6B7280"/>
          </StackPanel>
        </StackPanel>
        <StackPanel Orientation="Horizontal" HorizontalAlignment="Right" VerticalAlignment="Center">
          <Border x:Name="BadgeMode" Background="#E8F0EA" CornerRadius="999" Padding="10,4" Margin="0,0,10,0">
            <TextBlock x:Name="TxtMode" Text="DOCKER" FontSize="10.5" FontWeight="Bold" Foreground="#1A4D2E"/>
          </Border>
          <TextBlock x:Name="TxtVersion" Text="v1.0.0" FontSize="11.5" Foreground="#6B7280" VerticalAlignment="Center"/>
        </StackPanel>
      </Grid>
    </Border>

    <!-- Contenido -->
    <ScrollViewer Grid.Row="1" VerticalScrollBarVisibility="Auto" HorizontalScrollBarVisibility="Disabled">
    <Grid Margin="20,18,20,0">
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="*"/>
        <ColumnDefinition Width="16"/>
        <ColumnDefinition Width="336"/>
      </Grid.ColumnDefinitions>

      <StackPanel Grid.Column="0">
        <Border Style="{StaticResource Card}">
          <StackPanel>
            <TextBlock Text="ESTADO" Style="{StaticResource SectionLabel}"/>
            <StackPanel x:Name="StatusList"/>
          </StackPanel>
        </Border>

        <Border Style="{StaticResource Card}" Margin="0,14,0,0">
          <StackPanel>
            <TextBlock Text="ACCESO" Style="{StaticResource SectionLabel}"/>

            <Grid Margin="0,0,0,8">
              <Grid.ColumnDefinitions>
                <ColumnDefinition Width="58"/>
                <ColumnDefinition Width="*"/>
              </Grid.ColumnDefinitions>
              <TextBlock Grid.Column="0" Text="Local" FontSize="12.5" Foreground="#6B7280" VerticalAlignment="Center"/>
              <TextBox Grid.Column="1" x:Name="TxtLocalUrl" Text="..." IsReadOnly="True" BorderThickness="0"
                       Background="Transparent" Foreground="#113520" FontSize="13" FontWeight="SemiBold"
                       Padding="0" Cursor="Arrow"/>
            </Grid>

            <Grid Margin="0,0,0,12">
              <Grid.ColumnDefinitions>
                <ColumnDefinition Width="58"/>
                <ColumnDefinition Width="*"/>
              </Grid.ColumnDefinitions>
              <TextBlock Grid.Column="0" Text="Red" FontSize="12.5" Foreground="#6B7280" VerticalAlignment="Center"/>
              <TextBox Grid.Column="1" x:Name="TxtLanUrl" Text="..." IsReadOnly="True" BorderThickness="0"
                       Background="Transparent" Foreground="#113520" FontSize="13" FontWeight="SemiBold"
                       Padding="0" Cursor="Arrow"/>
            </Grid>

            <StackPanel Orientation="Horizontal">
              <Button x:Name="BtnOpen" Content="Abrir POS" Style="{StaticResource PrimaryButton}"
                      Width="124" Height="38" Margin="0,0,8,0" ToolTip="Abre el sistema en el navegador"/>
              <Button x:Name="BtnCopy" Content="Copiar URL" Style="{StaticResource GhostButton}"
                      Width="124" Height="38" Margin="0,0,8,0" ToolTip="Copia la direccion para celulares"/>
              <Button x:Name="BtnQr" Content="Ver QR" Style="{StaticResource GhostButton}"
                      Width="104" Height="38" ToolTip="Muestra el codigo QR de acceso"/>
            </StackPanel>
          </StackPanel>
        </Border>
      </StackPanel>

      <StackPanel Grid.Column="2">
        <Border Style="{StaticResource Card}">
          <StackPanel>
            <TextBlock Text="ACCIONES" Style="{StaticResource SectionLabel}"/>
            <Button x:Name="BtnStart" Content="Iniciar sistema" Style="{StaticResource PrimaryButton}" Height="44"/>
            <Button x:Name="BtnStop" Content="Detener sistema" Style="{StaticResource DangerButton}"
                    Height="42" Margin="0,10,0,0"/>
            <Button x:Name="BtnRestart" Content="Reiniciar" Style="{StaticResource GhostButton}"
                    Height="42" Margin="0,10,0,0"/>
            <Button x:Name="BtnDocker" Content="Abrir Docker Desktop" Style="{StaticResource LinkButton}"
                    Margin="0,8,0,0" Visibility="Collapsed"/>

            <ProgressBar x:Name="BarBusy" IsIndeterminate="True" Height="3" Margin="0,14,0,0"
                         Visibility="Collapsed" Foreground="#1A4D2E" Background="#E5E7EB" BorderThickness="0"/>

            <Border x:Name="Banner" Visibility="Collapsed" CornerRadius="8" Padding="10,8" Margin="0,12,0,0"
                    Background="#ECFDF5" BorderBrush="#A7F3D0" BorderThickness="1">
              <TextBlock x:Name="TxtBanner" TextWrapping="Wrap" FontSize="12" Foreground="#065F46"/>
            </Border>
          </StackPanel>
        </Border>

        <Border Style="{StaticResource Card}" Margin="0,14,0,0">
          <StackPanel>
            <TextBlock Text="RESPALDO" Style="{StaticResource SectionLabel}"/>
            <TextBlock x:Name="TxtLastBackup" Text="Sin respaldos" FontSize="13" FontWeight="SemiBold"
                       Foreground="#113520" TextWrapping="Wrap"/>
            <TextBlock x:Name="TxtBackupHint" Text="Nunca se genero una copia de seguridad."
                       FontSize="11.5" Foreground="#6B7280" TextWrapping="Wrap" Margin="0,3,0,0"/>
            <Button x:Name="BtnBackup" Content="Respaldar ahora" Style="{StaticResource GhostButton}"
                    Height="38" Margin="0,12,0,0"/>
            <Button x:Name="BtnDiag" Content="Diagnostico" Style="{StaticResource GhostButton}"
                    Height="38" Margin="0,8,0,0"/>
          </StackPanel>
        </Border>
      </StackPanel>
    </Grid>
    </ScrollViewer>

    <!-- Registro -->
    <Border Grid.Row="2" Background="#0F172A" Margin="20,16,20,0" CornerRadius="12">
      <Grid>
        <Grid.RowDefinitions>
          <RowDefinition Height="Auto"/>
          <RowDefinition Height="150"/>
        </Grid.RowDefinitions>

        <Grid Grid.Row="0" Margin="14,10,12,4">
          <TextBlock Text="REGISTRO" FontSize="10.5" FontWeight="Bold" Foreground="#94A3B8" VerticalAlignment="Center"/>
          <StackPanel Orientation="Horizontal" HorizontalAlignment="Right">
            <ComboBox x:Name="CmbLogService" Width="118" Height="26" FontSize="12" Margin="0,0,6,0"/>
            <Button x:Name="BtnLogRefresh" Content="Actualizar" Style="{StaticResource GhostButton}"
                    Width="94" Height="26" FontSize="11.5" Padding="8,0"/>
          </StackPanel>
        </Grid>

        <TextBox x:Name="TxtLogs" Grid.Row="1" IsReadOnly="True" BorderThickness="0"
                 Background="#0F172A" Foreground="#D1FAE5" CaretBrush="#D1FAE5"
                 FontFamily="Consolas" FontSize="11.5" Padding="14,4,14,12"
                 TextWrapping="NoWrap" VerticalScrollBarVisibility="Auto"
                 HorizontalScrollBarVisibility="Auto"/>
      </Grid>
    </Border>

    <!-- Pie -->
    <Grid Grid.Row="3" Margin="22,10,22,14">
      <TextBlock x:Name="TxtFooter" Text="..." FontSize="11.5" Foreground="#6B7280"/>
      <TextBlock x:Name="TxtRefresh" Text="" FontSize="11.5" Foreground="#9CA3AF" HorizontalAlignment="Right"/>
    </Grid>
  </Grid>
</Window>
'@

$xmlDocument = New-Object System.Xml.XmlDocument
$xmlDocument.LoadXml($xamlText)
$xmlReader = New-Object -TypeName System.Xml.XmlNodeReader -ArgumentList $xmlDocument
$Script:Window = [System.Windows.Markup.XamlReader]::Load($xmlReader)

if (-not $Script:Window) {
    throw 'No se pudo construir la ventana del panel.'
}

$iconCandidates = @(
    (Join-Path (Get-ArbolitosRoot) 'public\pwa-192x192.png'),
    (Join-Path (Get-ArbolitosRoot) 'dist\pwa-192x192.png')
)
foreach ($iconPath in $iconCandidates) {
    if (Test-Path -LiteralPath $iconPath) {
        try {
            $Script:Window.Icon = [System.Windows.Media.Imaging.BitmapFrame]::Create([Uri]$iconPath)
            break
        } catch { }
    }
}

# ---------------------------------------------------------------------------
# Utilidades de interfaz
# ---------------------------------------------------------------------------

function Get-El {
    param([string]$Name)
    return $Script:Window.FindName($Name)
}

function ConvertTo-Brush {
    param([string]$Hex)
    $converter = New-Object System.Windows.Media.BrushConverter
    return $converter.ConvertFromString($Hex)
}

function Get-StateColor {
    param([string]$State)
    switch ($State) {
        'ok'    { return '#16A34A' }
        'warn'  { return '#D97706' }
        'bad'   { return '#DC2626' }
        'info'  { return '#2563EB' }
        default { return '#9CA3AF' }
    }
}

function Set-Status {
    param(
        [string]$Key,
        [string]$State,
        [string]$Text
    )
    if (-not $Script:StatusDots.ContainsKey($Key)) { return }
    $color = Get-StateColor -State $State
    $brush = ConvertTo-Brush $color
    $Script:StatusDots[$Key].Fill = $brush
    $Script:StatusValues[$Key].Text = $Text
    $Script:StatusValues[$Key].Foreground = $brush
}

function New-StatusRow {
    param([string]$Key, [string]$Caption)

    $grid = New-Object System.Windows.Controls.Grid
    $grid.Margin = [System.Windows.Thickness]::new(0, 0, 0, 9)

    $colDot = New-Object System.Windows.Controls.ColumnDefinition
    $colDot.Width = [System.Windows.GridLength]::new(16)
    $colText = New-Object System.Windows.Controls.ColumnDefinition
    $colText.Width = [System.Windows.GridLength]::new(1, [System.Windows.GridUnitType]::Star)
    $colValue = New-Object System.Windows.Controls.ColumnDefinition
    $colValue.Width = [System.Windows.GridLength]::new(0, [System.Windows.GridUnitType]::Auto)
    [void]$grid.ColumnDefinitions.Add($colDot)
    [void]$grid.ColumnDefinitions.Add($colText)
    [void]$grid.ColumnDefinitions.Add($colValue)

    $dot = New-Object System.Windows.Shapes.Ellipse
    $dot.Width = 9
    $dot.Height = 9
    $dot.Fill = ConvertTo-Brush '#D1D5DB'
    $dot.VerticalAlignment = 'Center'
    $dot.HorizontalAlignment = 'Left'
    [System.Windows.Controls.Grid]::SetColumn($dot, 0)

    $label = New-Object System.Windows.Controls.TextBlock
    $label.Text = $Caption
    $label.FontSize = 13
    $label.Foreground = ConvertTo-Brush '#374151'
    $label.VerticalAlignment = 'Center'
    [System.Windows.Controls.Grid]::SetColumn($label, 1)

    $value = New-Object System.Windows.Controls.TextBlock
    $value.Text = '...'
    $value.FontSize = 12.5
    $value.FontWeight = 'SemiBold'
    $value.Foreground = ConvertTo-Brush '#9CA3AF'
    $value.VerticalAlignment = 'Center'
    $value.HorizontalAlignment = 'Right'
    [System.Windows.Controls.Grid]::SetColumn($value, 2)

    [void]$grid.Children.Add($dot)
    [void]$grid.Children.Add($label)
    [void]$grid.Children.Add($value)

    [void](Get-El 'StatusList').Children.Add($grid)
    $Script:StatusDots[$Key] = $dot
    $Script:StatusValues[$Key] = $value
}

function Show-Banner {
    param([bool]$Ok, [string]$Text)
    $banner = Get-El 'Banner'
    $label = Get-El 'TxtBanner'
    if ($Ok) {
        $banner.Background = ConvertTo-Brush '#ECFDF5'
        $banner.BorderBrush = ConvertTo-Brush '#A7F3D0'
        $label.Foreground = ConvertTo-Brush '#065F46'
    } else {
        $banner.Background = ConvertTo-Brush '#FEF2F2'
        $banner.BorderBrush = ConvertTo-Brush '#FECACA'
        $label.Foreground = ConvertTo-Brush '#991B1B'
    }
    $banner.BorderThickness = [System.Windows.Thickness]::new(1)
    $label.Text = $Text
    $banner.Visibility = 'Visible'
}

function Get-FriendlyError {
    param([string]$Text)
    if (-not $Text) { return 'Ocurrio un error inesperado.' }
    $line = ($Text -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -First 1)
    if (-not $line) { return 'Ocurrio un error inesperado.' }
    if ($line.Length -gt 320) { $line = $line.Substring(0, 320) + '...' }
    return $line.Trim()
}

# ---------------------------------------------------------------------------
# Estado de la interfaz
# ---------------------------------------------------------------------------

function Update-Buttons {
    $snap = $Script:Snapshot
    if (-not $snap) { return }

    $busy = $Script:Busy
    $enabled = -not $busy
    $running = ($snap.ApiStatus -eq 200)
    $modeOk = ($snap.Mode -ne 'missing')
    $engineOk = ($snap.Mode -eq 'portable') -or ($snap.Engine -eq $true)

    $anythingRunning = $running
    if ($snap.Mode -eq 'docker' -and $snap.Containers) {
        foreach ($container in $snap.Containers.Values) {
            if ($container.State -eq 'running') { $anythingRunning = $true }
        }
    }

    (Get-El 'BtnStart').IsEnabled = $enabled -and $modeOk -and (-not $running)
    (Get-El 'BtnStop').IsEnabled = $enabled -and $modeOk -and $engineOk -and $anythingRunning
    (Get-El 'BtnRestart').IsEnabled = $enabled -and $modeOk -and $engineOk -and $anythingRunning
    (Get-El 'BtnBackup').IsEnabled = $enabled -and ($snap.Mode -eq 'docker') -and $snap.Engine
    (Get-El 'BtnDiag').IsEnabled = $enabled
    (Get-El 'BtnOpen').IsEnabled = $running
    (Get-El 'BtnCopy').IsEnabled = $modeOk
    (Get-El 'BtnQr').IsEnabled = $running
    (Get-El 'BtnDocker').Visibility = if ($snap.Mode -eq 'docker' -and -not $snap.Engine) { 'Visible' } else { 'Collapsed' }
}

function Set-Busy {
    param([bool]$Busy, [string]$Text)
    $Script:Busy = $Busy
    (Get-El 'BarBusy').Visibility = if ($Busy) { 'Visible' } else { 'Collapsed' }
    if ($Busy) {
        (Get-El 'Banner').Visibility = 'Collapsed'
        if ($Text) { (Get-El 'TxtSubtitle').Text = $Text }
    }
    Update-Buttons
}

function Update-Ui {
    param($Snapshot)

    $Script:Snapshot = $Snapshot

    (Get-El 'TxtVersion').Text = 'v' + $Snapshot.Version
    (Get-El 'TxtMode').Text = switch ($Snapshot.Mode) {
        'docker' { 'DOCKER' }
        'portable' { 'PORTABLE' }
        default { 'SIN INSTALAR' }
    }
    (Get-El 'TxtLocalUrl').Text = $Snapshot.Url
    (Get-El 'TxtLanUrl').Text = $Snapshot.LanUrl

    if ($Snapshot.Mode -eq 'portable') {
        Set-Status 'engine' 'muted' 'no aplica'
    } elseif (-not $Snapshot.DockerCli) {
        Set-Status 'engine' 'bad' 'no instalado'
    } elseif ($Snapshot.Engine) {
        Set-Status 'engine' 'ok' 'activo'
    } else {
        Set-Status 'engine' 'bad' 'detenido'
    }

    foreach ($service in @('db', 'backend', 'frontend')) {
        $key = "c-$service"
        if ($Snapshot.Mode -ne 'docker') {
            Set-Status $key 'muted' 'no aplica'
            continue
        }
        $container = $null
        if ($Snapshot.Containers -and $Snapshot.Containers.ContainsKey($service)) {
            $container = $Snapshot.Containers[$service]
        }
        if (-not $container) {
            Set-Status $key 'bad' 'detenido'
            continue
        }
        if ($container.State -ne 'running') {
            Set-Status $key 'bad' ([string]$container.State)
            continue
        }
        switch ($container.Health) {
            'unhealthy' { Set-Status $key 'bad' 'con fallos' }
            'starting' { Set-Status $key 'warn' 'iniciando' }
            default { Set-Status $key 'ok' 'activo' }
        }
    }

    if ($Snapshot.ApiStatus -eq 200) {
        Set-Status 'api' 'ok' '200 OK'
    } elseif ($Snapshot.ApiStatus -eq 0) {
        Set-Status 'api' 'bad' 'sin respuesta'
    } else {
        Set-Status 'api' 'warn' "HTTP $($Snapshot.ApiStatus)"
    }

    switch ($Snapshot.DatabaseState) {
        'ok' { Set-Status 'database' 'ok' 'responde' }
        'starting' { Set-Status 'database' 'warn' 'iniciando' }
        'down' { Set-Status 'database' 'bad' 'sin conexion' }
        default { Set-Status 'database' 'muted' 'no aplica' }
    }

    $backupLabel = Get-El 'TxtLastBackup'
    $backupHint = Get-El 'TxtBackupHint'
    if ($Snapshot.LastBackup) {
        $days = [int]$Snapshot.LastBackupAgeDays
        if ($days -le 0) {
            $backupLabel.Text = 'Ultimo respaldo: hoy'
        } elseif ($days -eq 1) {
            $backupLabel.Text = 'Ultimo respaldo: ayer'
        } else {
            $backupLabel.Text = "Ultimo respaldo: hace $days dias"
        }
        if ($days -gt 7) {
            $backupLabel.Foreground = ConvertTo-Brush '#B45309'
            $backupHint.Text = 'Hace mas de una semana. Conviene respaldar ahora.'
        } else {
            $backupLabel.Foreground = ConvertTo-Brush '#113520'
            $backupHint.Text = 'Copia de la base de datos guardada en la carpeta backups.'
        }
    } else {
        $backupLabel.Text = 'Sin respaldos'
        $backupLabel.Foreground = ConvertTo-Brush '#DC2626'
        $backupHint.Text = 'Nunca se genero una copia de seguridad.'
    }

    $logs = Get-El 'TxtLogs'
    $atBottom = ($logs.VerticalOffset + $logs.ViewportHeight) -ge ($logs.ExtentHeight - 10)
    $text = [string]$Snapshot.Logs
    if ($text.Length -gt 40000) {
        $text = $text.Substring($text.Length - 40000)
    }
    if (-not $text.Trim()) { $text = 'Sin actividad reciente.' }
    $logs.Text = $text
    if ($atBottom) { $logs.ScrollToEnd() }

    (Get-El 'TxtFooter').Text = "Puerto $($Snapshot.Port)   -   Disco libre $($Snapshot.DiskFreeGb) GB   -   Red $(($Snapshot.LanUrl) -replace '^http://', '')"
    (Get-El 'TxtRefresh').Text = 'Actualizado ' + (Get-Date -Format 'HH:mm:ss')

    if (-not $Script:Busy) {
        if ($Snapshot.Mode -eq 'missing') {
            (Get-El 'TxtSubtitle').Text = 'No se encontro una instalacion en esta carpeta'
        } elseif ($Snapshot.ApiStatus -eq 200) {
            (Get-El 'TxtSubtitle').Text = 'Sistema operativo'
        } else {
            (Get-El 'TxtSubtitle').Text = 'Sistema detenido'
        }
    }

    if ($Script:PollTimer -and $Script:PollTimer.Interval.TotalSeconds -lt 4) {
        $Script:PollTimer.Interval = [TimeSpan]::FromSeconds(4)
    }

    Update-Buttons
}

# ---------------------------------------------------------------------------
# Sondeo y acciones en segundo plano
# ---------------------------------------------------------------------------

function New-OpsRunspace {
    $runspace = [runspacefactory]::CreateRunspace()
    $runspace.ThreadOptions = 'ReuseThread'
    $runspace.Open()

    $init = [powershell]::Create()
    $init.Runspace = $runspace
    [void]$init.AddScript(". '$Script:OpsPath'")
    try {
        [void]$init.Invoke()
    } catch {
        $init.Dispose()
        $runspace.Dispose()
        throw "No se pudo cargar Ops.ps1: $($_.Exception.Message)"
    }
    $init.Dispose()
    return $runspace
}

function Request-Snapshot {
    if ($Script:PollHandle) { return }
    $ps = [powershell]::Create()
    $ps.Runspace = $Script:PollRs
    $service = $Script:LogService
    [void]$ps.AddScript("Get-SystemSnapshot -LogService '$service' -LogTail 200")
    $Script:PollPs = $ps
    $Script:PollHandle = $ps.BeginInvoke()
}

function Complete-Snapshot {
    if (-not $Script:PollHandle) { return }
    if (-not $Script:PollHandle.IsCompleted) { return }

    $snapshot = $null
    try {
        $snapshot = $Script:PollPs.EndInvoke($Script:PollHandle)
    } catch {
        $snapshot = $null
    }
    $Script:PollPs.Dispose()
    $Script:PollPs = $null
    $Script:PollHandle = $null

    if ($snapshot) {
        try {
            Update-Ui $snapshot
        } catch {
            Show-Banner $false (Get-FriendlyError $_.Exception.Message)
        }
    }
}

function Invoke-PanelAction {
    param(
        [string]$Label,
        [string]$ScriptText
    )
    if ($Script:Busy) { return }

    Set-Busy $true $Label
    $ps = [powershell]::Create()
    $ps.Runspace = $Script:ActionRs
    [void]$ps.AddScript($ScriptText)
    $Script:ActionPs = $ps
    $Script:ActionHandle = $ps.BeginInvoke()
}

# ---------------------------------------------------------------------------
# Diagnostico
# ---------------------------------------------------------------------------

function Show-Diagnostics {
    $window = $Script:Window
    $rows = @()

    $window.Cursor = [System.Windows.Input.Cursors]::Wait
    try {
        $rows = @(Get-Diagnostics)
    } catch {
        Show-Banner $false (Get-FriendlyError $_.Exception.Message)
        return
    } finally {
        $window.Cursor = [System.Windows.Input.Cursors]::Arrow
    }

    $Script:DiagRows = $rows

    $dialog = New-Object System.Windows.Window
    $dialog.Title = 'Diagnostico del sistema'
    $dialog.Width = 700
    $dialog.Height = 640
    $dialog.MinWidth = 560
    $dialog.MinHeight = 420
    $dialog.WindowStartupLocation = 'CenterOwner'
    $dialog.Owner = $window
    $dialog.Background = ConvertTo-Brush '#F9F7F2'
    $dialog.FontFamily = New-Object -TypeName System.Windows.Media.FontFamily -ArgumentList 'Segoe UI'
    $dialog.UseLayoutRounding = $true

    $layout = New-Object System.Windows.Controls.Grid
    $rowHeader = New-Object System.Windows.Controls.RowDefinition
    $rowHeader.Height = [System.Windows.GridLength]::new(0, [System.Windows.GridUnitType]::Auto)
    $rowBody = New-Object System.Windows.Controls.RowDefinition
    $rowBody.Height = [System.Windows.GridLength]::new(1, [System.Windows.GridUnitType]::Star)
    $rowFooter = New-Object System.Windows.Controls.RowDefinition
    $rowFooter.Height = [System.Windows.GridLength]::new(0, [System.Windows.GridUnitType]::Auto)
    [void]$layout.RowDefinitions.Add($rowHeader)
    [void]$layout.RowDefinitions.Add($rowBody)
    [void]$layout.RowDefinitions.Add($rowFooter)

    $header = New-Object System.Windows.Controls.TextBlock
    $header.Text = "Revision de $env:COMPUTERNAME - $([System.Environment]::OSVersion.VersionString)"
    $header.FontSize = 12
    $header.Foreground = ConvertTo-Brush '#6B7280'
    $header.Margin = [System.Windows.Thickness]::new(20, 16, 20, 8)
    [System.Windows.Controls.Grid]::SetRow($header, 0)
    [void]$layout.Children.Add($header)

    $scroll = New-Object System.Windows.Controls.ScrollViewer
    $scroll.VerticalScrollBarVisibility = 'Auto'
    $scroll.Margin = [System.Windows.Thickness]::new(20, 0, 20, 0)
    [System.Windows.Controls.Grid]::SetRow($scroll, 1)

    $panel = New-Object System.Windows.Controls.StackPanel
    $scroll.Content = $panel

    foreach ($row in $rows) {
        $card = New-Object System.Windows.Controls.Border
        $card.Background = ConvertTo-Brush '#FFFFFF'
        $card.CornerRadius = [System.Windows.CornerRadius]::new(10)
        $card.Padding = [System.Windows.Thickness]::new(13, 9, 13, 9)
        $card.Margin = [System.Windows.Thickness]::new(0, 0, 0, 6)
        $card.BorderBrush = ConvertTo-Brush '#E5E7EB'
        $card.BorderThickness = [System.Windows.Thickness]::new(1)

        $item = New-Object System.Windows.Controls.Grid
        $colDot = New-Object System.Windows.Controls.ColumnDefinition
        $colDot.Width = [System.Windows.GridLength]::new(16)
        $colText = New-Object System.Windows.Controls.ColumnDefinition
        $colText.Width = [System.Windows.GridLength]::new(1, [System.Windows.GridUnitType]::Star)
        [void]$item.ColumnDefinitions.Add($colDot)
        [void]$item.ColumnDefinitions.Add($colText)

        $dot = New-Object System.Windows.Shapes.Ellipse
        $dot.Width = 8
        $dot.Height = 8
        $dot.Fill = ConvertTo-Brush (Get-StateColor -State $row.State)
        $dot.VerticalAlignment = 'Top'
        $dot.Margin = [System.Windows.Thickness]::new(0, 6, 0, 0)
        [System.Windows.Controls.Grid]::SetColumn($dot, 0)

        $texts = New-Object System.Windows.Controls.StackPanel
        [System.Windows.Controls.Grid]::SetColumn($texts, 1)

        $name = New-Object System.Windows.Controls.TextBlock
        $name.Text = [string]$row.Label
        $name.FontSize = 12.5
        $name.FontWeight = 'SemiBold'
        $name.Foreground = ConvertTo-Brush '#111827'

        $detail = New-Object System.Windows.Controls.TextBlock
        $detail.Text = [string]$row.Detail
        $detail.FontSize = 11.5
        $detail.Foreground = ConvertTo-Brush '#6B7280'
        $detail.TextWrapping = 'Wrap'
        $detail.Margin = [System.Windows.Thickness]::new(0, 2, 0, 0)

        [void]$texts.Children.Add($name)
        [void]$texts.Children.Add($detail)
        [void]$item.Children.Add($dot)
        [void]$item.Children.Add($texts)
        $card.Child = $item
        [void]$panel.Children.Add($card)
    }

    [void]$layout.Children.Add($scroll)

    $actions = New-Object System.Windows.Controls.StackPanel
    $actions.Orientation = 'Horizontal'
    $actions.HorizontalAlignment = 'Right'
    $actions.Margin = [System.Windows.Thickness]::new(20, 12, 20, 16)
    [System.Windows.Controls.Grid]::SetRow($actions, 2)

    $copyButton = New-Object System.Windows.Controls.Button
    $copyButton.Content = 'Copiar diagnostico'
    $copyButton.Style = $window.Resources['GhostButton']
    $copyButton.Width = 170
    $copyButton.Height = 38
    $copyButton.Margin = [System.Windows.Thickness]::new(0, 0, 8, 0)
    $copyButton.Add_Click({
        $lines = foreach ($item in $Script:DiagRows) {
            "[$($item.State)] $($item.Label): $($item.Detail)"
        }
        $text = "Diagnostico 2Arbolitos POS`r`nEquipo: $env:COMPUTERNAME`r`nFecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm')`r`n`r`n" + ($lines -join "`r`n")
        try {
            [System.Windows.Clipboard]::SetText($text)
            $Script:Window.FindName('TxtSubtitle').Text = 'Diagnostico copiado al portapapeles'
        } catch { }
    })

    $closeButton = New-Object System.Windows.Controls.Button
    $closeButton.Content = 'Cerrar'
    $closeButton.Style = $window.Resources['PrimaryButton']
    $closeButton.Width = 110
    $closeButton.Height = 38
    $closeButton.IsCancel = $true

    [void]$actions.Children.Add($copyButton)
    [void]$actions.Children.Add($closeButton)
    [void]$layout.Children.Add($actions)

    $dialog.Content = $layout
    [void]$dialog.ShowDialog()
}

# ---------------------------------------------------------------------------
# Autotest (sin ventana)
# ---------------------------------------------------------------------------

if ($SelfTest) {
    Write-Host '2Arbolitos - autotest del panel'
    Write-Host ('Raiz:     ' + (Get-ArbolitosRoot))
    Write-Host ('Modo:     ' + (Get-Mode))
    Write-Host ('Acentos:  instalación, diagnóstico, respaldo, año, señal')

    $snapshot = Get-SystemSnapshot -LogService 'todos' -LogTail 10
    Write-Host ('Version:  ' + $snapshot.Version)
    Write-Host ('URL:      ' + $snapshot.Url)
    Write-Host ('LAN:      ' + $snapshot.LanUrl)
    Write-Host ('API:      ' + $snapshot.ApiStatus)
    Write-Host ('BD:       ' + $snapshot.DatabaseState)
    Write-Host ('Contenedores: ' + $snapshot.Containers.Count)
    Write-Host ('Respaldo: ' + $(if ($snapshot.LastBackup) { $snapshot.LastBackup } else { 'ninguno' }))
    Write-Host ''

    foreach ($row in (Get-Diagnostics)) {
        Write-Host ("[{0,-5}] {1}: {2}" -f $row.State, $row.Label, $row.Detail)
    }

    Write-Host ''
    Write-Host ('XAML OK: ' + $Script:Window.Title + ' (' + $Script:Window.Width + 'x' + $Script:Window.Height + ')')
    return
}

# ---------------------------------------------------------------------------
# Montaje de la ventana
# ---------------------------------------------------------------------------

$window = $Script:Window

$statusDefinitions = @(
    @{ Key = 'engine'; Label = 'Motor Docker' },
    @{ Key = 'c-db'; Label = 'Contenedor db' },
    @{ Key = 'c-backend'; Label = 'Contenedor backend' },
    @{ Key = 'c-frontend'; Label = 'Contenedor frontend' },
    @{ Key = 'api'; Label = 'API /api/health' },
    @{ Key = 'database'; Label = 'Base de datos' }
)
foreach ($definition in $statusDefinitions) {
    New-StatusRow -Key $definition.Key -Caption $definition.Label
}

$logCombo = Get-El 'CmbLogService'
foreach ($option in @('Todos', 'backend', 'frontend', 'db')) {
    [void]$logCombo.Items.Add($option)
}
$logCombo.SelectedIndex = 0
$logCombo.Add_SelectionChanged({
    $selection = [string](Get-El 'CmbLogService').SelectedItem
    if ($selection -eq 'Todos' -or -not $selection) {
        $Script:LogService = 'todos'
    } else {
        $Script:LogService = $selection
    }
    Request-Snapshot
})

(Get-El 'BtnLogRefresh').Add_Click({ Request-Snapshot })

(Get-El 'BtnOpen').Add_Click({
    if ($Script:Snapshot) { Start-Process $Script:Snapshot.Url }
})

(Get-El 'BtnCopy').Add_Click({
    if (-not $Script:Snapshot) { return }
    try {
        $target = $Script:Snapshot.LanUrl
        if (-not $target) { $target = $Script:Snapshot.Url }
        [System.Windows.Clipboard]::SetText($target)
        Show-Banner $true "Copiado: $target"
    } catch {
        Show-Banner $false 'No se pudo copiar al portapapeles.'
    }
})

(Get-El 'BtnQr').Add_Click({
    if ($Script:Snapshot) { Start-Process ($Script:Snapshot.Url + '/qr') }
})

(Get-El 'BtnDocker').Add_Click({
    [void](Open-DockerDesktop)
    Show-Banner $true 'Abriendo Docker Desktop. Espera a que diga "Motor en ejecucion".'
    Request-Snapshot
})

(Get-El 'BtnStart').Add_Click({
    Invoke-PanelAction -Label 'Iniciando el sistema...' -ScriptText 'Start-ArbolitosSystem'
})

(Get-El 'BtnStop').Add_Click({
    $answer = [System.Windows.MessageBox]::Show(
        "Se van a detener los contenedores y se cortaran las cajas abiertas.`n`n¿Continuar?",
        'Detener sistema',
        [System.Windows.MessageBoxButton]::YesNo,
        [System.Windows.MessageBoxImage]::Warning)
    if ($answer -ne [System.Windows.MessageBoxResult]::Yes) { return }
    Invoke-PanelAction -Label 'Deteniendo el sistema...' -ScriptText 'Stop-ArbolitosSystem'
})

(Get-El 'BtnRestart').Add_Click({
    Invoke-PanelAction -Label 'Reiniciando el sistema...' -ScriptText 'Restart-ArbolitosSystem'
})

(Get-El 'BtnBackup').Add_Click({
    Invoke-PanelAction -Label 'Generando el respaldo...' -ScriptText 'New-ArbolitosBackup'
})

(Get-El 'BtnDiag').Add_Click({
    try {
        Show-Diagnostics
    } catch {
        Show-Banner $false (Get-FriendlyError $_.Exception.Message)
    }
})

$Script:PollRs = New-OpsRunspace
$Script:ActionRs = New-OpsRunspace

$Script:PollTimer = New-Object System.Windows.Threading.DispatcherTimer
$Script:PollTimer.Interval = [TimeSpan]::FromMilliseconds(600)
$Script:PollTimer.Add_Tick({
    if ($Script:Busy) { return }
    Complete-Snapshot
    Request-Snapshot
})
$Script:PollTimer.Start()

$Script:ActionTimer = New-Object System.Windows.Threading.DispatcherTimer
$Script:ActionTimer.Interval = [TimeSpan]::FromMilliseconds(250)
$Script:ActionTimer.Add_Tick({
    if (-not $Script:ActionHandle) { return }
    if (-not $Script:ActionHandle.IsCompleted) { return }

    $message = ''
    $failed = $false

    try {
        $output = $Script:ActionPs.EndInvoke($Script:ActionHandle)
        $message = (($output | Out-String).Trim())
    } catch {
        $failed = $true
        $message = $_.Exception.Message
    }

    if (-not $failed -and $Script:ActionPs.Streams.Error.Count -gt 0) {
        $failed = $true
        $message = [string]$Script:ActionPs.Streams.Error[0]
    }

    $Script:ActionPs.Dispose()
    $Script:ActionPs = $null
    $Script:ActionHandle = $null

    Set-Busy $false ''
    if ($failed) {
        Show-Banner $false (Get-FriendlyError $message)
    } elseif ($message) {
        Show-Banner $true $message
    }
    Request-Snapshot
})
$Script:ActionTimer.Start()

$window.Add_Closing({
    if ($Script:PollTimer) { $Script:PollTimer.Stop() }
    if ($Script:ActionTimer) { $Script:ActionTimer.Stop() }
    if ($Script:PollRs) {
        try { $Script:PollRs.Dispose() } catch { }
    }
    if ($Script:ActionRs) {
        try { $Script:ActionRs.Dispose() } catch { }
    }
})

Request-Snapshot
[void]$window.ShowDialog()
