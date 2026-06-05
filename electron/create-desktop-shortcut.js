import { execSync } from 'child_process';
import { writeFileSync, chmodSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import os from 'os';

function log(message, type = 'info') {
  const colors = {
    reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m',
    red: '\x1b[31m', cyan: '\x1b[36m', bold: '\x1b[1m'
  };
  const prefix = {
    error: `${colors.red}[ERROR]${colors.reset}`,
    warn: `${colors.yellow}[WARN]${colors.reset}`,
    success: `${colors.green}[OK]${colors.reset}`,
    info: `${colors.cyan}[INFO]${colors.reset}`
  }[type] || '[INFO]';
  console.log(`${prefix} ${message}`);
}

function createWindowsShortcut({ exePath, iconPath, name, desktopPath }) {
  try {
    if (!existsSync(desktopPath)) {
      mkdirSync(desktopPath, { recursive: true });
    }

    const lnkPath = path.join(desktopPath, `${name}.lnk`);

    if (existsSync(lnkPath)) {
      return { success: true, path: lnkPath, alreadyExists: true };
    }

    const esc = (p) => String(p).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const finalIconPath = iconPath || exePath;

    const psScript = `
$ErrorActionPreference = 'Stop'
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("${esc(lnkPath)}")
$Shortcut.TargetPath = "${esc(exePath)}"
$Shortcut.IconLocation = "${esc(finalIconPath)},0"
$Shortcut.WorkingDirectory = "${esc(path.dirname(exePath))}"
$Shortcut.Description = "2Arbolitos POS - Sistema de Punto de Venta"
$Shortcut.WindowStyle = 7
$Shortcut.Save()
Write-Output "OK"
`.trim();

    const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
    const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${encoded}`;

    const result = execSync(cmd, { encoding: 'utf8', timeout: 15000, stdio: 'pipe' });

    if (result.includes('OK') && existsSync(lnkPath)) {
      return { success: true, path: lnkPath, alreadyExists: false };
    }
    return { success: false, error: 'PowerShell no confirmó la creación' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function createMacShortcut({ exePath, iconPath, name, desktopPath }) {
  try {
    if (!existsSync(desktopPath)) {
      mkdirSync(desktopPath, { recursive: true });
    }

    const appName = `${name}.app`;
    const aliasPath = path.join(desktopPath, appName);

    if (existsSync(aliasPath)) {
      return { success: true, path: aliasPath, alreadyExists: true };
    }

    const appPath = path.dirname(exePath);
    const script = `tell application "Finder" to make alias file to POSIX file "${appPath}" at POSIX file "${desktopPath}"`;
    execSync(`osascript -e '${script}'`, { stdio: 'pipe', timeout: 10000 });

    if (existsSync(aliasPath)) {
      return { success: true, path: aliasPath, alreadyExists: false };
    }
    return { success: true, path: aliasPath, alreadyExists: false, note: 'alias creado' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function createLinuxShortcut({ exePath, iconPath, name, desktopPath }) {
  try {
    if (!existsSync(desktopPath)) {
      mkdirSync(desktopPath, { recursive: true });
    }

    const desktopFile = path.join(desktopPath, `${name}.desktop`);

    if (existsSync(desktopFile)) {
      return { success: true, path: desktopFile, alreadyExists: true };
    }

    const content = `[Desktop Entry]
Version=1.0
Type=Application
Name=${name}
Comment=Sistema de Punto de Venta y Gestión para Restaurantes
Exec="${exePath}" %U
Icon=${iconPath || ''}
Terminal=false
Categories=Office;Business;
StartupNotify=true
StartupWMClass=2Arbolitos POS
`;

    writeFileSync(desktopFile, content, 'utf8');
    chmodSync(desktopFile, 0o755);

    try {
      execSync(`chmod +x "${desktopFile}"`, { stdio: 'pipe' });
    } catch {}

    return { success: true, path: desktopFile, alreadyExists: false };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function createDesktopShortcut({ exePath, iconPath, name = '2Arbolitos POS', desktopPath }) {
  const platform = process.platform;
  const finalDesktop = desktopPath || path.join(os.homedir(), 'Desktop');

  if (!exePath) {
    return { success: false, error: 'exePath es requerido' };
  }

  if (!existsSync(exePath)) {
    return { success: false, error: `No se encontró el ejecutable: ${exePath}` };
  }

  log(`Creando acceso directo en ${finalDesktop}...`, 'info');

  let result;
  if (platform === 'win32') {
    result = createWindowsShortcut({ exePath, iconPath, name, desktopPath: finalDesktop });
  } else if (platform === 'darwin') {
    result = createMacShortcut({ exePath, iconPath, name, desktopPath: finalDesktop });
  } else {
    result = createLinuxShortcut({ exePath, iconPath, name, desktopPath: finalDesktop });
  }

  if (result.success) {
    if (result.alreadyExists) {
      log(`Acceso directo ya existía: ${result.path}`, 'warn');
    } else {
      log(`Acceso directo creado: ${result.path}`, 'success');
    }
  } else {
    log(`Error al crear acceso directo: ${result.error}`, 'error');
  }

  return result;
}
