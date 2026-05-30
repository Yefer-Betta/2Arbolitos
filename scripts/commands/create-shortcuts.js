import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import os from 'os';
import { execSync } from 'child_process';

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
    // .url file - no muestra terminal, abre directo en el navegador
    const urlContent = `[InternetShortcut]
URL=${baseUrl}
IDList=
HotKey=0
IconFile=C:\\Program Files\\Internet Explorer\\iexplore.exe
IconIndex=0
`;
    writeFileSync(join(targetDir, '2Arbolitos - POS.url'), urlContent, 'utf8');
    log('Acceso directo creado: "2Arbolitos - POS.url"', 'success');

    // Admin shortcut - abre el menú CLI en una ventana
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

    // macOS admin shortcut
    const adminCommand = `#!/bin/bash
cd "${ROOT}"
node scripts/cli.js
`;
    const adminPath = join(targetDir, '2Arbolitos - Admin.command');
    writeFileSync(adminPath, adminCommand, 'utf8');
    execSync(`chmod +x "${adminPath}"`);
    log('Acceso directo creado: "2Arbolitos - Admin.command"', 'success');

  } else if (platform === 'linux') {
    // Linux .desktop file
    const desktopContent = `[Desktop Entry]
Name=2Arbolitos POS
Comment=Sistema de Punto de Venta y Restaurante
Exec=xdg-open ${baseUrl}
Icon=${ROOT}/public/vite.svg
Terminal=false
Type=Application
Categories=Office;
`;
    writeFileSync(join(targetDir, '2Arbolitos-POS.desktop'), desktopContent, 'utf8');
    try {
      execSync(`chmod +x "${join(targetDir, '2Arbolitos-POS.desktop')}"`);
    } catch {}
    log('Acceso directo creado: "2Arbolitos-POS.desktop"', 'success');

    // Linux admin .desktop
    const adminDesktop = `[Desktop Entry]
Name=2Arbolitos Admin
Comment=Panel de control del sistema
Exec=bash -c 'cd ${ROOT} && node scripts/cli.js'
Icon=${ROOT}/public/vite.svg
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
  ${colors.bold}2Arbolitos - POS${colors.reset}     → Abre el sistema (doble-click y listo)
  ${colors.bold}2Arbolitos - Admin${colors.reset}   → Panel de control (instalación, actualización)
`);
}
