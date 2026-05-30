import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { execSync, spawnSync } from 'child_process';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
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

function checkAdmin() {
  try {
    if (os.platform() === 'win32') {
      execSync('net session', { stdio: 'ignore' });
    } else {
      if (process.getuid && process.getuid() !== 0) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export default function startProd() {
  console.log(`
${colors.cyan}${colors.bold}============================================${colors.reset}
${colors.cyan}${colors.bold}  INSTALADOR DE SERVICIO (PRODUCCIÓN)${colors.reset}
${colors.cyan}${colors.bold}============================================${colors.reset}
`);

  if (!checkAdmin()) {
    log('Este comando requiere permisos de administrador/root.', 'warn');
    log('Ejecuta con "sudo" en Linux/Mac o como Administrador en Windows.\n', 'warn');
  }

  log('Instalando/Verificando PM2...', 'step');

  const pm2Check = spawnSync('npx', ['pm2', '--version'], { cwd: ROOT, shell: true, encoding: 'utf8' });
  if (pm2Check.status !== 0) {
    log('PM2 no encontrado. Instalando globalmente...', 'warn');
    execSync('npm install -g pm2', { stdio: 'inherit' });
    log('PM2 instalado globalmente', 'success');
  } else {
    log(`PM2 detectado: ${pm2Check.stdout.trim()}`, 'success');
  }

  log('Configurando inicio automático según plataforma...', 'step');
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
    log('No se pudo configurar el inicio automático. Puedes hacerlo manualmente.', 'warn');
  }

  log('Registrando servidor en PM2...', 'step');
  execSync('npx pm2 start src/index.js --name "2arbolitos-api"', { cwd: join(ROOT, 'server'), stdio: 'inherit' });
  execSync('npx pm2 save', { cwd: ROOT, stdio: 'inherit' });
  log('Servidor registrado y guardado para inicio automático', 'success');

  console.log(`
${colors.green}${colors.bold}============================================${colors.reset}
${colors.green}${colors.bold}  LISTO - SISTEMA EN PRODUCCIÓN${colors.reset}
${colors.green}${colors.bold}============================================${colors.reset}

El servidor corre en segundo plano en el puerto 3002.
Se iniciará automáticamente al encender el equipo.

${colors.bold}Comandos útiles:${colors.reset}
  ${colors.cyan}npm run update${colors.reset}   Actualizar código y reiniciar
  ${colors.cyan}pm2 status${colors.reset}       Ver estado del servidor
  ${colors.cyan}pm2 logs${colors.reset}         Ver logs del servidor
  ${colors.cyan}pm2 stop 2arbolitos-api${colors.reset}  Detener servidor
`);
}
