import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync, writeFileSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { randomBytes } from 'crypto';
import readline from 'readline';
import net from 'net';
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
    : type === 'step' ? `${colors.cyan}${colors.bold}>${colors.reset}`
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
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}

function hasDocker() {
  try {
    return execSync('docker --version', { stdio: 'pipe', encoding: 'utf8' }).trim().length > 0;
  } catch { return false; }
}

function checkMySQL(host, port) {
  return new Promise(resolve => {
    const sock = new net.Socket();
    sock.setTimeout(3000);
    sock.on('connect', () => { sock.destroy(); resolve(true); });
    sock.on('error', () => resolve(false));
    sock.on('timeout', () => { sock.destroy(); resolve(false); });
    sock.connect(port || 3306, host || 'localhost');
  });
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
    const child = spawn(process.execPath, ['--input-type=module'], {
      cwd: join(ROOT, 'server'),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    child.stdin.end(scriptLines.join('\n'));
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

async function installWithDocker() {
  log('Iniciando instalación con Docker...', 'step');
  log('Verificando Docker...', 'step');
  if (!hasDocker()) {
    log('Docker no está instalado. Descárgalo de https://docker.com', 'error');
    process.exit(1);
  }
  log('Docker detectado', 'success');

  const pass = randomBytes(16).toString('hex');
  const jwtSecret = `2arbolitos_jwt_${randomBytes(24).toString('hex')}`;

  writeFileSync(join(ROOT, '.env'), [
    `MYSQL_ROOT_PASSWORD=${pass}`,
    `JWT_SECRET=${jwtSecret}`,
    'HOST_IP=0.0.0.0',
    'APP_PORT=3002',
  ].join('\n') + '\n', 'utf8');
  log('.env generado', 'success');

  log('Levantando contenedores...', 'step');
  run('docker compose up -d');

  log('Esperando a que MySQL esté listo...', 'step');
  run('docker compose exec -T db mysqladmin ping -h localhost --silent --wait=30 2>/dev/null || true');

  log('Sincronizando esquema...', 'step');
  run('docker compose exec -T app npx prisma db push');

  log('Insertando datos de ejemplo...', 'step');
  run('docker compose exec -T app node server/prisma/seed.js');

  const localIP = getLocalIP();
  console.log(`\n${colors.green}${colors.bold}========================================${colors.reset}`);
  console.log(`${colors.green}${colors.bold}  INSTALACIÓN CON DOCKER COMPLETADA${colors.reset}`);
  console.log(`${colors.green}${colors.bold}========================================${colors.reset}`);
  console.log(`\n  Acceso: http://${localIP}:3002\n`);
  console.log(`  Credenciales:`);
  console.log(`    Admin:  admin / admin123`);
  console.log(`    Mesero: mesero / waiter123\n`);
}

async function installLocal() {
  const localIP = getLocalIP();

  log('Verificando Node.js...', 'step');
  try {
    const version = runCapture('node --version');
    log(`Node.js detectado: ${version}`, 'success');
  } catch {
    log('Node.js no está instalado. Descarga LTS desde https://nodejs.org', 'error');
    process.exit(1);
  }

  log('Verificando MySQL...', 'step');
  const mysqlReachable = await checkMySQL('localhost', 3306);
  if (!mysqlReachable) {
    log('MySQL no responde en localhost:3306', 'warn');
    if (hasDocker()) {
      const useDocker = await ask('¿Quieres instalar usando Docker en su lugar? (s/N): ');
      if (useDocker.toLowerCase() === 's') {
        await installWithDocker();
        return;
      }
    }
    log('Asegúrate de que MySQL esté instalado y corriendo.', 'error');
    process.exit(1);
  }
  log('MySQL detectado en localhost:3306', 'success');

  let dbHost = 'localhost';
  let dbUser = 'root';
  let dbPass = '';
  let dbPort = '3306';

  const tryConnect = async (u, p) => {
    try {
      await createDatabaseViaMysql2(dbHost, u, p, parseInt(dbPort));
      return true;
    } catch { return false; }
  };

  if (await tryConnect('root', '')) {
    log('Conexión MySQL exitosa con root sin contraseña', 'success');
  } else if (await tryConnect('root', 'root')) {
    dbPass = 'root';
    log('Conexión MySQL exitosa con root:root', 'success');
  } else {
    log('No se pudo conectar automáticamente. Ingresa los datos manualmente:', 'warn');
    dbHost = await ask(`  Host MySQL [${dbHost}]: `) || dbHost;
    dbUser = await ask(`  Usuario MySQL [${dbUser}]: `) || dbUser;
    dbPass = await ask(`  Contraseña MySQL: `);
    dbPort = await ask(`  Puerto MySQL [${dbPort}]: `) || dbPort;
    if (!(await tryConnect(dbUser, dbPass))) {
      log('No se pudo conectar a MySQL con esos datos.', 'error');
      process.exit(1);
    }
  }

  log('Generando archivos de configuración...', 'step');
  const jwtSecret = `2arbolitos_jwt_${randomBytes(24).toString('hex')}`;
  const databaseUrl = `mysql://${dbUser}${dbPass ? `:${encodeURIComponent(dbPass)}` : ''}@${dbHost}:${dbPort}/2arbolitos?schema=public&charset=utf8mb4`;

  const serverEnv = [
    '# Servidor',
    'PORT=3002',
    'NODE_ENV=development',
    '',
    '# Base de datos MySQL',
    `DATABASE_URL="${databaseUrl}"`,
    '',
    '# JWT',
    `JWT_SECRET=${jwtSecret}`,
    'JWT_EXPIRES_IN=7d',
    '',
    '# Frontend (para CORS)',
    'FRONTEND_URL=http://localhost:5173',
    '',
  ].join('\n');
  writeFileSync(join(ROOT, 'server', '.env'), serverEnv, 'utf8');
  log('Configuración guardada en server/.env', 'success');

  const rootEnv = [
    '# URL del API (usada por el frontend en producción)',
    `VITE_API_URL=http://${localIP}:3002/api`,
    'VITE_API_PROXY_TARGET=http://127.0.0.1:3002',
    '',
  ].join('\n');
  writeFileSync(join(ROOT, '.env'), rootEnv, 'utf8');
  log('Configuración guardada en .env', 'success');

  log('Instalando dependencias del servidor...', 'step');
  run('npm install', { cwd: join(ROOT, 'server') });
  log('Dependencias del servidor instaladas', 'success');

  log('Instalando dependencias del frontend...', 'step');
  run('npm install', { cwd: ROOT });
  log('Dependencias del frontend instaladas', 'success');

  log('Creando base de datos...', 'step');
  try {
    await createDatabaseViaMysql2(dbHost, dbUser, dbPass, parseInt(dbPort) || 3306);
    log('Base de datos "2arbolitos" creada/verificada', 'success');
  } catch (err) {
    log(`No se pudo crear la base de datos automáticamente: ${err.message}`, 'warn');
    log('Crea la DB manualmente:', 'warn');
    log('CREATE DATABASE IF NOT EXISTS `2arbolitos` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;', 'warn');
    const cont = await ask('\n¿Continuar de todas formas? (s/N): ');
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
  - Ejecuta: ${colors.cyan}npm start${colors.reset}
  - En tablets y celulares, escanea el QR desde:
    http://${localIP}:3002/qr
`);
}

export default async function installSystem() {
  console.log(`
${colors.cyan}========================================${colors.reset}
${colors.cyan}  INSTALADOR 2ARBOLITOS${colors.reset}
${colors.cyan}========================================${colors.reset}
`);
  console.log('Este proceso puede tardar varios minutos.\n');

  const dockerAvail = hasDocker();
  console.log(`  ${colors.bold}1.${colors.reset} Instalación local (Node + MySQL directo)`);
  if (dockerAvail) {
    console.log(`  ${colors.bold}2.${colors.reset} Instalación con Docker ${colors.green}(recomendado)${colors.reset}`);
  }
  console.log(`  ${colors.bold}3.${colors.reset} Salir\n`);

  const opt = (await ask(`${colors.bold}Elige una opción: ${colors.reset}`)).trim();

  if (opt === '2' && dockerAvail) {
    rl.close();
    await installWithDocker();
  } else if (opt === '1' || (opt === '2' && !dockerAvail)) {
    rl.close();
    await installLocal();
  } else {
    log('Instalación cancelada.', 'error');
    process.exit(0);
  }

  rl.close();
}

const isMain = process.argv[1] && (process.argv[1].replace(/\\/g, '/').endsWith('install.js') || process.argv[1].replace(/\\/g, '/').includes('commands\\install.js') || process.argv[1].replace(/\\/g, '/').includes('commands/install.js'));
if (isMain) {
  installSystem().catch(e => { console.error(e); process.exit(1); });
}
