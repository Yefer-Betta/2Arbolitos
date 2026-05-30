import { Tray, Menu, app, nativeImage, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export function createTray(mainWindow, port) {
  const iconPath = path.join(__dirname, '..', 'public', 'vite.svg');
  const icon = nativeImage.createFromPath(iconPath);
  const tray = new Tray(icon.resize({ width: 22, height: 22 }));

  const ip = getLocalIP();

  const updateMenu = () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Abrir 2Arbolitos',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        },
      },
      { type: 'separator' },
      {
        label: `🌐 Puerto: ${port}`,
        enabled: false,
      },
      {
        label: `🌍 IP: ${ip}`,
        enabled: false,
      },
      {
        label: '📱 Abrir QR',
        click: () => {
          shell.openExternal(`http://localhost:${port}/qr`);
        },
      },
      { type: 'separator' },
      {
        label: 'Iniciar con el sistema',
        type: 'checkbox',
        checked: false,
        click: async (item) => {
          const { execSync } = await import('child_process');
          try {
            if (item.checked) {
              if (process.platform === 'win32') {
                execSync('npx pm2-startup install', { stdio: 'pipe', timeout: 30000 });
              } else {
                execSync('npx pm2 startup', { stdio: 'pipe', timeout: 30000 });
              }
            } else {
              if (process.platform === 'win32') {
                execSync('npx pm2-startup uninstall', { stdio: 'pipe', timeout: 30000 });
              } else {
                execSync('npx pm2 unstartup', { stdio: 'pipe', timeout: 30000 });
              }
            }
          } catch {}
        },
      },
      { type: 'separator' },
      {
        label: 'Cerrar 2Arbolitos',
        click: async () => {
          app.isQuitting = true;
          try {
            const { stopServer } = await import('../server/src/index.js');
            await stopServer();
          } catch {}
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(contextMenu);
  };

  updateMenu();
  tray.setToolTip(`2Arbolitos POS - Puerto ${port}`);

  tray.on('double-click', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  return tray;
}
