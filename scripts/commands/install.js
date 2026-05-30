import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync, writeFileSync } from 'fs';
import { execSync, spawn } from 'child_process';
import readline from 'readline';
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
    : type === 'step' ? `${colors.cyan}${colors.bold}[${type.toUpperCase()}]${colors.reset}`
    : '[INFO]';
  console.log(`${prefix} ${message}`);
}

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

function runCapture(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', ...opts }).trim();
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function createDatabaseViaMysql2(host, user, password, port) {
  return new Promise((resolve, reject) => {
    const config = JSON.stringify({ host, user, password: password || '', port: port || 3306 });
    const scriptLines = [
      'import mysql from \'mysql2/promise\';',
      `const cfg = ${config};`,
      'const conn = await mysql.createConnection(cfg);',
      'await conn.query(\'CREATE DATABASE IF NOT EXISTS `2arbolitos` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci\');',
      'await conn.end();',
      'console.log(\'OK\');',
    ];
    const script = scriptLines.join('\n');
    const child = spawn(process.execPath, ['--input-type=module'], {
      cwd: join(ROOT, 'server'),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdin.end(script);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    child.on('close', code => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr || `Exit code ${code}`));
    });
    child.on('error', reject);
  });
}

export default async function installSystem() {
  console.log(`
${colors.cyan}========================================${colors.reset}
${colors.cyan}  INSTALADOR 2ARBOLITOS${colors.reset}
${colors.cyan}  (Frontend + Backend + MySQL)${colors.reset}
${colors.cyan}========================================${colors.reset}
`);
  console.log('Este proceso puede tardar varios minutos.');
  console.log('Asegúrate de tener conexión a internet.\n');

  await ask('Presiona Enter para continuar...');

  log('Verificando Node.js...', 'step');
  try {
    const version = runCapture('node --version');
    log(`Node.js detectado: ${version}`, 'success');
  } catch {
    log('Node.js no está instalado. Descarga LTS desde https://nodejs.org', 'error');
    process.exit(1);
  }

  log('Obteniendo IP local...', 'step');
  const localIP = getLocalIP();
  log(`IP detectada: ${localIP}`, 'success');

  log('Configuración de MySQL', 'step');
  console.log('Proporciona los datos de conexión a tu servidor MySQL:\n');

  const dbHost = await ask(`  Host MySQL [localhost]: `) || 'localhost';
  const dbUser = await ask(`  Usuario MySQL [root]: `) || 'root';
  const dbPass = await ask(`  Contraseña MySQL (dejar vacío si no tiene): `);
  const dbPort = await ask(`  Puerto MySQL [3306]: `) || '3306';

  log('Generando archivos de configuración...', 'step');

  const databaseUrl = `mysql://${dbUser}${dbPass ? `:${dbPass}` : ''}@${dbHost}:${dbPort}/2arbolitos?schema=public&charset=utf8mb4`;

  const serverEnv = `# Servidor
PORT=3002
NODE_ENV=development

# Base de datos MySQL
DATABASE_URL="${databaseUrl}"

# JWT
JWT_SECRET=super_secret_jwt_change_this_in_production
JWT_EXPIRES_IN=7d

# Frontend (para CORS)
FRONTEND_URL=http://localhost:5173
`;
  writeFileSync(join(ROOT, 'server', '.env'), serverEnv, 'utf8');
  log('Configuración guardada en server/.env', 'success');

  const rootEnv = `# URL del API (usada por el frontend en producción)
VITE_API_URL=http://${localIP}:3002/api
VITE_API_PROXY_TARGET=http://127.0.0.1:3002
`;
  writeFileSync(join(ROOT, '.env'), rootEnv, 'utf8');
  log('Configuración guardada en .env', 'success');

  log('Instalando dependencias del servidor...', 'step');
  run('npm install', { cwd: join(ROOT, 'server') });
  log('Dependencias del servidor instaladas', 'success');

  log('Instalando dependencias del frontend...', 'step');
  run('npm install', { cwd: ROOT });
  log('Dependencias del frontend instaladas', 'success');

  log('Conectando a MySQL y creando base de datos...', 'step');
  try {
    await createDatabaseViaMysql2(dbHost, dbUser, dbPass, parseInt(dbPort) || 3306);
    log('Base de datos "2arbolitos" creada/verificada', 'success');
  } catch (err) {
    log(`No se pudo crear la base de datos automáticamente: ${err.message}`, 'warn');
    log('Asegúrate de que MySQL esté corriendo y crea la DB manualmente:', 'warn');
    log(`CREATE DATABASE IF NOT EXISTS \\\`2arbolitos\\\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`, 'warn');
    const cont = await ask('\n¿Quieres continuar de todas formas? (s/N): ');
    if (cont.toLowerCase() !== 's') {
      log('Instalación cancelada.', 'error');
      process.exit(1);
    }
  }

  log('Configurando esquema de base de datos con Prisma...', 'step');
  run('npx prisma generate', { cwd: join(ROOT, 'server') });
  log('Prisma client generado', 'success');

  run('npx prisma db push', { cwd: join(ROOT, 'server') });
  log('Esquema sincronizado con MySQL', 'success');

  log('Insertando datos de ejemplo...', 'step');
  try {
    run('node prisma/seed.js', { cwd: join(ROOT, 'server') });
    log('Datos de ejemplo creados', 'success');
  } catch {
    log('El seed no se ejecutó (puede que ya haya datos)', 'warn');
  }

  log('Construyendo frontend para producción...', 'step');
  run('npm run build', { cwd: ROOT });
  log('Frontend construido', 'success');

  log('Creando accesos directos en el escritorio...', 'step');
  try {
    const { default: createShortcuts } = await import('./create-shortcuts.js');
    createShortcuts(3002);
  } catch {
    log('No se pudieron crear los accesos directos automáticamente.', 'warn');
  }

  console.log(`
${colors.green}${colors.bold}========================================${colors.reset}
${colors.green}${colors.bold}  INSTALACIÓN COMPLETADA${colors.reset}
${colors.green}${colors.bold}========================================${colors.reset}

${colors.bold}Credenciales por defecto:${colors.reset}
  - Admin:  admin / admin123
  - Mesero: mesero / waiter123
  - Cocina: cocina / cook123

${colors.bold}Siguientes pasos:${colors.reset}
  - Haz doble-click en el icono "2Arbolitos - POS" del escritorio
  - En tablets y celulares, escanea el código QR desde:
    http://${localIP}:3002/qr
  - Para administración: "2Arbolitos - Admin" en el escritorio
`);
}
