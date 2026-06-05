import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import os from 'os';
import { execSync } from 'child_process';
import { createDesktopShortcut } from '../../electron/create-desktop-shortcut.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, type = 'info') {
  const prefix =
    type === 'error' ? `${colors.red}[ERROR]${colors.reset}`
    : type === 'warn' ? `${colors.yellow}[WARN]${colors.reset}`
    : type === 'success' ? `${colors.green}[OK]${colors.reset}`
    : '[INFO]';
  console.log(`${prefix} ${message}`);
}

function getDesktopPath() {
  const home = os.homedir();
  const desktop = join(home, 'Desktop');
  return desktop;
}

export default function createShortcuts(port = 3002) {
  const platform = os.platform();
  const desktop = getDesktopPath();
  const baseUrl = `http://localhost:${port}`;

  if (!existsSync(desktop)) {
    log(`Escritorio no encontrado en ${desktop}. Creando accesos en el directorio raíz.`, 'warn');
  }

  const targetDir = existsSync(desktop) ? desktop : ROOT;

  log(`Creando accesos directos en ${targetDir}...`, 'step');

  if (platform === 'win32') {
    // 1. Acceso directo nativo .lnk apuntando al .exe (con logo)
    const exePath = join(ROOT, 'release', 'win-unpacked', '2Arbolitos POS.exe');
    const iconPath = join(ROOT, 'build', 'icon.ico');

    if (existsSync(exePath)) {
      const result = createDesktopShortcut({
        exePath,
        iconPath: existsSync(iconPath) ? iconPath : undefined,
        name: '2Arbolitos POS',
        desktopPath: targetDir
      });
      if (result.success) {
        log(`Acceso directo nativo: "${result.path}"`, 'success');
      } else {
        log(`Fallo creando .lnk: ${result.error}. Usando fallback .url.`, 'warn');
        writeFallbackUrl(targetDir, baseUrl);
      }
    } else {
      log(`No se encontró ${exePath}. Usando fallback .url (solo navegador).`, 'warn');
      writeFallbackUrl(targetDir, baseUrl);
    }

    // 2. Acceso directo .url al navegador (compatibilidad, NO se elimina)
    writeFallbackUrl(targetDir, baseUrl);

    // 3. Admin shortcut - abre el menú CLI en una ventana
    const adminBat = `@echo off
title 2Arbolitos - Administración
color 0B
cd /d "${ROOT}"
node scripts/cli.js
pause
`;
    writeFileSync(join(targetDir, '2Arbolitos - Admin.bat'), adminBat, 'utf8');
    log('Acceso directo creado: "2Arbolitos - Admin.bat"', 'success');

  } else if (platform === 'darwin') {
    // macOS .command file (doble-click abre terminal y ejecuta)
    const commandContent = `#!/bin/bash
open "${baseUrl}"
`;
    const commandPath = join(targetDir, '2Arbolitos - POS.command');
    writeFileSync(commandPath, commandContent, 'utf8');
    execSync(`chmod +x "${commandPath}"`);
    log('Acceso directo creado: "2Arbolitos - POS.command"', 'success');

    const adminCommand = `#!/bin/bash
cd "${ROOT}"
node scripts/cli.js
`;
    const adminPath = join(targetDir, '2Arbolitos - Admin.command');
    writeFileSync(adminPath, adminCommand, 'utf8');
    execSync(`chmod +x "${adminPath}"`);
    log('Acceso directo creado: "2Arbolitos - Admin.command"', 'success');

  } else if (platform === 'linux') {
    const desktopContent = `[Desktop Entry]
Name=2Arbolitos POS
Comment=Sistema de Punto de Venta y Restaurante
Exec=xdg-open ${baseUrl}
Icon=${ROOT}/public/logo.png
Terminal=false
Type=Application
Categories=Office;
`;
    writeFileSync(join(targetDir, '2Arbolitos-POS.desktop'), desktopContent, 'utf8');
    try {
      execSync(`chmod +x "${join(targetDir, '2Arbolitos-POS.desktop')}"`);
    } catch {}
    log('Acceso directo creado: "2Arbolitos-POS.desktop"', 'success');

    const adminDesktop = `[Desktop Entry]
Name=2Arbolitos Admin
Comment=Panel de control del sistema
Exec=bash -c 'cd ${ROOT} && node scripts/cli.js'
Icon=${ROOT}/public/logo.png
Terminal=true
Type=Application
Categories=System;
`;
    writeFileSync(join(targetDir, '2Arbolitos-Admin.desktop'), adminDesktop, 'utf8');
    try {
      execSync(`chmod +x "${join(targetDir, '2Arbolitos-Admin.desktop')}"`);
    } catch {}
    log('Acceso directo creado: "2Arbolitos-Admin.desktop"', 'success');
  }

  console.log(`
${colors.green}${colors.bold}✅ Accesos directos creados en tu escritorio:${colors.reset}
  ${colors.bold}2Arbolitos POS${colors.reset}        → Acceso directo nativo (.lnk) con logo
  ${colors.bold}2Arbolitos - POS.url${colors.reset}  → Acceso directo al navegador (legacy)
  ${colors.bold}2Arbolitos - Admin${colors.reset}    → Panel de control (instalación, actualización)
`);
}

function writeFallbackUrl(targetDir, baseUrl) {
  const urlContent = `[InternetShortcut]
URL=${baseUrl}
IDList=
HotKey=0
IconFile=C:\\Program Files\\Internet Explorer\\iexplore.exe
IconIndex=0
`;
  writeFileSync(join(targetDir, '2Arbolitos - POS.url'), urlContent, 'utf8');
  log('Acceso directo navegador: "2Arbolitos - POS.url"', 'success');
}
