import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/database.js';
import routes from './routes/index.js';

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
  return 'localhost';
}

const app = express();
const PORT = process.env.PORT || 3002;

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
    ];
    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

// Servir el frontend en producción (React/Vite construido)
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath));

// Fallback para React Router (cualquier ruta que no sea de API devuelve index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor',
  });
});

async function startServer() {
  await connectDB();
  
  const localIP = getLocalIP();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🏪 Servidor 2Arbolitos API                          ║
║                                                       ║
║   🌐 Local:     http://localhost:${PORT}               ║
║   🌐 Red:       http://${localIP}:${PORT}               ║
║   📚 API Docs:  http://${localIP}:${PORT}/api          ║
║                                                       ║
║   📋 COPIAR Y PEGAR EN NAVEGADOR DE OTROS DISPOSITIVOS:
║   http://${localIP}:5173                               ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);
  });
}

startServer().catch(console.error);
