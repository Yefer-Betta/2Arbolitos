#!/usr/bin/env node
/**
 * 2Arbolitos POS — Empaquetador Portable para Windows x64
 * -------------------------------------------------------
 * Genera release/2Arbolitos-Portable-Windows-x64-<version>.zip
 *
 * Contenido del paquete:
 *   start.bat                  Lanzador (valida entorno, crea server\.env,
 *                              hace prisma db push, seed inicial y arranca)
 *   Panel.bat                  Panel de control (PowerShell + WPF)
 *   README-PORTABLE.txt        Instrucciones de uso
 *   node\node.exe              Node.js LTS x64 portable (sin prerrequisitos)
 *   dist\                      Frontend compilado (servido por Express)
 *   server\                    Backend Express + Prisma (src, prisma, deps prod)
 *   LICENSE, NOTICE.md,        Avisos legales (MIT exige incluir el aviso
 *   TERMS.md, PRIVACY.md,      de copyright en las copias distribuidas)
 *   SECURITY.md
 *
 * MySQL 8 sigue siendo un requisito (arquitectura actual del proyecto).
 *
 * Uso:
 *   node scripts/pack-portable.js                # descarga Node LTS y empaqueta
 *   node scripts/pack-portable.js --system-node  # usa el node.exe del sistema
 *   node scripts/pack-portable.js --skip-build   # no ejecuta npm run build
 *   node scripts/pack-portable.js --skip-nm      # no copia server/node_modules
 */

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const args = new Set(process.argv.slice(2));
const USE_SYSTEM_NODE = args.has('--system-node');
const SKIP_BUILD = args.has('--skip-build');
const SKIP_NODE_MODULES = args.has('--skip-nm');

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const version = pkg.version || '1.0.0';
const PACKAGE_NAME = `2Arbolitos-Portable-Windows-x64-${version}`;
const RELEASE_DIR = path.join(ROOT, 'release');

function log(msg) {
  console.log(`\x1b[36m[pack]\x1b[0m ${msg}`);
}
function warn(msg) {
  console.log(`\x1b[33m[pack]\x1b[0m ${msg}`);
}
function fail(msg) {
  console.error(`\x1b[31m[pack]\x1b[0m ${msg}`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* 1. Asegurar dist/ (frontend compilado)                              */
/* ------------------------------------------------------------------ */
function ensureDist() {
  const distIndex = path.join(ROOT, 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    log('dist/ ya existe — se reutiliza el build actual (borra dist/ para forzar uno nuevo).');
    return;
  }
  if (SKIP_BUILD) {
    fail('dist/index.html no existe y se paso --skip-build. Ejecuta `npm run build` primero.');
  }
  log('Generando frontend con `npm run build` ...');
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const res = spawnSync(npm, ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.status !== 0) fail('`npm run build` fallo.');
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) fail('dist/index.html no se genero.');
}

/* ------------------------------------------------------------------ */
/* 2. Obtener Node LTS portable (node.exe)                             */
/* ------------------------------------------------------------------ */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': '2arbolitos-pack' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJson(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} en ${url}`));
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function resolveLatestLts() {
  const releases = await fetchJson('https://nodejs.org/dist/index.json');
  const lts = releases.find((r) => r.lts);
  if (!lts) throw new Error('No se encontro una version LTS en nodejs.org');
  return lts.version; // e.g. "v22.11.0"
}

function extractNodeExe(zipPath, destDir) {
  // bsdtar (tar.exe en Windows 10+) puede extraer un miembro de un .zip.
  const res = spawnSync('tar', ['-x', '-f', zipPath, '-C', destDir], { stdio: 'inherit' });
  if (res.status !== 0) throw new Error('tar no pudo extraer el ZIP de Node');
}

async function preparePortableNode(staging) {
  const nodeDir = path.join(staging, 'node');
  await fsp.mkdir(nodeDir, { recursive: true });
  const destExe = path.join(nodeDir, 'node.exe');

  if (USE_SYSTEM_NODE) {
    log('Usando node.exe del sistema (--system-node).');
    await fsp.copyFile(process.execPath, destExe);
    return;
  }

  const tmp = path.join(os.tmpdir(), `arbolitos-node-${Date.now()}`);
  await fsp.mkdir(tmp, { recursive: true });
  try {
    const ver = await resolveLatestLts();
    const file = `node-${ver}-win-x64.zip`;
    const url = `https://nodejs.org/dist/${ver}/${file}`;
    const zipPath = path.join(tmp, file);
    log(`Descargando Node LTS ${ver} (win-x64) ...`);
    const dl = spawnSync('curl', ['-L', '--fail', '--silent', '--show-error', '-o', zipPath, url], { stdio: 'inherit' });
    if (dl.status !== 0) throw new Error('curl fallo al descargar Node');
    log('Extrayendo node.exe ...');
    const extractDir = path.join(tmp, 'ex');
    await fsp.mkdir(extractDir, { recursive: true });
    extractNodeExe(zipPath, extractDir);
    const extracted = path.join(extractDir, `node-${ver}-win-x64`, 'node.exe');
    if (!fs.existsSync(extracted)) throw new Error('No se encontro node.exe en el ZIP');
    await fsp.copyFile(extracted, destExe);
    const out = execFileSync(destExe, ['--version'], { encoding: 'utf8' }).trim();
    log(`Node portable incluido: ${out}`);
  } catch (err) {
    warn(`No se pudo obtener Node LTS automaticamente (${err.message}). Usando node.exe del sistema.`);
    await fsp.copyFile(process.execPath, destExe);
    const out = execFileSync(destExe, ['--version'], { encoding: 'utf8' }).trim();
    log(`Node portable incluido (sistema): ${out}`);
  } finally {
    await fsp.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/* 3. Copiar server/ y dist/                                           */
/* ------------------------------------------------------------------ */
const SERVER_FILES = [
  'src',
  'prisma',
  'package.json',
  'package-lock.json',
  '.env.example',
];

async function copyServer(staging) {
  const src = path.join(ROOT, 'server');
  const dst = path.join(staging, 'server');
  await fsp.mkdir(dst, { recursive: true });

  for (const entry of SERVER_FILES) {
    const from = path.join(src, entry);
    if (!fs.existsSync(from)) {
      warn(`server/${entry} no existe — se omite.`);
      continue;
    }
    const to = path.join(dst, entry);
    log(`Copiando server/${entry} ...`);
    await fsp.cp(from, to, { recursive: true });
  }

  if (SKIP_NODE_MODULES) {
    warn('Omitiendo server/node_modules (--skip-nm). start.bat no podra instalar sin npm.');
  } else {
    const nm = path.join(src, 'node_modules');
    if (!fs.existsSync(nm)) {
      fail('server/node_modules no existe. Ejecuta `npm ci` dentro de server/ o quita --skip-nm.');
    }
    log('Copiando server/node_modules (dependencias de produccion)...');
    await fsp.cp(nm, path.join(dst, 'node_modules'), { recursive: true });
  }
}

async function copyDist(staging) {
  const from = path.join(ROOT, 'dist');
  if (!fs.existsSync(from)) fail('dist/ no existe.');
  log('Copiando dist/ ...');
  await fsp.cp(from, path.join(staging, 'dist'), { recursive: true });
}

/* ------------------------------------------------------------------ */
/* 3a. Version visible para el panel (Get-AppVersion)                  */
/* ------------------------------------------------------------------ */
async function writeVersionFiles(staging) {
  const manifest = {
    name: pkg.name || '2arbolitos',
    private: true,
    version,
    description: '2Arbolitos POS - paquete portable',
  };
  await fsp.writeFile(
    path.join(staging, 'package.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf8'
  );
  await fsp.writeFile(path.join(staging, 'version.txt'), version + '\r\n', 'utf8');
  log(`Version incluida: ${version}`);
}

/* ------------------------------------------------------------------ */
/* 3b. Avisos legales (MIT exige incluir el aviso en las copias)      */
/* ------------------------------------------------------------------ */
async function copyLegal(staging) {
  const files = ['LICENSE', 'NOTICE.md', 'TERMS.md', 'PRIVACY.md', 'SECURITY.md'];
  let copied = 0;
  for (const name of files) {
    const from = path.join(ROOT, name);
    if (!fs.existsSync(from)) continue;
    await fsp.copyFile(from, path.join(staging, name));
    copied++;
  }
  if (copied === 0) {
    warn('No se encontro LICENSE; el ZIP saldra sin avisos legales.');
    return;
  }
  log(`Avisos legales incluidos (${copied} archivos).`);
}

/* ------------------------------------------------------------------ */
/* 3c. Panel de control (PowerShell + WPF, sin dependencias)          */
/* ------------------------------------------------------------------ */
async function copyPanel(staging) {
  const from = path.join(ROOT, 'scripts', 'panel');
  const to = path.join(staging, 'scripts', 'panel');
  if (!fs.existsSync(from)) {
    warn('No se encontro scripts/panel; el ZIP saldra sin panel de control.');
    return;
  }

  await fsp.mkdir(to, { recursive: true });
  for (const name of ['Panel.ps1']) {
    await fsp.copyFile(path.join(from, name), path.join(to, name));
  }

  // Ops.ps1 es compartido por el panel y el instalador: vive en scripts/lib.
  const libFrom = path.join(ROOT, 'scripts', 'lib');
  const libTo = path.join(staging, 'scripts', 'lib');
  await fsp.mkdir(libTo, { recursive: true });
  for (const name of ['Ops.ps1']) {
    await fsp.copyFile(path.join(libFrom, name), path.join(libTo, name));
  }

  const bat = await fsp.readFile(path.join(ROOT, 'Panel.bat'), 'utf8');
  await fsp.writeFile(path.join(staging, 'Panel.bat'), bat.replace(/\r?\n/g, '\r\n'), 'utf8');
  log('Panel de control incluido (Panel.bat).');
}

/* ------------------------------------------------------------------ */
/* 4. Escribir helpers, start.bat y README                            */
/* ------------------------------------------------------------------ */
const PTool = `#!/usr/bin/env node
/* Helper de arranque portable: check / count-users / gen-secret */
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const cmd = process.argv[2];

function parseDatabaseUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username || ''),
    password: decodeURIComponent(u.password || ''),
    database: (u.pathname || '').replace(/^\\//, ''),
  };
}

(async () => {
  if (cmd === 'gen-secret') {
    console.log(crypto.randomBytes(32).toString('hex'));
    return;
  }

  if (cmd === 'check') {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL no esta definido en server/.env');
    const mysql = require('mysql2/promise');
    const cfg = parseDatabaseUrl(process.env.DATABASE_URL);
    // La base puede no existir todavia: 'prisma db push' la crea.
    // Validamos el servidor y las credenciales sin seleccionar esquema.
    delete cfg.database;
    const conn = await mysql.createConnection(cfg);
    await conn.query('SELECT 1');
    await conn.end();
    console.log('DB_OK');
    return;
  }

  if (cmd === 'count-users') {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    try {
      const n = await prisma.user.count();
      console.log('USER_COUNT=' + n);
    } finally {
      await prisma.$disconnect();
    }
    return;
  }

  console.error('Uso: ptool.cjs check|count-users|gen-secret');
  process.exit(2);
})().catch((e) => {
  console.error((e && e.message) ? e.message : e);
  process.exit(1);
});
`;

function startBat() {
  return [
    '@echo off',
    'setlocal EnableExtensions EnableDelayedExpansion',
    'title 2Arbolitos POS - Servidor Portable',
    'cd /d "%~dp0"',
    '',
    'set "ROOT=%~dp0"',
    'set "NODE_EXE=%ROOT%node\\node.exe"',
    'set "SERVER_DIR=%ROOT%server"',
    'set "APP_PORT=3002"',
    '',
    'echo ============================================================',
    'echo    2Arbolitos POS  -  Paquete Portable Windows x64',
    'echo ============================================================',
    'echo.',
    '',
    'if not exist "%NODE_EXE%" (',
    '  echo [ERROR] Falta node\\node.exe. El paquete esta incompleto.',
    '  goto :fail',
    ')',
    'if not exist "%SERVER_DIR%\\src\\index.js" (',
    '  echo [ERROR] Falta server\\src\\index.js. El paquete esta incompleto.',
    '  goto :fail',
    ')',
    'if not exist "%ROOT%dist\\index.html" (',
    '  echo [ERROR] Falta dist\\index.html ^(frontend compilado^).',
    '  goto :fail',
    ')',
    'if not exist "%SERVER_DIR%\\node_modules" (',
    '  echo [ERROR] Faltan las dependencias server\\node_modules.',
    '  goto :fail',
    ')',
    '',
    'if not exist "%SERVER_DIR%\\.env" (',
    '  call :CREATE_ENV',
    '  if errorlevel 1 goto :fail',
    ')',
    '',
    'rem --- Leer puerto desde server/.env ---',
    'for /f "usebackq tokens=2 delims==" %%P in (`findstr /b /i "PORT=" "%SERVER_DIR%\\.env"`) do set "APP_PORT=%%P"',
    '',
    'echo [1/4] Verificando conexion a MySQL ...',
    'pushd "%SERVER_DIR%"',
    '"%NODE_EXE%" scripts\\ptool.cjs check',
    'set "RC=%ERRORLEVEL%"',
    'popd',
    'if not "%RC%"=="0" (',
    '  echo.',
    '  echo [ERROR] No se pudo conectar a MySQL.',
    '  echo         Revisa que el servicio MySQL este iniciado y que',
    '  echo         los datos en server\\.env sean correctos.',
    '  echo         Puedes editar server\\.env con el Bloc de notas.',
    '  goto :fail',
    ')',
    'echo       OK - conectado.',
    '',
    'echo [2/4] Preparando esquema de la base de datos (prisma db push) ...',
    'pushd "%SERVER_DIR%"',
    '"%NODE_EXE%" node_modules\\prisma\\build\\index.js db push --accept-data-loss --skip-generate',
    'set "RC=%ERRORLEVEL%"',
    'popd',
    'if not "%RC%"=="0" (',
    '  echo [ERROR] Fallo prisma db push. Revisa server\\.env.',
    '  goto :fail',
    ')',
    '',
    'echo [3/4] Verificando datos iniciales ...',
    'pushd "%SERVER_DIR%"',
    'set "USER_COUNT="',
    'for /f "usebackq tokens=2 delims==" %%C in (`"%NODE_EXE%" scripts\\ptool.cjs count-users`) do set "USER_COUNT=%%C"',
    'if "%USER_COUNT%"=="0" (',
    '  echo       Base de datos vacia - cargando datos iniciales ^(seed^) ...',
    '  "%NODE_EXE%" prisma\\seed.js',
    ') else (',
    '  echo       Datos existentes detectados ^(%USER_COUNT% usuarios^). No se toca la base.',
    ')',
    'popd',
    '',
    'echo.',
    'echo [4/4] Iniciando servidor en http://localhost:%APP_PORT%',
    'echo       Para detener: cierra esta ventana.',
    'echo.',
    'start "" "http://localhost:%APP_PORT%"',
    '',
    'pushd "%SERVER_DIR%"',
    '"%NODE_EXE%" src\\index.js',
    'popd',
    '',
    'echo.',
    'echo El servidor se ha detenido.',
    'pause',
    'exit /b 0',
    '',
    ':CREATE_ENV',
    'echo.',
    'echo --- Configuracion inicial de MySQL ---',
    'echo     (Enter para aceptar los valores por defecto)',
    'echo.',
    'set "DB_HOST="',
    'set /p "DB_HOST=Host de MySQL [localhost]: "',
    'if "!DB_HOST!"=="" set "DB_HOST=localhost"',
    'set "DB_PORT="',
    'set /p "DB_PORT=Puerto de MySQL [3306]: "',
    'if "!DB_PORT!"=="" set "DB_PORT=3306"',
    'set "DB_USER="',
    'set /p "DB_USER=Usuario de MySQL [root]: "',
    'if "!DB_USER!"=="" set "DB_USER=root"',
    'set "DB_PASS="',
    'set /p "DB_PASS=Clave de MySQL (Enter si no tiene): "',
    'set "DB_NAME="',
    'set /p "DB_NAME=Nombre de la base de datos [2arbolitos]: "',
    'if "!DB_NAME!"=="" set "DB_NAME=2arbolitos"',
    'set "PORT_IN="',
    'set /p "PORT_IN=Puerto de la aplicacion [3002]: "',
    'if "!PORT_IN!"=="" set "PORT_IN=3002"',
    '',
    'set "JWT="',
    '"%NODE_EXE%" "%SERVER_DIR%\\scripts\\ptool.cjs" gen-secret > "%TEMP%\\2arbolitos_jwt.tmp"',
    'set /p "JWT="<"%TEMP%\\2arbolitos_jwt.tmp"',
    'del "%TEMP%\\2arbolitos_jwt.tmp" >nul 2>&1',
    'if "!JWT!"=="" set "JWT=2arbolitos_cambia_este_secreto"',
    '',
    '(',
    '  echo # Generado por start.bat',
    '  echo PORT=!PORT_IN!',
    '  echo NODE_ENV=production',
    '  echo DATABASE_URL="mysql://!DB_USER!:!DB_PASS!@!DB_HOST!:!DB_PORT!/!DB_NAME!?schema=public"',
    '  echo JWT_SECRET=!JWT!',
    '  echo JWT_EXPIRES_IN=7d',
    '  echo FRONTEND_URL=http://localhost:!PORT_IN!',
    ') > "%SERVER_DIR%\\.env"',
    '',
    'echo.',
    'echo [OK] Creado server\\.env',
    'exit /b 0',
    '',
    ':fail',
    'echo.',
    'pause',
    'exit /b 1',
    '',
  ].join('\r\n');
}

function readme(version) {
  return `============================================================
  2Arbolitos POS - Paquete Portable Windows (x64)  v${version}
============================================================

Este paquete incluye el sistema completo para ejecutarlo en Windows
SIN instalar Node.js ni compilar nada. El backend (Express + Prisma)
sirve tambien la interfaz web ya compilada (dist/).

REQUISITO UNICO: MySQL 8
------------------------
La arquitectura actual del proyecto requiere un servidor MySQL.
Instala MySQL 8 (Community) o MariaDB 10.4+ en la misma maquina y
asegurate de que el servicio este en ejecucion antes de arrancar.

  - Descarga: https://dev.mysql.com/downloads/mysql/
  - Puerto por defecto: 3306
  - Anota el usuario y la clave (normalmente root).


CONTENIDO
---------
  start.bat            Lanzador (doble clic para iniciar todo)
  Panel.bat            Panel de control (estado, iniciar, respaldar)
  README-PORTABLE.txt  Este archivo
  node\\node.exe        Node.js LTS x64 portable (no requiere instalar)
  dist\\               Frontend compilado
  server\\             Backend Express + Prisma y sus dependencias
  LICENSE              Licencia MIT del sistema
  NOTICE.md            Titularidad, marca y licencias de terceros
  TERMS.md             Terminos de uso
  PRIVACY.md           Politica de privacidad y datos
  SECURITY.md          Seguridad y reporte de vulnerabilidades


COMO ARRANCAR
-------------
1. Asegurate de que MySQL este iniciado.
2. Extrae TODO el ZIP en una carpeta, idealmente una ruta corta,
   por ejemplo:  C:\\2Arbolitos
   (evita "Escritorio\\cosas\\..." con rutas muy largas).
3. Doble clic en  start.bat
4. La primera vez te pedira los datos de MySQL (host, puerto, usuario,
   clave y nombre de base de datos). Con Enter aceptas los valores
   por defecto. Se creara server\\.env.
5. El sistema creara/actualizara las tablas y, si la base esta vacia,
   cargara los datos iniciales (seed).
6. Se abrira el navegador en http://localhost:3002 (o el puerto elegido).

Para DETENER el sistema: cierra la ventana negra del servidor.

PANEL DE CONTROL
----------------
Doble clic en  Panel.bat  para abrir el panel: muestra el estado del
sistema, permite iniciar/detener, generar un respaldo de la base de
datos y ver un diagnostico completo. Solo usa PowerShell de Windows,
no hay que instalar nada adicional.

En modo portable el respaldo automatico queda deshabilitado: usa la
herramienta de MySQL (mysqldump) si necesitas una copia.

Si necesitas cambiar los datos de MySQL despues: edita server\\.env con
el Bloc de notas y vuelve a ejecutar start.bat. Para reconfigurar desde
cero, borra server\\.env.


USUARIOS INICIALES (creados por el seed)
----------------------------------------
  admin    / admin123    (ADMIN)
  gerente  / waiter123   (MANAGER)
  cajero   / waiter123   (CASHIER)
  mesero   / waiter123   (WAITER)
  cocina   / cook123     (COOK)

IMPORTANTE: cambia las claves de los usuarios desde la aplicacion.


ACCESO DESDE OTROS DISPOSITIVOS (meseros, cocina, tablets)
----------------------------------------------------------
El servidor escucha en todas las interfaces (0.0.0.0). Desde otra PC o
celular en la misma red, abre:

      http://IP-DE-ESTE-PC:3002

Ejemplo: http://192.168.1.50:3002

Si no carga, permite el puerto 3002 en el Firewall de Windows:

      netsh advfirewall firewall add rule name="2Arbolitos 3002" dir=in action=allow protocol=TCP localport=3002

El codigo QR de la app usara la IP desde la que se accede.


MULTIMONEDA
-----------
Moneda de operacion: COP. Las tasas USD y Bs. se configuran dentro de
la aplicacion (Settings: exchangeRate, exchangeRateBs).


SEGURIDAD
---------
- JWT_SECRET se genera aleatoriamente en la primera ejecucion.
- No compartas server\\.env: contiene la clave de la base de datos.
- Recomendado: crea un usuario MySQL dedicado para la app en lugar de
  usar root.


LICENCIA Y AVISOS LEGALES
-------------------------
El codigo se distribuye bajo licencia MIT (ver LICENSE). La marca y el
logotipo NO estan cubiertos por la licencia. Los terminos de uso, la
politica de privacidad, los avisos de terceros y la politica de
seguridad estan en TERMS.md, PRIVACY.md, NOTICE.md y SECURITY.md.

Los datos del restaurante viven solo en esta maquina: el autor del
software no tiene acceso a la base ni a los respaldos.


RESPALDO
--------
La base de datos vive en MySQL. Para respaldar:

      mysqldump -u USUARIO -p NOMBRE_DB > respaldo.sql

Restaurar:

      mysql -u USUARIO -p NOMBRE_DB < respaldo.sql


SOLUCION DE PROBLEMAS
---------------------
* "No se pudo conectar a MySQL":
    - Verifica que el servicio MySQL este iniciado (services.msc).
    - Revisa host/puerto/usuario/clave en server\\.env.
    - Confirma que el usuario tenga permiso sobre la base de datos.
* "Faltan las dependencias server\\node_modules":
    - El ZIP se extrajo incompleto. Vuelve a extraerlo por completo.
* El puerto 3002 esta ocupado:
    - El servidor buscara automaticamente otro puerto libre; revisa la
      URL que aparece en la ventana. Para fijarlo, edita PORT en
      server\\.env.
* La ventana se cierra inmediatamente:
    - Ejecuta start.bat desde una consola (cmd) para ver el error.


NOTAS TECNICAS
--------------
- Backend: Express + Prisma (MySQL 8, utf8mb4). Esquema via "prisma db push".
- El seed SOLO se ejecuta si la base esta vacia; nunca borra datos existentes.
- Los cambios de esquema futuros usan "prisma db push --accept-data-loss".
- Compatible con Windows 10/11 x64.
`;
}

const ENV_EXAMPLE = `# Servidor
PORT=3002
NODE_ENV=production

# Base de datos MySQL
DATABASE_URL="mysql://root:TU_CLAVE@localhost:3306/2arbolitos?schema=public"

# JWT
JWT_SECRET=cambia_este_secreto_por_uno_seguro
JWT_EXPIRES_IN=7d

# Frontend (para CORS)
FRONTEND_URL=http://localhost:3002
`;

async function writeExtras(staging) {
  const serverDir = path.join(staging, 'server');
  await fsp.mkdir(path.join(serverDir, 'scripts'), { recursive: true });
  await fsp.writeFile(path.join(serverDir, 'scripts', 'ptool.cjs'), PTool, 'utf8');
  await fsp.writeFile(path.join(serverDir, '.env.example'), ENV_EXAMPLE, 'utf8');
  await fsp.writeFile(path.join(staging, 'start.bat'), startBat(), 'utf8');
  await fsp.writeFile(path.join(staging, 'README-PORTABLE.txt'), readme(version), 'utf8');
}

/* ------------------------------------------------------------------ */
/* 5. Empaquetar en ZIP                                                */
/* ------------------------------------------------------------------ */
function zipDirectory(stagingParent, folderName, outZip) {
  if (fs.existsSync(outZip)) fs.rmSync(outZip, { force: true });
  log('Comprimiendo (puede tardar unos minutos)...');
  const res = spawnSync('tar', ['-a', '-c', '-f', outZip, folderName], {
    cwd: stagingParent,
    stdio: 'inherit',
  });
  if (res.status !== 0) fail('tar fallo al crear el ZIP.');
}

/* ------------------------------------------------------------------ */
/* main                                                                */
/* ------------------------------------------------------------------ */
async function main() {
  log(`2Arbolitos POS — empaquetado portable v${version}`);
  if (process.platform !== 'win32') {
    warn('Este empaquetador esta pensado para Windows. El resultado seguira siendo valido.');
  }

  ensureDist();

  fs.mkdirSync(RELEASE_DIR, { recursive: true });

  // Staging en ruta corta para evitar problemas de MAX_PATH en node_modules.
  const stagingParent = path.join(os.tmpdir(), 'arbolitos-pack');
  const staging = path.join(stagingParent, PACKAGE_NAME);
  await fsp.rm(stagingParent, { recursive: true, force: true }).catch(() => {});
  await fsp.mkdir(staging, { recursive: true });
  log(`Staging: ${staging}`);

  await preparePortableNode(staging);
  await copyDist(staging);
  await copyServer(staging);
  await copyPanel(staging);
  await copyLegal(staging);
  await writeVersionFiles(staging);
  await writeExtras(staging);

  const outZip = path.join(RELEASE_DIR, `${PACKAGE_NAME}.zip`);
  zipDirectory(stagingParent, PACKAGE_NAME, outZip);

  const sizeMb = (fs.statSync(outZip).size / 1024 / 1024).toFixed(1);
  log('----------------------------------------------');
  log(`ZIP listo: ${outZip}  (${sizeMb} MB)`);
  log('----------------------------------------------');

  await fsp.rm(stagingParent, { recursive: true, force: true }).catch(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
