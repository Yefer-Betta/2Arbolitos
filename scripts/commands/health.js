import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import net from 'net';
import os from 'os';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '../..');

const ICON_OK = '✅';
const ICON_FAIL = '❌';
const ICON_WARN = '⚠️';
const ICON_INFO = 'ℹ️';

let passed = 0;
let failed = 0;
let warnings = 0;

function check(name, ok, detail = '') {
  if (ok) {
    console.log(`  ${ICON_OK} ${name}`);
    passed++;
  } else {
    console.log(`  ${ICON_FAIL} ${name}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

function warn(name, detail = '') {
  console.log(`  ${ICON_WARN} ${name}${detail ? ` — ${detail}` : ''}`);
  warnings++;
}

function info(msg) {
  console.log(`  ${ICON_INFO} ${msg}`);
}

function checkPort(host, port) {
  return new Promise(resolve => {
    const sock = new net.Socket();
    sock.setTimeout(2000);
    sock.on('connect', () => { sock.destroy(); resolve(true); });
    sock.on('error', () => resolve(false));
    sock.on('timeout', () => { sock.destroy(); resolve(false); });
    sock.connect(port, host);
  });
}

function fetchUrl(url) {
  return new Promise(resolve => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', () => resolve(null));
  });
}

async function main() {
  const serverEnvPath = join(ROOT, 'server', '.env');
  const serverDir = join(ROOT, 'server');
  const distPath = join(ROOT, 'dist', 'index.html');

  console.log(`\n${os.hostname()} — 2Arbolitos Health Check`);
  console.log(`Node: ${process.version} | Platform: ${os.platform()} ${os.arch()}\n`);

  check('Node.js >= 18', parseFloat(process.version.slice(1)) >= 18);

  const serverEnvExists = existsSync(serverEnvPath);
  check('server/.env existe', serverEnvExists);
  if (serverEnvExists) {
    const env = readFileSync(serverEnvPath, 'utf8');
    const dbUrlMatch = env.match(/DATABASE_URL="([^"]+)"/);
    const jwtMatch = env.match(/JWT_SECRET=(.+)/);
    check('DATABASE_URL configurada', !!dbUrlMatch);
    check('JWT_SECRET configurado', !!jwtMatch);
    if (jwtMatch) {
      const secret = jwtMatch[1].trim();
      check('JWT_SECRET seguro', secret.length >= 20 && secret !== 'super_secret_jwt_change_this_in_production', 'Usa un secreto más fuerte');
    }
  }

  const nodeModulesRoot = existsSync(join(ROOT, 'node_modules'));
  const nodeModulesServer = existsSync(join(serverDir, 'node_modules'));
  check('node_modules (raíz) instalado', nodeModulesRoot);
  check('node_modules (server) instalado', nodeModulesServer);

  const prismaGen = existsSync(join(serverDir, 'node_modules', '.prisma'));
  check('Prisma Client generado', prismaGen);

  const frontendBuilt = existsSync(distPath);
  check('Frontend compilado (dist/)', frontendBuilt);

  const mysqlReachable = await checkPort('localhost', 3306);
  check('MySQL accesible en :3306', mysqlReachable);

  info('Verificando servidor en :3002...');
  const serverRunning = await checkPort('localhost', 3002);
  check('Servidor respondiendo en :3002', serverRunning);

  if (serverRunning) {
    const api = await fetchUrl('http://localhost:3002/api/settings');
    check('API /api/settings responde', api && api.status === 200);

    const qr = await fetchUrl('http://localhost:3002/qr');
    check('Página QR accesible', qr && qr.status === 200);

    const frontend = await fetchUrl('http://localhost:3002');
    check('Frontend servido', frontend && frontend.status === 200 && frontend.data.includes('2Arbolitos'));
  }

  const dockerAvail = spawnSync('docker', ['--version'], { stdio: 'pipe', encoding: 'utf8' });
  if (dockerAvail.status === 0) {
    const ver = dockerAvail.stdout.trim();
    info(`Docker disponible: ${ver}`);

    const composeCheck = spawnSync('docker', ['compose', 'ps', '--services'], { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
    if (composeCheck.status === 0 && composeCheck.stdout.includes('app')) {
      info('Contenedores Docker activos (docker compose ps)');
    } else {
      info('Contenedores Docker no están activos (usa docker compose up -d)');
    }
  }

  const ip = getLocalIP();
  console.log(`\n  ${ICON_INFO} Acceso local:      http://localhost:3002`);
  console.log(`  ${ICON_INFO} Acceso red LAN:    http://${ip}:3002`);
  console.log(`  ${ICON_INFO} QR de acceso:      http://localhost:3002/qr\n`);

  console.log(`${'─'.repeat(45)}`);
  console.log(`  ${ICON_OK} ${passed} pasaron  ${ICON_FAIL} ${failed} fallaron  ${ICON_WARN} ${warnings} advertencias\n`);

  process.exit(failed > 0 ? 1 : 0);
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

main().catch(e => { console.error(e); process.exit(1); });
