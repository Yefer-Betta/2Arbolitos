import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync } from 'fs';
import { execSync, spawn } from 'child_process';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');

const colors = {
  reset: '\x1b[0m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m',
  cyan: '\x1b[36m', bold: '\x1b[1m',
};

function log(message, type = 'info') {
  const prefix =
    type === 'error' ? `${colors.red}[ERROR]${colors.reset}`
    : type === 'warn' ? `${colors.yellow}[WARN]${colors.reset}`
    : type === 'success' ? `${colors.green}[OK]${colors.reset}`
    : '[INFO]';
  console.log(`${prefix} ${message}`);
}

function openBrowser(url) {
  const cmd = os.platform() === 'win32' ? `start "" "${url}"`
    : os.platform() === 'darwin' ? `open "${url}"`
    : `xdg-open "${url}"`;
  try {
    spawn(cmd, [], { shell: true, stdio: 'ignore' }).unref();
  } catch {}
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

async function ensureDeps(dir, label) {
  if (!existsSync(join(dir, 'node_modules'))) {
    log(`${label}: node_modules no encontrado. Instalando...`, 'warn');
    execSync('npm install', { cwd: dir, stdio: 'inherit' });
    log(`${label}: dependencias instaladas`, 'success');
  }
}

export default async function startDev() {
  console.log(`
${colors.cyan}${colors.bold}=========================================${colors.reset}
${colors.cyan}${colors.bold}  2ARBOLITOS - MODO DESARROLLO${colors.reset}
${colors.cyan}${colors.bold}=========================================${colors.reset}
`);

  await ensureDeps(ROOT, 'Frontend');
  await ensureDeps(join(ROOT, 'server'), 'Servidor');

  if (!existsSync(join(ROOT, 'server', '.env'))) {
    log('server/.env no encontrado. Ejecuta primero: npm run setup', 'error');
    process.exit(1);
  }

  const localIP = getLocalIP();

  console.log(`
${colors.bold}Iniciando servidor de desarrollo...${colors.reset}
  Frontend: http://localhost:5173
  API:      http://localhost:3002
  Red:      http://${localIP}:5173

  Presiona Ctrl+C en ambas ventanas para detener.
`);

  const child = spawn('npx', ['concurrently', '-n', 'vite,api', '-c', 'cyan,magenta', 'npm run dev', 'npm run api'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });

  setTimeout(() => openBrowser('http://localhost:5173'), 2000);

  child.on('exit', code => {
    process.exit(code);
  });
}
