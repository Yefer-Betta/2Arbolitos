#!/usr/bin/env node
import readline from 'readline';
import { execSync, spawn, spawnSync } from 'child_process';
import os from 'os';
import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import installSystem from './commands/install.js';
import startDev from './commands/start-dev.js';
import startProd from './commands/start-prod.js';
import updateSystem from './commands/update.js';
import healthCheck from './commands/health.js';

const __dirname = resolve(new URL('.', import.meta.url).pathname);
const ROOT = resolve(__dirname, '..');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function clearScreen() {
  process.stdout.write('\x1b[2J\x1b[0f');
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

async function showQR() {
  const localIP = getLocalIP();
  const url = `http://${localIP}:3002`;
  console.log(`\n${colors.bold}Escanea para abrir en tu celular/tablet:${colors.reset}\n`);
  try {
    const { default: qr } = await import('qrcode-terminal');
    qr.generate(url, { small: true });
  } catch {
    console.log(`  ${url}\n`);
  }
  console.log(`\n  O ingresa manualmente: ${colors.cyan}${url}${colors.reset}\n`);
}

function hasDocker() {
  try {
    return spawnSync('docker', ['--version'], { stdio: 'pipe' }).status === 0;
  } catch { return false; }
}

function dockerUp() {
  const child = spawn('docker', ['compose', 'up', '-d'], { cwd: ROOT, stdio: 'inherit', shell: true });
  child.on('exit', code => {
    if (code === 0) console.log(`\n${colors.green}Contenedores activos${colors.reset}\n`);
  });
}
function dockerDown() {
  const child = spawn('docker', ['compose', 'down'], { cwd: ROOT, stdio: 'inherit', shell: true });
  child.on('exit', code => {
    if (code === 0) console.log(`\n${colors.green}Contenedores detenidos${colors.reset}\n`);
  });
}
function dockerLogs() {
  spawn('docker', ['compose', 'logs', '-f'], { cwd: ROOT, stdio: 'inherit', shell: true });
}
function dockerRebuild() {
  const child = spawn('docker', ['compose', 'up', '-d', '--build'], { cwd: ROOT, stdio: 'inherit', shell: true });
  child.on('exit', code => {
    if (code === 0) console.log(`\n${colors.green}Reconstruido y activo${colors.reset}\n`);
  });
}

function openBrowser(url) {
  const cmd = os.platform() === 'win32' ? `start "" "${url}"`
    : os.platform() === 'darwin' ? `open "${url}"`
    : `xdg-open "${url}"`;
  try {
    spawn(cmd, [], { shell: true, stdio: 'ignore' }).unref();
  } catch {}
}

function showMenu() {
  clearScreen();
  const dockerAvail = hasDocker();
  console.log(`
${colors.cyan}========================================================${colors.reset}
${colors.cyan}${colors.bold}          PANEL DE CONTROL - 2ARBOLITOS${colors.reset}
${colors.cyan}========================================================${colors.reset}
${colors.bold}
  1.  Instalar Sistema por Primera Vez
  2.  Iniciar en Producción (PM2)
  3.  Iniciar en Modo Desarrollo
  4.  Actualizar Código y Reiniciar
  5.  Health Check (diagnóstico)
  6.  Abrir Cliente en el Navegador
  7.  Mostrar Código QR (acceso desde celular)${dockerAvail ? `
  8.  [Docker] Iniciar Contenedores
  9.  [Docker] Detener Contenedores
  10. [Docker] Ver Logs
  11. [Docker] Reconstruir y Reiniciar` : ''}
  ${dockerAvail ? '12' : '8'}. Salir${colors.reset}

${colors.cyan}========================================================${colors.reset}
`);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  let running = true;

  while (running) {
    showMenu();
    const option = (await ask(`${colors.bold}Elige una opción: ${colors.reset}`)).trim();

    switch (option) {
      case '1':
        await installSystem();
        await ask('\nPresiona Enter para volver al menú...');
        break;
      case '2':
        startProd();
        await ask('\nPresiona Enter para volver al menú...');
        break;
      case '3':
        rl.close();
        await startDev();
        running = false;
        break;
      case '4':
        updateSystem();
        await ask('\nPresiona Enter para volver al menú...');
        break;
      case '5':
        console.log('');
        await healthCheck();
        await ask('\nPresiona Enter para volver al menú...');
        break;
      case '6':
        openBrowser('http://localhost:3002');
        await ask('\nPresiona Enter para volver al menú...');
        break;
      case '7':
        await showQR();
        await ask('\nPresiona Enter para volver al menú...');
        break;
      case '8':
        if (hasDocker()) {
          rl.close();
          dockerUp();
          running = false;
        } else {
          running = false;
          rl.close();
          process.exit(0);
        }
        break;
      case '9':
        if (hasDocker()) {
          dockerDown();
          await ask('\nPresiona Enter para volver al menú...');
        } else {
          running = false;
          rl.close();
          process.exit(0);
        }
        break;
      case '10':
        if (hasDocker()) {
          rl.close();
          dockerLogs();
          running = false;
        } else {
          running = false;
          rl.close();
          process.exit(0);
        }
        break;
      case '11':
        if (hasDocker()) {
          rl.close();
          dockerRebuild();
          running = false;
        } else {
          running = false;
          rl.close();
          process.exit(0);
        }
        break;
      default:
        console.log(`\n${colors.yellow}Opción no válida. Intenta de nuevo.${colors.reset}`);
        await new Promise(r => setTimeout(r, 1500));
    }
  }

  rl.close();
  console.log(`\n${colors.green}¡Hasta luego!${colors.reset}\n`);
  process.exit(0);
}

main().catch(err => {
  console.error(`\n${colors.red}Error:${colors.reset}`, err.message);
  process.exit(1);
});
