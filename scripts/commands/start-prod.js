import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { execSync, spawnSync } from 'child_process';
import os from 'os';
import readline from 'readline';

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
    : type === 'step' ? `${colors.cyan}${colors.bold}>${colors.reset}`
    : '[INFO]';
  console.log(`${prefix} ${message}`);
}

function hasDocker() {
  try {
    return spawnSync('docker', ['--version'], { stdio: 'pipe' }).status === 0;
  } catch { return false; }
}

function startWithDocker() {
  console.log(`
${colors.cyan}${colors.bold}============================================${colors.reset}
${colors.cyan}${colors.bold}  INICIAR CON DOCKER${colors.reset}
${colors.cyan}${colors.bold}============================================${colors.reset}
`);
  if (!existsSync(join(ROOT, '.env'))) {
    log('Copia .env.example.docker a .env y edítalo primero.', 'error');
    log('cp .env.example.docker .env', 'warn');
    process.exit(1);
  }
  log('Levantando contenedores...', 'step');
  execSync('docker compose up -d', { cwd: ROOT, stdio: 'inherit' });
  log('Contenedores activos', 'success');
  console.log(`
${colors.green}${colors.bold}============================================${colors.reset}
${colors.green}${colors.bold}  LISTO - DOCKER EN PRODUCCIÓN${colors.reset}
${colors.green}${colors.bold}============================================${colors.reset}

El servidor corre en http://localhost:3002

${colors.bold}Comandos útiles:${colors.reset}
  ${colors.cyan}npm run docker:logs${colors.reset}    Ver logs
  ${colors.cyan}npm run docker:down${colors.reset}    Detener
  ${colors.cyan}npm run docker:rebuild${colors.reset} Reconstruir
`);
}

function startWithPM2() {
  console.log(`
${colors.cyan}${colors.bold}============================================${colors.reset}
${colors.cyan}${colors.bold}  INSTALADOR DE SERVICIO (PRODUCCIÓN)${colors.reset}
${colors.cyan}${colors.bold}============================================${colors.reset}
`);

  log('Instalando/Verificando PM2...', 'step');
  const pm2Check = spawnSync('npx', ['pm2', '--version'], { cwd: ROOT, shell: true, encoding: 'utf8' });
  if (pm2Check.status !== 0) {
    log('PM2 no encontrado. Instalando globalmente...', 'warn');
    execSync('npm install -g pm2', { stdio: 'inherit' });
    log('PM2 instalado globalmente', 'success');
  } else {
    log(`PM2 detectado: ${pm2Check.stdout.trim()}`, 'success');
  }

  log('Configurando inicio automático...', 'step');
  const platform = os.platform();
  try {
    if (platform === 'win32') {
      execSync('npm install -g pm2-windows-startup', { stdio: 'pipe' });
      execSync('pm2-startup install', { stdio: 'inherit' });
      log('Servicio de Windows configurado', 'success');
    } else {
      execSync('pm2 startup', { stdio: 'inherit' });
      log('Inicio automático configurado (systemd/launchd)', 'success');
    }
  } catch {
    log('No se pudo configurar el inicio automático.', 'warn');
  }

  log('Registrando servidor en PM2...', 'step');
  execSync('npx pm2 start src/index.js --name "2arbolitos-api"', { cwd: join(ROOT, 'server'), stdio: 'inherit' });
  execSync('npx pm2 save', { cwd: ROOT, stdio: 'inherit' });
  log('Servidor registrado para inicio automático', 'success');

  console.log(`
${colors.green}${colors.bold}============================================${colors.reset}
${colors.green}${colors.bold}  LISTO - SISTEMA EN PRODUCCIÓN${colors.reset}
${colors.green}${colors.bold}============================================${colors.reset}

El servidor corre en segundo plano en el puerto 3002.

${colors.bold}Comandos útiles:${colors.reset}
  ${colors.cyan}npm run update${colors.reset}       Actualizar y reiniciar
  ${colors.cyan}pm2 status${colors.reset}           Ver estado
  ${colors.cyan}pm2 logs${colors.reset}             Ver logs
`);
}

import { existsSync } from 'fs';

export default function startProd() {
  const dockerAvail = hasDocker();
  if (!dockerAvail) {
    startWithPM2();
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(`\n  ${colors.bold}1.${colors.reset} Con Docker ${colors.green}(recomendado)${colors.reset}\n  ${colors.bold}2.${colors.reset} Con PM2 (servicio del sistema)\n\nElige: `, opt => {
    rl.close();
    if (opt.trim() === '2') {
      startWithPM2();
    } else {
      startWithDocker();
    }
  });
}
