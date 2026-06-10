import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import os from 'os';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/database.js';
import { PrismaClient } from '@prisma/client';
import routes from './routes/index.js';
import QRCode from 'qrcode';
import { addSSEClient, removeSSEClient, notifySSEClients } from './sse.js';
import { initScheduler } from './scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

export function getLocalIP() {
  if (process.env.HOST_IP && process.env.HOST_IP !== '0.0.0.0') {
    return process.env.HOST_IP;
  }
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

function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findFreePort(startPort + 1));
    });
  });
}

let app;
let serverInstance;

export async function startServer(usePort) {
  app = express();
  const PORT = usePort || await findFreePort(parseInt(process.env.PORT) || 3002);

  await connectDB();

  const localIP = getLocalIP();
  const serverUrl = `http://${localIP}:${PORT}`;

  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '';
  const extraPatterns = allowedOriginsEnv
    .split(',')
    .filter(Boolean)
    .map(o => new RegExp(o.trim()));
  app.use(cors({
    origin: function(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      const allowedPatterns = [
        /^http:\/\/localhost(:\d+)?$/,
        /^http:\/\/127\.0\.0\.1(:\d+)?$/,
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/,
        /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/,
        ...extraPatterns,
      ];
      const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/settings/qr', async (req, res) => {
    const url = `http://${getLocalIP()}:${PORT}`;
    try {
      const qrSvg = await QRCode.toString(url, { type: 'svg', width: 300, margin: 1 });
      res.json({ url, qrSvg });
    } catch {
      res.status(500).json({ error: 'Error generando QR' });
    }
  });

  app.use('/api', routes);

  // QR code page
  app.get('/qr', async (req, res) => {
    const url = `http://${getLocalIP()}:${PORT}`;
    try {
      const qrSvg = await QRCode.toString(url, { type: 'svg', width: 400, margin: 2 });
      res.type('text/html').send(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>2Arbolitos - Acceso</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#1A4D2E;min-height:100vh;display:flex;justify-content:center;align-items:center}
.card{background:white;border-radius:24px;padding:2rem;text-align:center;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.3)}
h1{color:#1A4D2E;font-size:1.5rem;margin-bottom:0.5rem}
.sub{color:#D4A373;font-weight:600;margin-bottom:1.5rem}
.qr{background:#f5f5f5;padding:1rem;border-radius:16px;display:inline-block}
.qr svg{display:block;width:280px;height:280px;max-width:80vw;max-height:80vw}
.url{color:#666;font-size:0.9rem;margin-top:1rem;word-break:break-all}
.hint{color:#999;font-size:0.8rem;margin-top:0.5rem}
</style></head>
<body><div class="card">
<h1>🔗 2Arbolitos POS</h1>
<p class="sub">Escanea para abrir en tu dispositivo</p>
<div class="qr">${qrSvg}</div>
<p class="url">${url}</p>
<p class="hint">Conéctate a la misma red WiFi</p>
</div></body></html>`);
    } catch {
      res.status(500).send('Error generando QR');
    }
  });

  app.get('/api/events', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const heartbeat = setInterval(() => {
      res.write(':\n\n');
    }, 30000);

    const clientId = Date.now();
    addSSEClient(clientId, res);

    req.on('close', () => {
      clearInterval(heartbeat);
      removeSSEClient(clientId);
    });
  });

  const distPath = path.join(__dirname, '../../dist');
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Error interno del servidor',
    });
  });

  return new Promise((resolve, reject) => {
    serverInstance = app.listen(PORT, '0.0.0.0', async () => {
      try {
        const { default: Bonjour } = await import('bonjour-service');
        const bonjour = new Bonjour();
        bonjour.publish({
          name: '2Arbolitos POS',
          type: 'http',
          port: PORT,
          txt: { url: serverUrl },
        });
      } catch {}

      initScheduler();

      console.log(`\n🏪 Servidor 2Arbolitos corriendo en puerto ${PORT}`);
      console.log(`   Local:    http://localhost:${PORT}`);
      console.log(`   Red:      ${serverUrl}`);
      console.log(`   QR:       http://localhost:${PORT}/qr\n`);

      try {
        const qr = await QRCode.toString(serverUrl, { type: 'terminal', small: true });
        console.log(qr);
      } catch {}

      if (process.env.DOCKER !== 'true') {
        try {
          const autoStart = await prisma.settings.findUnique({ where: { key: 'autoStart' } });
          if (autoStart && autoStart.value === 'true') {
            const platform = os.platform();
            const { execSync } = await import('child_process');
            try {
              execSync(
                platform === 'win32' ? 'npx pm2-startup install' : 'npx pm2 startup',
                { stdio: 'pipe', timeout: 15000 }
              );
            } catch {}
          }
        } catch {}
      }

      resolve(PORT);
    });
    serverInstance.on('error', reject);
  });
}

export function stopServer() {
  return new Promise((resolve) => {
    if (serverInstance) {
      serverInstance.close(() => resolve());
    } else {
      resolve();
    }
  });
}

const isMainModule = process.argv[1] && (
  path.resolve(process.argv[1]) === path.resolve(__filename)
);
if (isMainModule) {
  startServer().catch(console.error);
}
