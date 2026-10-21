#requires -version 5.1
<#
.SYNOPSIS
    Instalador visual de 2Arbolitos POS (WPF, sin dependencias).
.DESCRIPTION
    Ventana unica para instalar, reparar y desinstalar. Toda la logica vive en
    SetupOps.ps1, que se ejecuta como proceso hijo y reporta el progreso por un
    archivo JSON Lines. Asi la ventana nunca se congela.
.PARAMETER SelfTest
    Valida el XAML y los controles sin abrir la ventana.
.PARAMETER DryRun
    Pasa -DryRun a SetupOps: recorre el flujo sin tocar Docker.
.NOTES
    Guardar siempre en UTF-8 con BOM. PowerShell 5.1 lee sin BOM como ANSI
    y rompe los acentos.
#>

param(
    [switch]$SelfTest,
    [switch]$DryRun
)

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName WindowsBase

$Script:SetupPath = Join-Path $PSScriptRoot 'SetupOps.ps1'
if (-not (Test-Path -LiteralPath $Script:SetupPath)) {
    [void][System.Windows.MessageBox]::Show(
        "No se encontro SetupOps.ps1 junto a Installer.ps1.`n`n$Script:SetupPath",
        '2 Arbolitos - Instalador',
        [System.Windows.MessageBoxButton]::OK,
        [System.Windows.MessageBoxImage]::Error)
    exit 1
}

trap {
    $message = $_.Exception.Message
    $logFile = Join-Path $env:TEMP '2arbolitos-instalador-error.log'
    $details = "Fecha: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`r`n$message`r`n`r`n$($_.ScriptStackTrace)"
    try { Set-Content -LiteralPath $logFile -Value $details -Encoding UTF8 } catch { }
    try {
        [void][System.Windows.MessageBox]::Show(
            "No se pudo abrir el instalador.`n`n$message`n`nDetalle en:`n$logFile",
            '2 Arbolitos - Instalador',
            [System.Windows.MessageBoxButton]::OK,
            [System.Windows.MessageBoxImage]::Error)
    } catch { }
    exit 1
}

$Script:Window = $null
$Script:Status = $null
$Script:View = 'Home'
$Script:Busy = $false
$Script:DryRunMode = [bool]$DryRun
$Script:ProgressFile = ''
$Script:ProgressIndex = 0
$Script:ActionProcess = $null
$Script:ActionTimer = $null
$Script:StatusProcess = $null
$Script:StatusTimer = $null
$Script:StatusFile = ''
$Script:StepRows = @{}
$Script:DoneEvent = $null
$Script:FailEvent = $null
$Script:LastAction = ''

$xamlText = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="2 Arbolitos - Instalacion"
        Width="1000" Height="760" MinWidth="900" MinHeight="640"
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
                <Setter TargetName="Bd" Property="Opacity" Value="0.40"/>
              </Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>

    <Style x:Key="PrimaryButton" TargetType="Button" BasedOn="{StaticResource FlatButton}">
      <Setter Property="Background" Value="#1A4D2E"/>
      <Setter Property="Foreground" Value="#FFFFFF"/>
      <Setter Property="MinWidth" Value="170"/>
    </Style>

    <Style x:Key="SecondaryButton" TargetType="Button" BasedOn="{StaticResource FlatButton}">
      <Setter Property="BorderBrush" Value="#D8D2C6"/>
      <Setter Property="BorderThickness" Value="1"/>
      <Setter Property="MinWidth" Value="120"/>
    </Style>

    <Style x:Key="DangerButton" TargetType="Button" BasedOn="{StaticResource FlatButton}">
      <Setter Property="Background" Value="#B42318"/>
      <Setter Property="Foreground" Value="#FFFFFF"/>
      <Setter Property="MinWidth" Value="170"/>
    </Style>

    <Style x:Key="CardButton" TargetType="Button" BasedOn="{StaticResource FlatButton}">
      <Setter Property="Height" Value="Auto"/>
      <Setter Property="Padding" Value="20,16"/>
      <Setter Property="HorizontalContentAlignment" Value="Stretch"/>
      <Setter Property="Margin" Value="0,0,0,10"/>
      <Setter Property="Background" Value="#FFFFFF"/>
      <Setter Property="BorderBrush" Value="#E7E2D8"/>
      <Setter Property="BorderThickness" Value="1"/>
    </Style>

    <Style x:Key="SectionTitle" TargetType="TextBlock">
      <Setter Property="FontSize" Value="13"/>
      <Setter Property="FontWeight" Value="SemiBold"/>
      <Setter Property="Foreground" Value="#1F2937"/>
      <Setter Property="Margin" Value="0,0,0,10"/>
    </Style>

    <Style x:Key="Muted" TargetType="TextBlock">
      <Setter Property="FontSize" Value="12.5"/>
      <Setter Property="Foreground" Value="#6B7280"/>
      <Setter Property="TextWrapping" Value="Wrap"/>
    </Style>

    <Style x:Key="Card" TargetType="Border">
      <Setter Property="Background" Value="#FFFFFF"/>
      <Setter Property="BorderBrush" Value="#E7E2D8"/>
      <Setter Property="BorderThickness" Value="1"/>
      <Setter Property="CornerRadius" Value="12"/>
      <Setter Property="Padding" Value="18"/>
    </Style>

    <Style TargetType="CheckBox">
      <Setter Property="FontSize" Value="13"/>
      <Setter Property="Foreground" Value="#374151"/>
      <Setter Property="Margin" Value="0,0,0,10"/>
      <Setter Property="VerticalContentAlignment" Value="Center"/>
    </Style>

    <Style TargetType="TextBox">
      <Setter Property="FontSize" Value="13"/>
      <Setter Property="Padding" Value="10,8"/>
      <Setter Property="BorderBrush" Value="#D8D2C6"/>
      <Setter Property="BorderThickness" Value="1"/>
      <Setter Property="Background" Value="#FFFFFF"/>
    </Style>

  </Window.Resources>

  <Grid>
    <Grid.RowDefinitions>
      <RowDefinition Height="Auto"/>
      <RowDefinition Height="*"/>
      <RowDefinition Height="Auto"/>
    </Grid.RowDefinitions>

    <!-- Encabezado -->
    <Border Grid.Row="0" Background="#FFFFFF" BorderBrush="#E7E2D8" BorderThickness="0,0,0,1" Padding="28,18">
      <Grid>
        <StackPanel>
          <TextBlock Text="2 Arbolitos POS" FontSize="21" FontWeight="SemiBold" Foreground="#1A4D2E"/>
          <TextBlock x:Name="HeaderSubtitle" Text="Comprobando el equipo..." FontSize="13" Foreground="#6B7280" Margin="0,4,0,0"/>
        </StackPanel>
        <Border HorizontalAlignment="Right" VerticalAlignment="Center" Background="#EEF3EE" CornerRadius="14" Padding="14,6">
          <TextBlock x:Name="ModeText" Text="Detectando..." FontSize="12.5" Foreground="#1A4D2E" FontWeight="SemiBold"/>
        </Border>
      </Grid>
    </Border>

    <!-- Cuerpo -->
    <Grid Grid.Row="1" Margin="28,22,28,12">
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="*"/>
        <ColumnDefinition Width="292"/>
      </Grid.ColumnDefinitions>

      <Grid Grid.Column="0" Margin="0,0,22,0">

        <!-- Inicio -->
        <StackPanel x:Name="ViewHome">
          <TextBlock Text="Que quieres hacer?" FontSize="17" FontWeight="SemiBold" Foreground="#1F2937" Margin="0,0,0,4"/>
          <TextBlock Style="{StaticResource Muted}" Text="Todo se puede repetir sin miedo: los datos de la base solo se borran si lo pides explicitamente." Margin="0,0,0,16"/>

          <Button x:Name="BtnInstall" Style="{StaticResource CardButton}">
            <StackPanel>
              <TextBlock Text="Instalar o reinstalar" FontSize="14.5" FontWeight="SemiBold" Foreground="#1A4D2E"/>
              <TextBlock Text="Prepara la configuracion, construye las imagenes y deja el sistema funcionando." FontSize="12.5" Foreground="#6B7280" TextWrapping="Wrap" Margin="0,4,0,0"/>
            </StackPanel>
          </Button>

          <Button x:Name="BtnRepair" Style="{StaticResource CardButton}">
            <StackPanel>
              <TextBlock Text="Revisar y reparar" FontSize="14.5" FontWeight="SemiBold" Foreground="#1A4D2E"/>
              <TextBlock Text="Analiza el estado, detecta problemas conocidos y los corrige." FontSize="12.5" Foreground="#6B7280" TextWrapping="Wrap" Margin="0,4,0,0"/>
            </StackPanel>
          </Button>

          <Button x:Name="BtnUninstall" Style="{StaticResource CardButton}">
            <StackPanel>
              <TextBlock Text="Desinstalar" FontSize="14.5" FontWeight="SemiBold" Foreground="#B42318"/>
              <TextBlock Text="Detiene y elimina el sistema. La base de datos se conserva salvo que marques la casilla." FontSize="12.5" Foreground="#6B7280" TextWrapping="Wrap" Margin="0,4,0,0"/>
            </StackPanel>
          </Button>
        </StackPanel>

        <!-- Instalar -->
        <Grid x:Name="ViewInstall" Visibility="Collapsed">
          <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
          </Grid.RowDefinitions>

          <Border x:Name="PortCard" Grid.Row="0" Style="{StaticResource Card}" Margin="0,0,0,12">
            <StackPanel>
              <TextBlock Text="Puerto del sistema" Style="{StaticResource SectionTitle}"/>
              <StackPanel Orientation="Horizontal">
                <TextBox x:Name="PortBox" Width="90" Text="80"/>
                <TextBlock Style="{StaticResource Muted}" Text="  80 es lo normal. Si esta ocupado, usa 8080." VerticalAlignment="Center" Margin="10,0,0,0"/>
              </StackPanel>
            </StackPanel>
          </Border>

          <StackPanel Grid.Row="1" x:Name="StepList" Margin="0,4,0,10"/>

          <Border Grid.Row="2" Style="{StaticResource Card}" Padding="0">
            <TextBox x:Name="LogBox" IsReadOnly="True" BorderThickness="0" Background="Transparent"
                     FontFamily="Consolas" FontSize="11" Foreground="#4B5563"
                     VerticalScrollBarVisibility="Auto" HorizontalScrollBarVisibility="Auto"
                     TextWrapping="NoWrap" Padding="12"/>
          </Border>
        </Grid>

        <!-- Reparar -->
        <Grid x:Name="ViewRepair" Visibility="Collapsed">
          <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
          </Grid.RowDefinitions>
          <StackPanel Grid.Row="0" Margin="0,0,0,12">
            <TextBlock Text="Revision del sistema" FontSize="17" FontWeight="SemiBold" Foreground="#1F2937" Margin="0,0,0,4"/>
            <TextBlock x:Name="RepairSubtitle" Style="{StaticResource Muted}" Text="Analizando..."/>
          </StackPanel>
          <ScrollViewer Grid.Row="1" VerticalScrollBarVisibility="Auto">
            <StackPanel x:Name="FindingsList"/>
          </ScrollViewer>
        </Grid>

        <!-- Desinstalar -->
        <ScrollViewer x:Name="ViewUninstall" Visibility="Collapsed" VerticalScrollBarVisibility="Auto">
          <StackPanel>
            <TextBlock Text="Que quieres eliminar?" FontSize="17" FontWeight="SemiBold" Foreground="#1F2937" Margin="0,0,0,4"/>
            <TextBlock Style="{StaticResource Muted}" Text="Por defecto se conservan los datos. Nada se borra sin que lo marques." Margin="0,0,0,14"/>

            <Border Style="{StaticResource Card}" Margin="0,0,0,12">
              <StackPanel>
                <CheckBox x:Name="ChkContainers" Content="Contenedores y red (siempre)" IsChecked="True" IsEnabled="False"/>
                <CheckBox x:Name="ChkImages" Content="Imagenes del proyecto (se reconstruyen al instalar)" IsChecked="True"/>
                <CheckBox x:Name="ChkEnv" Content="Configuracion (.env) con sus secretos"/>
                <CheckBox x:Name="ChkBackups" Content="Respaldos guardados (backups/)"/>
                <CheckBox x:Name="ChkFirewall" Content="Regla de firewall" IsChecked="True"/>
                <CheckBox x:Name="ChkBackupBefore" Content="Crear un respaldo antes de desinstalar" IsChecked="True"/>
              </StackPanel>
            </Border>

            <Border Style="{StaticResource Card}" BorderBrush="#F0C9C4" Background="#FFF8F7">
              <StackPanel>
                <CheckBox x:Name="ChkVolume" Content="Eliminar tambien la base de datos (se pierden los datos)" Foreground="#B42318" FontWeight="SemiBold"/>
                <TextBlock x:Name="ConfirmLabel" Style="{StaticResource Muted}" Text="Escribe BORRAR para confirmar:" Visibility="Collapsed" Margin="0,2,0,6"/>
                <TextBox x:Name="ConfirmBox" Visibility="Collapsed" Width="200" HorizontalAlignment="Left"/>
              </StackPanel>
            </Border>
          </StackPanel>
        </ScrollViewer>

        <!-- Resultado -->
        <Grid x:Name="ViewDone" Visibility="Collapsed">
          <StackPanel VerticalAlignment="Center">
            <Border Style="{StaticResource Card}" Padding="26">
              <StackPanel>
                <TextBlock x:Name="DoneTitle" Text="Listo" FontSize="20" FontWeight="SemiBold" Foreground="#1A4D2E" Margin="0,0,0,8"/>
                <TextBlock x:Name="DoneMessage" Style="{StaticResource Muted}" Text="" Margin="0,0,0,16"/>

                <TextBlock Text="Acceso" Style="{StaticResource SectionTitle}"/>
                <TextBlock x:Name="DoneUrl" FontSize="16" FontWeight="SemiBold" Foreground="#1F2937" Margin="0,0,0,2"/>
                <TextBlock x:Name="DoneLan" Style="{StaticResource Muted}" Text="" Margin="0,0,0,14"/>

                <TextBlock x:Name="DoneNote" Style="{StaticResource Muted}" Text="" Margin="0,0,0,14"/>

                <StackPanel Orientation="Horizontal">
                  <Button x:Name="BtnOpen" Style="{StaticResource PrimaryButton}" Content="Abrir el sistema" Margin="0,0,10,0"/>
                  <Button x:Name="BtnPanel" Style="{StaticResource SecondaryButton}" Content="Abrir panel"/>
                </StackPanel>
              </StackPanel>
            </Border>
          </StackPanel>
        </Grid>

        <!-- Error -->
        <ScrollViewer x:Name="ViewError" Visibility="Collapsed" VerticalScrollBarVisibility="Auto">
          <Border Style="{StaticResource Card}" BorderBrush="#F0C9C4" Background="#FFF8F7" Padding="24">
            <StackPanel>
              <TextBlock x:Name="ErrorTitle" Text="No se pudo completar" FontSize="18" FontWeight="SemiBold" Foreground="#B42318" Margin="0,0,0,8"/>
              <TextBlock x:Name="ErrorDetail" Style="{StaticResource Muted}" Text="" Margin="0,0,0,14"/>
              <TextBlock Text="Que puedes hacer" Style="{StaticResource SectionTitle}" Margin="0,0,0,6"/>
              <StackPanel x:Name="ErrorHints"/>
              <TextBlock x:Name="ErrorCode" Style="{StaticResource Muted}" FontSize="11.5" Margin="0,12,0,0"/>
            </StackPanel>
          </Border>
        </ScrollViewer>

      </Grid>

      <!-- Columna derecha -->
      <Border Grid.Column="1" Style="{StaticResource Card}" VerticalAlignment="Top">
        <StackPanel>
          <TextBlock Text="Estado del equipo" Style="{StaticResource SectionTitle}"/>
          <StackPanel x:Name="ChecksPanel"/>
          <Border Height="1" Background="#EDE9E0" Margin="0,12,0,12"/>
          <TextBlock x:Name="ExtraInfo" Style="{StaticResource Muted}" Text=""/>
        </StackPanel>
      </Border>
    </Grid>

    <!-- Pie -->
    <Border Grid.Row="2" Background="#FFFFFF" BorderBrush="#E7E2D8" BorderThickness="0,1,0,0" Padding="28,12">
      <Grid>
        <Button x:Name="BtnBack" Style="{StaticResource SecondaryButton}" Content="Volver" HorizontalAlignment="Left" Visibility="Collapsed"/>
        <StackPanel Orientation="Horizontal" HorizontalAlignment="Right">
          <Button x:Name="BtnSecondary" Style="{StaticResource SecondaryButton}" Content="Actualizar" Visibility="Collapsed" Margin="0,0,10,0"/>
          <Button x:Name="BtnPrimary" Style="{StaticResource PrimaryButton}" Content="Continuar"/>
        </StackPanel>
      </Grid>
    </Border>
  </Grid>
</Window>
'@

# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

function Get-El {
    param([string]$Name)
    return $Script:Window.FindName($Name)
}

function ConvertTo-Brush {
    param([string]$Hex)
    return (New-Object System.Windows.Media.BrushConverter).ConvertFromString($Hex)
}

function ConvertTo-ArgString {
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

function Set-Busy {
    param([bool]$Value)
    $Script:Busy = $Value
    foreach ($name in @('BtnInstall', 'BtnRepair', 'BtnUninstall', 'PortBox')) {
        $element = Get-El $name
        if ($element) { $element.IsEnabled = -not $Value }
    }
    $back = Get-El 'BtnBack'
    if ($back) { $back.IsEnabled = -not $Value }
    Update-Footer
}

function Update-Footer {
    $back = Get-El 'BtnBack'
    $secondary = Get-El 'BtnSecondary'
    $primary = Get-El 'BtnPrimary'

    $back.Visibility = 'Collapsed'
    $secondary.Visibility = 'Collapsed'
    $primary.Visibility = 'Visible'
    $primary.IsEnabled = -not $Script:Busy

    switch ($Script:View) {
        'Home' {
            $primary.Visibility = 'Collapsed'
        }
        'Install' {
            $back.Visibility = 'Visible'
            $label = switch ($Script:RunMode) {
                'repair' { 'Reparando...' }
                'uninstall' { 'Desinstalando...' }
                default { 'Instalando...' }
            }
            $primary.Content = if ($Script:Busy) { $label } else { 'Instalar' }
            $primary.Style = $Script:Window.Resources['PrimaryButton']
            if ($Script:Busy) { $primary.Visibility = 'Collapsed' }
        }
        'Repair' {
            $back.Visibility = 'Visible'
            $primary.Content = 'Actualizar diagnostico'
            $primary.Style = $Script:Window.Resources['SecondaryButton']
        }
        'Uninstall' {
            $back.Visibility = 'Visible'
            $primary.Content = if ($Script:Busy) { 'Desinstalando...' } else { 'Desinstalar' }
            $primary.Style = $Script:Window.Resources['DangerButton']
        }
        'Done' {
            $primary.Content = 'Cerrar'
            $primary.Style = $Script:Window.Resources['SecondaryButton']
        }
        'Error' {
            $primary.Content = 'Volver al inicio'
            $primary.Style = $Script:Window.Resources['SecondaryButton']
        }
    }
}

function Set-View {
    param([string]$Name)
    foreach ($view in @('Home', 'Install', 'Repair', 'Uninstall', 'Done', 'Error')) {
        $element = Get-El ('View' + $view)
        if (-not $element) { continue }
        $element.Visibility = if ($view -eq $Name) { 'Visible' } else { 'Collapsed' }
    }
    $Script:View = $Name
    Update-Footer
}

# ---------------------------------------------------------------------------
# Columna de estado
# ---------------------------------------------------------------------------

function New-CheckRow {
    param([string]$Caption, [string]$State, [string]$Detail = '')

    $palette = @{ ok = '#067647'; warn = '#B54708'; bad = '#B42318'; info = '#9CA3AF' }
    $color = $palette[$State]
    if (-not $color) { $color = '#9CA3AF' }

    $grid = New-Object System.Windows.Controls.Grid
    $grid.Margin = '0,0,0,9'

    $colDot = New-Object System.Windows.Controls.ColumnDefinition
    $colDot.Width = [System.Windows.GridLength]::new(14)
    $colCaption = New-Object System.Windows.Controls.ColumnDefinition
    $colCaption.Width = [System.Windows.GridLength]::new(1, [System.Windows.GridUnitType]::Star)
    $colDetail = New-Object System.Windows.Controls.ColumnDefinition
    $colDetail.Width = [System.Windows.GridLength]::Auto
    [void]$grid.ColumnDefinitions.Add($colDot)
    [void]$grid.ColumnDefinitions.Add($colCaption)
    [void]$grid.ColumnDefinitions.Add($colDetail)

    $dot = New-Object System.Windows.Shapes.Ellipse
    $dot.Width = 8
    $dot.Height = 8
    $dot.Fill = ConvertTo-Brush $color
    $dot.VerticalAlignment = 'Center'
    [System.Windows.Controls.Grid]::SetColumn($dot, 0)
    [void]$grid.Children.Add($dot)

    $captionBlock = New-Object System.Windows.Controls.TextBlock
    $captionBlock.Text = $Caption
    $captionBlock.FontSize = 12.5
    $captionBlock.Foreground = ConvertTo-Brush '#374151'
    $captionBlock.VerticalAlignment = 'Center'
    [System.Windows.Controls.Grid]::SetColumn($captionBlock, 1)
    [void]$grid.Children.Add($captionBlock)

    $detailBlock = New-Object System.Windows.Controls.TextBlock
    $detailBlock.Text = $Detail
    $detailBlock.FontSize = 11.5
    $detailBlock.Foreground = ConvertTo-Brush $color
    $detailBlock.VerticalAlignment = 'Center'
    $detailBlock.TextAlignment = 'Right'
    $detailBlock.Margin = '8,0,0,0'
    $detailBlock.MaxWidth = 120
    $detailBlock.TextTrimming = [System.Windows.TextTrimming]::CharacterEllipsis
    [System.Windows.Controls.Grid]::SetColumn($detailBlock, 2)
    [void]$grid.Children.Add($detailBlock)

    return $grid
}

function Render-Status {
    $status = $Script:Status
    if (-not $status) { return }

    $modeText = switch ($status.Mode) {
        'docker' { 'Docker' }
        'portable' { 'Portable' }
        default { 'Sin instalar' }
    }
    (Get-El 'ModeText').Text = $modeText

    $subtitle = if ($status.Healthy) {
        'Sistema funcionando'
    } elseif ($status.Installed) {
        'Instalacion incompleta'
    } else {
        'Listo para instalar'
    }
    (Get-El 'HeaderSubtitle').Text = $subtitle

    $panel = Get-El 'ChecksPanel'
    $panel.Children.Clear()

    $dockerState = if ($status.DockerCli) { 'ok' } else { 'bad' }
    $engineState = if ($status.Engine) { 'ok' } else { 'bad' }
    $adminState = if ($status.Admin) { 'ok' } else { 'warn' }
    $portState = 'ok'
    $portDetail = [string]$status.Port
    if ($status.Findings) {
        foreach ($finding in $status.Findings) {
            if ($finding.Id -eq 'port') { $portState = 'warn'; $portDetail = 'ocupado' }
        }
    }
    $diskState = 'ok'
    $diskDetail = "$($status.DiskFreeGb) GB"
    if ([double]$status.DiskFreeGb -lt 5) { $diskState = 'warn' }
    $firewallState = if ($status.FirewallRule) { 'ok' } else { 'warn' }
    $backupDetail = if ($status.LastBackup) { 'si' } else { 'ninguno' }
    $backupState = if ($status.LastBackup) { 'ok' } else { 'info' }

    $rows = @(
        @{ Caption = 'Docker instalado'; State = $dockerState; Detail = if ($status.DockerCli) { 'si' } else { 'no' } },
        @{ Caption = 'Motor de Docker'; State = $engineState; Detail = if ($status.Engine) { 'activo' } else { 'detenido' } },
        @{ Caption = 'Administrador'; State = $adminState; Detail = if ($status.Admin) { 'si' } else { 'no' } },
        @{ Caption = 'Puerto'; State = $portState; Detail = $portDetail },
        @{ Caption = 'Disco libre'; State = $diskState; Detail = $diskDetail },
        @{ Caption = 'Firewall'; State = $firewallState; Detail = if ($status.FirewallRule) { 'ok' } else { 'falta' } },
        @{ Caption = 'Ultimo respaldo'; State = $backupState; Detail = $backupDetail }
    )
    foreach ($row in $rows) {
        $panel.Children.Add((New-CheckRow -Caption $row.Caption -State $row.State -Detail $row.Detail))
    }

    $extra = @(
        "Version $($status.Version)",
        [string]$status.Url,
        [string]$status.LanUrl
    )
    (Get-El 'ExtraInfo').Text = ($extra -join "`n")

    (Get-El 'PortBox').Text = [string]$status.Port
}

# ---------------------------------------------------------------------------
# Hallazgos
# ---------------------------------------------------------------------------

function New-FindingCard {
    param($Finding)

    $palette = @{ bad = '#B42318'; warn = '#B54708'; info = '#6B7280' }
    $color = $palette[$Finding.Severity]
    if (-not $color) { $color = '#6B7280' }

    $card = New-Object System.Windows.Controls.Border
    $card.Background = ConvertTo-Brush '#FFFFFF'
    $card.BorderBrush = ConvertTo-Brush '#E7E2D8'
    $card.BorderThickness = '1'
    $card.CornerRadius = '12'
    $card.Padding = '16,13'
    $card.Margin = '0,0,0,8'

    $grid = New-Object System.Windows.Controls.Grid
    $colText = New-Object System.Windows.Controls.ColumnDefinition
    $colText.Width = [System.Windows.GridLength]::new(1, [System.Windows.GridUnitType]::Star)
    $colAction = New-Object System.Windows.Controls.ColumnDefinition
    $colAction.Width = [System.Windows.GridLength]::Auto
    [void]$grid.ColumnDefinitions.Add($colText)
    [void]$grid.ColumnDefinitions.Add($colAction)

    $stack = New-Object System.Windows.Controls.StackPanel
    $title = New-Object System.Windows.Controls.TextBlock
    $title.Text = [string]$Finding.Title
    $title.FontSize = 13.5
    $title.FontWeight = 'SemiBold'
    $title.Foreground = ConvertTo-Brush $color
    $title.TextWrapping = 'Wrap'
    [void]$stack.Children.Add($title)

    if ($Finding.Detail) {
        $detail = New-Object System.Windows.Controls.TextBlock
        $detail.Text = [string]$Finding.Detail
        $detail.FontSize = 12.5
        $detail.Foreground = ConvertTo-Brush '#6B7280'
        $detail.TextWrapping = 'Wrap'
        $detail.Margin = '0,4,0,0'
        [void]$stack.Children.Add($detail)
    }
    [System.Windows.Controls.Grid]::SetColumn($stack, 0)
    [void]$grid.Children.Add($stack)

    if ($Finding.Fix) {
        $button = New-Object System.Windows.Controls.Button
        $button.Content = [string]$Finding.FixLabel
        $button.Style = $Script:Window.Resources['SecondaryButton']
        $button.Height = 34
        $button.MinWidth = 120
        $button.Margin = '14,0,0,0'
        $button.VerticalAlignment = 'Center'
        $fixId = [string]$Finding.Fix
        $button.Add_Click({
            param($sender, $eventArgs)
            Start-Repair -Id $fixId
        }.GetNewClosure())
        [System.Windows.Controls.Grid]::SetColumn($button, 1)
        [void]$grid.Children.Add($button)
    }

    $card.Child = $grid
    return $card
}

function Render-Findings {
    if (-not $Script:Status) { return }

    $panel = Get-El 'FindingsList'
    $panel.Children.Clear()

    $findings = @($Script:Status.Findings)
    $problems = @($findings | Where-Object { $_.Severity -ne 'info' })

    if ($problems.Count -eq 0) {
        (Get-El 'RepairSubtitle').Text = 'No se encontraron problemas en este equipo.'
    } else {
        (Get-El 'RepairSubtitle').Text = "$($problems.Count) punto(s) a revisar. Puedes corregirlos uno a uno."
    }

    if ($findings.Count -eq 0) {
        $empty = New-Object System.Windows.Controls.TextBlock
        $empty.Text = 'Sin nada que reportar.'
        $empty.FontSize = 12.5
        $empty.Foreground = ConvertTo-Brush '#6B7280'
        [void]$panel.Children.Add($empty)
        return
    }

    foreach ($finding in $findings) {
        $panel.Children.Add((New-FindingCard -Finding $finding))
    }
}

# ---------------------------------------------------------------------------
# Progreso
# ---------------------------------------------------------------------------

function Reset-Steps {
    param($Steps)

    $panel = Get-El 'StepList'
    $panel.Children.Clear()
    $Script:StepRows = @{}

    foreach ($step in $Steps) {
        $grid = New-Object System.Windows.Controls.Grid
        $grid.Margin = '0,0,0,7'

        $colDot = New-Object System.Windows.Controls.ColumnDefinition
        $colDot.Width = [System.Windows.GridLength]::new(16)
        $colLabel = New-Object System.Windows.Controls.ColumnDefinition
        $colLabel.Width = [System.Windows.GridLength]::new(1, [System.Windows.GridUnitType]::Star)
        $colState = New-Object System.Windows.Controls.ColumnDefinition
        $colState.Width = [System.Windows.GridLength]::new(190)
        [void]$grid.ColumnDefinitions.Add($colDot)
        [void]$grid.ColumnDefinitions.Add($colLabel)
        [void]$grid.ColumnDefinitions.Add($colState)

        $dot = New-Object System.Windows.Shapes.Ellipse
        $dot.Width = 8
        $dot.Height = 8
        $dot.Fill = ConvertTo-Brush '#D1D5DB'
        $dot.VerticalAlignment = 'Center'
        [System.Windows.Controls.Grid]::SetColumn($dot, 0)
        [void]$grid.Children.Add($dot)

        $label = New-Object System.Windows.Controls.TextBlock
        $label.Text = [string]$step.label
        $label.FontSize = 13
        $label.Foreground = ConvertTo-Brush '#374151'
        $label.VerticalAlignment = 'Center'
        [System.Windows.Controls.Grid]::SetColumn($label, 1)
        [void]$grid.Children.Add($label)

        $stateText = New-Object System.Windows.Controls.TextBlock
        $stateText.Text = 'Pendiente'
        $stateText.FontSize = 12
        $stateText.Foreground = ConvertTo-Brush '#9CA3AF'
        $stateText.VerticalAlignment = 'Center'
        $stateText.TextAlignment = 'Right'
        $stateText.TextTrimming = [System.Windows.TextTrimming]::CharacterEllipsis
        [System.Windows.Controls.Grid]::SetColumn($stateText, 2)
        [void]$grid.Children.Add($stateText)

        $Script:StepRows[[string]$step.id] = @{ Dot = $dot; Label = $label; State = $stateText }
        [void]$panel.Children.Add($grid)
    }
}

function Set-Step {
    param([string]$Id, [string]$State, [string]$Text)

    $row = $Script:StepRows[$Id]
    if (-not $row) { return }

    $palette = @{ run = '#B54708'; ok = '#067647'; bad = '#B42318'; skip = '#9CA3AF' }
    $color = $palette[$State]
    if (-not $color) { $color = '#D1D5DB' }
    $row.Dot.Fill = ConvertTo-Brush $color

    if ($State -eq 'run') {
        $row.Label.FontWeight = 'SemiBold'
        $row.State.Foreground = ConvertTo-Brush '#B54708'
        $row.State.Text = if ($Text) { $Text } else { 'En curso' }
    } elseif ($State -eq 'ok') {
        $row.Label.FontWeight = 'Normal'
        $row.State.Foreground = ConvertTo-Brush '#067647'
        $row.State.Text = if ($Text) { $Text } else { 'Hecho' }
    } elseif ($State -eq 'bad') {
        $row.Label.FontWeight = 'SemiBold'
        $row.State.Foreground = ConvertTo-Brush '#B42318'
        $row.State.Text = if ($Text) { $Text } else { 'Fallo' }
    } elseif ($State -eq 'skip') {
        $row.State.Foreground = ConvertTo-Brush '#9CA3AF'
        $row.State.Text = if ($Text) { $Text } else { 'Omitido' }
    }
}

function Append-Log {
    param([string]$Text)
    if (-not $Text) { return }

    $box = Get-El 'LogBox'
    if ($box.Text.Length -gt 120000) {
        $box.Text = $box.Text.Substring($box.Text.Length - 60000)
    }
    $box.AppendText($Text + "`r`n")
    $box.ScrollToEnd()
}

function Handle-Event {
    param($Event)

    switch ([string]$Event.t) {
        'plan' { Reset-Steps -Steps @($Event.steps) }
        'step' { Set-Step -Id ([string]$Event.id) -State ([string]$Event.state) -Text ([string]$Event.text) }
        'log' { Append-Log ([string]$Event.text) }
        'done' { $Script:DoneEvent = $Event }
        'fail' { $Script:FailEvent = $Event }
    }
}

function Read-Progress {
    if (-not $Script:ProgressFile) { return }
    if (-not (Test-Path -LiteralPath $Script:ProgressFile)) { return }

    try {
        $lines = [System.IO.File]::ReadAllLines($Script:ProgressFile, [System.Text.Encoding]::UTF8)
    } catch {
        return
    }

    while ($Script:ProgressIndex -lt $lines.Count) {
        $line = $lines[$Script:ProgressIndex]
        $Script:ProgressIndex = $Script:ProgressIndex + 1
        if (-not $line -or -not $line.Trim()) { continue }
        try {
            $event = $line | ConvertFrom-Json
        } catch {
            continue
        }
        Handle-Event -Event $event
    }
}

# ---------------------------------------------------------------------------
# Proceso hijo: estado
# ---------------------------------------------------------------------------

function Start-StatusRefresh {
    if ($Script:StatusProcess) {
        # Ya hay una consulta en curso: se repite al terminar.
        $Script:StatusPending = $true
        return
    }

    $Script:StatusFile = Join-Path $env:TEMP ('2arbolitos-status-' + [guid]::NewGuid().ToString('N') + '.json')
    $tokens = @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $Script:SetupPath,
        '-Action', 'Status', '-ProgressFile', $Script:StatusFile
    )

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'powershell.exe'
    $psi.Arguments = ConvertTo-ArgString -Tokens $tokens
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.WorkingDirectory = $Script:Root

    try {
        $Script:StatusProcess = [System.Diagnostics.Process]::Start($psi)
        $Script:StatusTimer.Start()
    } catch {
        (Get-El 'HeaderSubtitle').Text = 'No se pudo consultar el estado del equipo'
    }
}

function Complete-Status {
    $process = $Script:StatusProcess
    if (-not $process) { $Script:StatusTimer.Stop(); return }
    if (-not $process.HasExited) { return }

    $Script:StatusTimer.Stop()

    $text = ''
    try {
        if (Test-Path -LiteralPath $Script:StatusFile) {
            $text = [System.IO.File]::ReadAllText($Script:StatusFile, [System.Text.Encoding]::UTF8)
        }
    } catch { }

    try { $process.Dispose() } catch { }
    $Script:StatusProcess = $null

    if ($text.Trim()) {
        try { $Script:Status = $text | ConvertFrom-Json } catch { $Script:Status = $null }
    }

    if ($Script:Status) {
        Render-Status
        if ($Script:View -eq 'Repair') { Render-Findings }
    } else {
        (Get-El 'HeaderSubtitle').Text = 'No se pudo leer el estado del equipo'
        (Get-El 'ModeText').Text = 'Sin datos'
    }

    if ($Script:StatusPending) {
        $Script:StatusPending = $false
        Start-StatusRefresh
    }
}

# ---------------------------------------------------------------------------
# Proceso hijo: acciones
# ---------------------------------------------------------------------------

function Start-Action {
    param([string]$Action, [hashtable]$Extra = @{})

    if ($Script:Busy) { return }

    $Script:LastAction = $Action
    switch ($Action) {
        'Install' { $Script:RunMode = 'install' }
        'Repair' { $Script:RunMode = 'repair' }
        'Uninstall' { $Script:RunMode = 'uninstall' }
        default { $Script:RunMode = '' }
    }

    $Script:DoneEvent = $null
    $Script:FailEvent = $null
    $Script:ProgressIndex = 0
    $Script:ProgressFile = Join-Path $env:TEMP ('2arbolitos-setup-' + [guid]::NewGuid().ToString('N') + '.jsonl')

    (Get-El 'LogBox').Text = ''
    (Get-El 'StepList').Children.Clear()
    $Script:StepRows = @{}
    (Get-El 'PortCard').Visibility = if ($Action -eq 'Install') { 'Visible' } else { 'Collapsed' }

    Set-View 'Install'
    Set-Busy $true

    $tokens = @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $Script:SetupPath,
        '-Action', $Action, '-ProgressFile', $Script:ProgressFile
    )
    if ($Script:DryRunMode) { $tokens += '-DryRun' }

    foreach ($key in $Extra.Keys) {
        $value = $Extra[$key]
        if ($value -is [bool]) {
            if ($value) { $tokens += ('-' + $key) }
        } else {
            $tokens += ('-' + $key)
            $tokens += [string]$value
        }
    }

    $labels = @{ Install = 'Instalacion'; Repair = 'Reparacion'; Uninstall = 'Desinstalacion' }
    Append-Log ('Iniciando: ' + $labels[$Action])

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'powershell.exe'
    $psi.Arguments = ConvertTo-ArgString -Tokens $tokens
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $psi.WorkingDirectory = $Script:Root

    try {
        $Script:ActionProcess = [System.Diagnostics.Process]::Start($psi)
        $Script:ActionTimer.Start()
    } catch {
        Set-Busy $false
        Show-Failure -Event ([pscustomobject]@{
            code   = 'START'
            title  = 'No se pudo iniciar el proceso'
            detail = $_.Exception.Message
            hints  = @('Cierra el instalador y vuelve a abrirlo.')
        })
    }
}

function Complete-Action {
    $process = $Script:ActionProcess
    if (-not $process) { $Script:ActionTimer.Stop(); return }
    if (-not $process.HasExited) { return }

    $Script:ActionTimer.Stop()
    Read-Progress

    $code = 0
    try { $code = $process.ExitCode } catch { }
    try { $process.Dispose() } catch { }
    $Script:ActionProcess = $null
    Set-Busy $false

    if ($Script:DoneEvent) {
        Show-Success -Event $Script:DoneEvent
    } elseif ($Script:FailEvent) {
        Show-Failure -Event $Script:FailEvent
    } elseif ($code -eq 0) {
        $url = ''
        if ($Script:Status) { $url = [string]$Script:Status.Url }
        Show-Success -Event ([pscustomobject]@{
            message = 'Operacion completada'
            url     = $url
            lanUrl  = ''
            note    = ''
        })
    } else {
        Show-Failure -Event ([pscustomobject]@{
            code   = 'CRASH'
            title  = 'El proceso termino de forma inesperada'
            detail = "Codigo de salida $code. No se recibio el resultado final."
            hints  = @(
                'Vuelve a intentarlo; si se repite, usa instalar.bat /consola para ver el detalle.',
                'Los registros completos estan en la carpeta logs.'
            )
        })
    }

    Start-StatusRefresh
}

# ---------------------------------------------------------------------------
# Resultados
# ---------------------------------------------------------------------------

function Show-Success {
    param($Event)

    Set-View 'Done'

    $title = if ($Event.message) { [string]$Event.message } else { 'Listo' }
    (Get-El 'DoneTitle').Text = $title
    (Get-El 'DoneMessage').Text = if ($Event.note) { [string]$Event.note } else { 'El sistema quedo configurado y respondiendo.' }

    $url = [string]$Event.url
    $lan = [string]$Event.lanUrl
    if (-not $url -and $Script:Status) { $url = [string]$Script:Status.Url }
    if (-not $lan -and $Script:Status) { $lan = [string]$Script:Status.LanUrl }

    (Get-El 'DoneUrl').Text = $url
    (Get-El 'DoneLan').Text = if ($lan) { 'En la red local: ' + $lan } else { '' }
    (Get-El 'DoneNote').Text = 'Usuarios iniciales: admin/admin123, gerente/waiter123, cajero/waiter123, mesero/waiter123, cocina/cook123. Cambia las contrasenas desde el sistema.'

    $showActions = ($Script:LastAction -ne 'Uninstall')
    $visibility = if ($showActions) { 'Visible' } else { 'Collapsed' }
    (Get-El 'BtnOpen').Visibility = $visibility
    (Get-El 'BtnPanel').Visibility = $visibility
    (Get-El 'DoneUrl').Visibility = $visibility
    (Get-El 'DoneLan').Visibility = $visibility
    (Get-El 'DoneNote').Visibility = $visibility
}

function Show-Failure {
    param($Event)

    Set-View 'Error'

    $title = if ($Event.title) { [string]$Event.title } else { 'No se pudo completar' }
    (Get-El 'ErrorTitle').Text = $title
    (Get-El 'ErrorDetail').Text = [string]$Event.detail

    $panel = Get-El 'ErrorHints'
    $panel.Children.Clear()
    foreach ($hint in @($Event.hints)) {
        if (-not $hint) { continue }
        $block = New-Object System.Windows.Controls.TextBlock
        $block.Text = [string]$hint
        $block.FontSize = 12.5
        $block.Foreground = ConvertTo-Brush '#4B5563'
        $block.TextWrapping = 'Wrap'
        $block.Margin = '0,0,0,7'
        [void]$panel.Children.Add($block)
    }

    $code = [string]$Event.code
    (Get-El 'ErrorCode').Text = if ($code) { "Codigo: $code" } else { '' }
}

function Start-Repair {
    param([string]$Id)

    if ($Script:Busy) { return }

    if ($Id -eq 'install' -or $Id -eq 'port') {
        OnInstallClick
        return
    }

    Start-Action -Action 'Repair' -Extra @{ RepairId = $Id }
}

# ---------------------------------------------------------------------------
# Botones
# ---------------------------------------------------------------------------

function OnInstallClick {
    $Script:RunMode = 'install'
    (Get-El 'PortCard').Visibility = 'Visible'
    if ($Script:Status -and $Script:Status.Port) {
        (Get-El 'PortBox').Text = [string]$Script:Status.Port
    }
    Set-View 'Install'
}

function OnRepairClick {
    Set-View 'Repair'
    (Get-El 'RepairSubtitle').Text = 'Analizando el equipo...'
    (Get-El 'FindingsList').Children.Clear()
    Start-StatusRefresh
}

function OnUninstallClick {
    (Get-El 'ChkVolume').IsChecked = $false
    (Get-El 'ConfirmBox').Text = ''
    (Get-El 'ConfirmBox').Visibility = 'Collapsed'
    (Get-El 'ConfirmLabel').Visibility = 'Collapsed'
    Set-View 'Uninstall'
}

function OnVolumeChecked {
    $checked = [bool](Get-El 'ChkVolume').IsChecked
    $visibility = if ($checked) { 'Visible' } else { 'Collapsed' }
    (Get-El 'ConfirmLabel').Visibility = $visibility
    (Get-El 'ConfirmBox').Visibility = $visibility
    if (-not $checked) { (Get-El 'ConfirmBox').Text = '' }
}

function OnBackClick {
    if ($Script:Busy) { return }
    $Script:RunMode = ''
    Set-View 'Home'
}

function OnSecondaryClick {
    if ($Script:View -eq 'Repair') { Start-StatusRefresh }
}

function OnPrimaryClick {
    switch ($Script:View) {
        'Install' {
            if ($Script:Busy) { return }

            $port = 0
            $text = [string](Get-El 'PortBox').Text
            if (-not [int]::TryParse($text.Trim(), [ref]$port) -or $port -lt 1 -or $port -gt 65535) {
                [void][System.Windows.MessageBox]::Show(
                    'El puerto debe ser un numero entre 1 y 65535.',
                    '2 Arbolitos', 'OK', 'Warning')
                return
            }
            Start-Action -Action 'Install' -Extra @{ Port = $port }
        }
        'Repair' {
            Start-StatusRefresh
        }
        'Uninstall' {
            if ($Script:Busy) { return }

            $extra = @{}
            if ((Get-El 'ChkVolume').IsChecked) {
                if (([string](Get-El 'ConfirmBox').Text).Trim() -cne 'BORRAR') {
                    [void][System.Windows.MessageBox]::Show(
                        'Para borrar la base de datos escribe BORRAR en la casilla.',
                        '2 Arbolitos', 'OK', 'Warning')
                    return
                }
                $extra['RemoveVolume'] = $true
                $extra['BackupBefore'] = $true
            }
            if ((Get-El 'ChkEnv').IsChecked) { $extra['RemoveEnv'] = $true }
            if ((Get-El 'ChkBackups').IsChecked) { $extra['RemoveBackups'] = $true }
            if ((Get-El 'ChkFirewall').IsChecked) { $extra['RemoveFirewall'] = $true }
            if (-not (Get-El 'ChkImages').IsChecked) { $extra['KeepImages'] = $true }
            if ((Get-El 'ChkBackupBefore').IsChecked) { $extra['BackupBefore'] = $true }

            $detail = if ($extra['RemoveVolume']) {
                'Se eliminaran los contenedores, la configuracion marcada y LA BASE DE DATOS con todos sus datos.'
            } else {
                'Se eliminaran los contenedores y lo que hayas marcado. La base de datos se conserva.'
            }
            $answer = [System.Windows.MessageBox]::Show(
                $detail + "`n`nContinuar?",
                'Desinstalar 2 Arbolitos', 'YesNo', 'Warning')
            if ($answer -ne 'Yes') { return }

            Start-Action -Action 'Uninstall' -Extra $extra
        }
        'Done' {
            $Script:Window.Close()
        }
        'Error' {
            Set-View 'Home'
            Start-StatusRefresh
        }
    }
}

function OnOpenClick {
    $url = ''
    if ($Script:Status -and $Script:Status.Url) { $url = [string]$Script:Status.Url }
    if (-not $url) { $url = [string](Get-El 'DoneUrl').Text }
    if ($url) {
        try { Start-Process $url } catch { }
    }
}

function OnPanelClick {
    $panel = Join-Path $Script:Root 'Panel.bat'
    if (Test-Path -LiteralPath $panel) {
        try { Start-Process -FilePath $panel } catch { }
    }
}

# ---------------------------------------------------------------------------
# Arranque
# ---------------------------------------------------------------------------

function Initialize-Installer {
    $Script:Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
    $Script:RunMode = ''
    $Script:StatusPending = $false

    $reader = [System.Xml.XmlReader]::Create((New-Object System.IO.StringReader($xamlText)))
    $Script:Window = [System.Windows.Markup.XamlReader]::Load($reader)

    if (-not $Script:Window) { throw 'No se pudo cargar la ventana.' }

    $Script:Window.Add_Closing({
        param($sender, $eventArgs)
        if ($Script:Busy) {
            $answer = [System.Windows.MessageBox]::Show(
                'Hay una operacion en curso. Si cierras ahora puede quedar a medias.' + "`n`n" + 'Cerrar igualmente?',
                '2 Arbolitos', 'YesNo', 'Warning')
            if ($answer -ne 'Yes') { $eventArgs.Cancel = $true }
        }
    })

    (Get-El 'BtnInstall').Add_Click({ OnInstallClick })
    (Get-El 'BtnRepair').Add_Click({ OnRepairClick })
    (Get-El 'BtnUninstall').Add_Click({ OnUninstallClick })
    (Get-El 'BtnPrimary').Add_Click({ OnPrimaryClick })
    (Get-El 'BtnSecondary').Add_Click({ OnSecondaryClick })
    (Get-El 'BtnBack').Add_Click({ OnBackClick })
    (Get-El 'BtnOpen').Add_Click({ OnOpenClick })
    (Get-El 'BtnPanel').Add_Click({ OnPanelClick })
    (Get-El 'ChkVolume').Add_Checked({ OnVolumeChecked })
    (Get-El 'ChkVolume').Add_Unchecked({ OnVolumeChecked })

    $Script:ActionTimer = New-Object System.Windows.Threading.DispatcherTimer
    $Script:ActionTimer.Interval = [TimeSpan]::FromMilliseconds(250)
    $Script:ActionTimer.Add_Tick({ Read-Progress; Complete-Action })

    $Script:StatusTimer = New-Object System.Windows.Threading.DispatcherTimer
    $Script:StatusTimer.Interval = [TimeSpan]::FromMilliseconds(300)
    $Script:StatusTimer.Add_Tick({ Complete-Status })

    Set-View 'Home'
    Start-StatusRefresh
    [void]$Script:Window.ShowDialog()
}

# ---------------------------------------------------------------------------
# Autotest
# ---------------------------------------------------------------------------

function Invoke-InstallerSelfTest {
    Write-Host ''
    Write-Host '2Arbolitos - autotest del instalador visual'
    Write-Host ''

    $Script:InstallerFailures = 0
    function Check {
        param([string]$Name, [bool]$Ok, [string]$Detail = '')
        if ($Ok) {
            Write-Host ("[ok   ] " + $Name)
        } else {
            $Script:InstallerFailures = $Script:InstallerFailures + 1
            $extra = if ($Detail) { " -> $Detail" } else { '' }
            Write-Host ("[FALLO] " + $Name + $extra)
        }
    }

    $apartment = [System.Threading.Thread]::CurrentThread.GetApartmentState()
    Check 'Hilo STA' ($apartment -eq 'STA') ([string]$apartment)

    $window = $null
    try {
        $reader = [System.Xml.XmlReader]::Create((New-Object System.IO.StringReader($xamlText)))
        $window = [System.Windows.Markup.XamlReader]::Load($reader)
        Check 'El XAML se carga' ($null -ne $window)
    } catch {
        Check 'El XAML se carga' $false $_.Exception.Message
    }

    if ($window) {
        $required = @(
            'ViewHome', 'ViewInstall', 'ViewRepair', 'ViewUninstall', 'ViewDone', 'ViewError',
            'StepList', 'LogBox', 'FindingsList', 'ChecksPanel', 'PortCard', 'PortBox',
            'ConfirmBox', 'ConfirmLabel', 'ChkVolume', 'ChkEnv', 'ChkBackups', 'ChkFirewall',
            'ChkImages', 'ChkBackupBefore', 'ChkContainers',
            'BtnPrimary', 'BtnSecondary', 'BtnBack', 'BtnOpen', 'BtnPanel',
            'ModeText', 'HeaderSubtitle', 'RepairSubtitle', 'ExtraInfo',
            'DoneTitle', 'DoneMessage', 'DoneUrl', 'DoneLan', 'DoneNote',
            'ErrorTitle', 'ErrorDetail', 'ErrorHints', 'ErrorCode'
        )
        $missing = @()
        foreach ($name in $required) {
            if (-not $window.FindName($name)) { $missing += $name }
        }
        Check 'Todos los controles existen' ($missing.Count -eq 0) ($missing -join ', ')
        Check 'La ventana tiene titulo' ([bool]$window.Title) ([string]$window.Title)
    }

    foreach ($function in @('Initialize-Installer', 'Start-Action', 'Complete-Action', 'Set-View',
                             'Render-Status', 'Render-Findings', 'Show-Failure', 'Show-Success',
                             'Start-StatusRefresh', 'Start-Repair')) {
        Check ("Funcion " + $function) ([bool](Get-Command $function -ErrorAction SilentlyContinue))
    }

    Check 'Existe SetupOps.ps1' (Test-Path -LiteralPath $Script:SetupPath) $Script:SetupPath

    $fixtures = Join-Path $PSScriptRoot 'fixtures'
    $count = 0
    if (Test-Path -LiteralPath $fixtures) {
        $count = @(Get-ChildItem -LiteralPath $fixtures -Filter '*.log' -File).Count
    }
    Check 'Hay fixtures de errores' ($count -ge 7) ([string]$count)

    $event = '{"t":"step","id":"env","state":"ok","text":"Configuracion lista"}' | ConvertFrom-Json
    Check 'El progreso se interpreta' ($event.t -eq 'step' -and $event.state -eq 'ok')

    Write-Host ''
    if ($Script:InstallerFailures -eq 0) {
        Write-Host 'Todo correcto.'
        exit 0
    }
    Write-Host ("Fallos: " + $Script:InstallerFailures)
    exit 1
}

if ($SelfTest) {
    Invoke-InstallerSelfTest
    exit 0
}

Initialize-Installer
