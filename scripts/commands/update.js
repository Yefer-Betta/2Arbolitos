import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
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

export default function updateSystem() {
  console.log(`
${colors.cyan}${colors.bold}========================================${colors.reset}
${colors.cyan}${colors.bold}  ACTUALIZAR SISTEMA${colors.reset}
${colors.cyan}${colors.bold}========================================${colors.reset}
`);

  log('Reconstruyendo frontend para producción...', 'step');
  execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
  log('Frontend actualizado', 'success');

  log('Reiniciando servidor...', 'step');
  try {
    execSync('npx pm2 restart 2arbolitos-api', { cwd: ROOT, stdio: 'inherit' });
    log('Servicio reiniciado', 'success');
  } catch {
    log('PM2 no está gestionando el servicio. Inícialo con la opción 2.', 'warn');
  }

  console.log(`
${colors.green}${colors.bold}========================================${colors.reset}
${colors.green}${colors.bold}  Sistema actualizado correctamente${colors.reset}
${colors.green}${colors.bold}========================================${colors.reset}
`);
}
