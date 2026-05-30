import { app, BrowserWindow, Tray, Menu, ipcMain, dialog, nativeImage } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTray } from './tray.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let mainWindow = null;
let tray = null;
let serverPort = null;

function createMainWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(ROOT, 'public', 'vite.svg'),
    title: '2Arbolitos POS',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.loadURL(`http://localhost:${port}`);
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

async function ensureDist() {
  const fs = await import('fs');
  const distPath = path.join(ROOT, 'dist', 'index.html');
  if (!fs.existsSync(distPath)) {
    const { execSync } = await import('child_process');
    execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
  }
}

app.whenReady().then(async () => {
  const fs = await import('fs');
  const serverEnv = path.join(ROOT, 'server', '.env');
  const isFirstRun = !fs.existsSync(serverEnv);

  if (isFirstRun) {
    const setupWin = new BrowserWindow({
      width: 680,
      height: 640,
      resizable: false,
      frame: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    ipcMain.handle('get-system-info', async () => {
      const os = await import('os');
      return {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        memory: os.totalmem(),
        freeMemory: os.freemem(),
        hostname: os.hostname(),
      };
    });

    ipcMain.handle('finish-setup', async () => {
      setupWin.close();
      await ensureDist();
      const { startServer } = await import('../server/src/index.js');
      serverPort = await startServer();
      createMainWindow(serverPort);
      tray = createTray(mainWindow, serverPort);
    });

    ipcMain.handle('cancel-setup', () => {
      app.quit();
    });

    ipcMain.handle('run-setup', async (_, step, data) => {
      try {
        switch (step) {
          case 'check-system': {
            const { execSync } = await import('child_process');
            const results = [];
            try {
              const nodeVer = execSync('node --version', { encoding: 'utf8' }).trim();
              results.push({ icon: 'check', text: `Node.js ${nodeVer}` });
            } catch {
              results.push({ icon: 'error', text: 'Node.js no detectado' });
              return { error: 'Node.js no está instalado' };
            }
            try {
              execSync('mysql --version', { encoding: 'utf8', stdio: 'pipe' });
              results.push({ icon: 'check', text: 'MySQL cliente detectado' });
            } catch {
              results.push({ icon: 'warn', text: 'MySQL cliente no encontrado en PATH' });
            }
            const mysqlOk = await testMySQL(data?.dbHost || 'localhost', data?.dbUser || 'root', data?.dbPass || '', data?.dbPort || 3306);
            if (mysqlOk) {
              results.push({ icon: 'check', text: 'MySQL conectado correctamente' });
            } else {
              results.push({ icon: 'error', text: 'No se pudo conectar a MySQL. Verifica que el servicio esté corriendo.' });
              return { error: 'Conexión MySQL fallida', results };
            }
            return { ok: true, results };
          }
          case 'create-db': {
            const ok = await testMySQL(data?.dbHost || 'localhost', data?.dbUser || 'root', data?.dbPass || '', data?.dbPort || 3306);
            if (!ok) return { error: 'No se puede conectar a MySQL' };
            const { default: mysql } = await import('mysql2/promise');
            const conn = await mysql.createConnection({
              host: data?.dbHost || 'localhost',
              user: data?.dbUser || 'root',
              password: data?.dbPass || '',
              port: parseInt(data?.dbPort) || 3306,
            });
            await conn.query('CREATE DATABASE IF NOT EXISTS `2arbolitos` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
            await conn.end();
            return { ok: true };
          }
          case 'write-env': {
            const dbUrl = `mysql://${data.dbUser}${data.dbPass ? `:${data.dbPass}` : ''}@${data.dbHost}:${data.dbPort}/2arbolitos?schema=public&charset=utf8mb4`;
            const envContent = `# Servidor
PORT=3002
NODE_ENV=development

# Base de datos MySQL
DATABASE_URL="${dbUrl}"

# JWT
JWT_SECRET=2arbolitos_jwt_secret_${Date.now()}
JWT_EXPIRES_IN=7d

# Frontend (para CORS)
FRONTEND_URL=http://localhost:5173
`;
            fs.writeFileSync(serverEnv, envContent, 'utf8');
            return { ok: true };
          }
          case 'install-deps': {
            const { execSync } = await import('child_process');
            execSync('npm install', { cwd: path.join(ROOT, 'server'), stdio: 'pipe' });
            execSync('npm install', { cwd: ROOT, stdio: 'pipe' });
            return { ok: true };
          }
          case 'setup-prisma': {
            const { execSync } = await import('child_process');
            execSync('npx prisma generate', { cwd: path.join(ROOT, 'server'), stdio: 'pipe' });
            execSync('npx prisma db push', { cwd: path.join(ROOT, 'server'), stdio: 'pipe' });
            return { ok: true };
          }
          case 'seed': {
            const { execSync } = await import('child_process');
            try {
              execSync('node prisma/seed.js', { cwd: path.join(ROOT, 'server'), stdio: 'pipe' });
            } catch {}
            return { ok: true };
          }
          default:
            return { error: `Paso desconocido: ${step}` };
        }
      } catch (e) {
        return { error: e.message };
      }
    });

    setupWin.loadFile(path.join(__dirname, 'setup', 'wizard.html'));
  } else {
    await ensureDist();
    const { startServer } = await import('../server/src/index.js');
    serverPort = await startServer();
    createMainWindow(serverPort);
    tray = createTray(mainWindow, serverPort);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

async function testMySQL(host, user, password, port) {
  try {
    const { default: mysql } = await import('mysql2/promise');
    const conn = await mysql.createConnection({ host, user, password, port, connectTimeout: 5000 });
    await conn.end();
    return true;
  } catch {
    return false;
  }
}
