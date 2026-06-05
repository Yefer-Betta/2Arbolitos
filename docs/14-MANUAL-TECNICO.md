# 14 — Manual Técnico

## 14.1 Stack Tecnológico Completo

| Capa | Tecnología | Versión | Uso |
|:-----|:-----------|:--------|:----|
| **Frontend Core** | React | 19.2.0 | UI declarativa |
| | Vite | 7.3.1 | Build tool + dev server |
| | Tailwind CSS | 4.1.18 | Estilos utility-first |
| | @vitejs/plugin-react | 5.1.1 | JSX + Fast Refresh |
| **Frontend Utils** | clsx | 2.1.1 | Conditional classes |
| | tailwind-merge | 3.4.0 | Merge sin conflictos |
| | lucide-react | 0.563.0 | Iconografía |
| **PWA** | vite-plugin-pwa | 1.2.0 | Service Worker |
| | workbox | (via vite-plugin-pwa) | SW runtime |
| **Backend** | Node.js | 18+ (tested 20) | Runtime |
| | Express | 4.22.1 | HTTP server |
| | @prisma/client | 5.22.0 | ORM |
| | prisma | 5.22.0 | Migrations + studio |
| | mysql2 | 3.14.1 | Driver nativo MySQL |
| | jsonwebtoken | 9.0.2 | JWT |
| | bcryptjs | 2.4.3 | Hashing passwords |
| | dotenv | 16.4.5 | Variables de entorno |
| | cors | 2.8.5 | CORS middleware |
| | bonjour-service | 1.3.0 | mDNS publisher |
| | qrcode | 1.5.4 | Generación QR |
| | xlsx | 0.18.5 | Exportación Excel (futuro) |
| **Desktop** | electron | 33.4.11 | App de escritorio |
| | electron-builder | 26.0.0 | Empaquetado |
| | sharp | 0.34.5 | Procesamiento de imagen |
| | to-ico | 1.1.5 | Generar .ico |
| **DevOps** | concurrently | 9.1.2 | Correr varios procesos |
| | docker | (externo) | Containerización |
| | GitHub Actions | (externo) | CI/CD |
| **Calidad** | eslint | 9.39.1 | Linter |
| | @eslint/js | 9.39.1 | Reglas base |
| | eslint-plugin-react-hooks | 7.0.1 | Reglas hooks |
| | eslint-plugin-react-refresh | 0.4.24 | Reglas HMR |
| **Testing** | (pendiente) | - | vitest/jest |

## 14.2 Estructura de Directorios

```
2Arbolitos/
├── .github/
│   └── workflows/
│       └── docker-build.yml         # CI build Docker
│
├── build/                           # Recursos para electron-builder
│   ├── icon.png                     # 1024×1024 PNG fuente
│   ├── icon.ico                     # Multi-size 16-256
│   └── tray.png                     # 64×64 bandeja
│
├── docs/                            # Documentación (este proyecto)
│   ├── 00-PORTADA.md
│   ├── 01-RESUMEN-EJECUTIVO.md
│   ├── ... (17 archivos)
│
├── electron/                        # Wrapper Electron
│   ├── main.js                      # Entry point
│   ├── preload.js                   # Bridge IPC
│   ├── tray.js                      # Bandeja del sistema
│   └── setup/
│       └── wizard.html              # Wizard de primera ejecución
│
├── logo/                            # Assets de marca
│   └── logo 1.png                   # Logo original 1408×768
│
├── public/                          # Assets servidos por Vite
│   ├── logo.png                     # Logo cream/green
│   ├── logo-light.png               # Logo blanco (sidebar oscuro)
│   ├── logo-dark.png                # Logo verde (fondo claro)
│   ├── icon.png                     # App icon
│   ├── pwa-192x192.png              # PWA icon medium
│   └── pwa-512x512.png              # PWA icon large
│
├── scripts/                         # Automatización
│   ├── cli.js                       # Menú interactivo
│   ├── generate-icons.js            # Genera iconos desde logo
│   ├── generate-logo-variants.js    # Variantes transparente
│   └── commands/
│       ├── install.js               # Setup inicial
│       ├── start-dev.js             # Dev mode
│       ├── start-prod.js            # PM2
│       ├── health.js                # Health check
│       ├── update.js                # Actualizar
│       └── create-shortcuts.js      # Accesos directos
│
├── server/                          # Backend Node.js
│   ├── prisma/
│   │   ├── schema.prisma            # Definición de modelos
│   │   └── seed.js                  # Datos iniciales
│   ├── src/
│   │   ├── index.js                 # Entry point + startServer()
│   │   ├── sse.js                   # Server-Sent Events hub
│   │   ├── config/
│   │   │   └── database.js          # Prisma client
│   │   ├── controllers/             # Lógica de negocio
│   │   │   ├── authController.js
│   │   │   ├── closureController.js
│   │   │   ├── expenseController.js
│   │   │   ├── index.js
│   │   │   ├── orderController.js
│   │   │   ├── productController.js
│   │   │   ├── settingsController.js
│   │   │   └── tableController.js
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT validation
│   │   └── routes/                  # Rutas REST
│   │       ├── auth.js
│   │       ├── closures.js
│   │       ├── expenses.js
│   │       ├── index.js
│   │       ├── orders.js
│   │       ├── products.js
│   │       ├── settings.js
│   │       └── tables.js
│   ├── .env                         # (no en git) Variables de entorno
│   └── package.json                 # (vacio, deps en raíz)
│
├── src/                             # Frontend React
│   ├── App.jsx                      # Root component
│   ├── main.jsx                     # ReactDOM.createRoot
│   ├── index.css                    # Tailwind + globals
│   ├── components/                  # 17 componentes
│   │   ├── CurrencySettings.jsx     # Shell de configuración
│   │   ├── Escandallo.jsx           # (legacy/recetas)
│   │   ├── Finance.jsx              # Cierre Z + gastos
│   │   ├── History.jsx              # Historial de órdenes
│   │   ├── KitchenView.jsx          # KDS tablero
│   │   ├── Layout.jsx               # Sidebar + header
│   │   ├── LoginScreen.jsx          # Autenticación
│   │   ├── MenuManager.jsx          # CRUD menú
│   │   ├── PedidosRouter.jsx        # Router de pedidos
│   │   ├── POS.jsx                  # Punto de venta
│   │   ├── SettingsDatos.jsx        # Sub-tab backup
│   │   ├── SettingsMovil.jsx        # Sub-tab QR
│   │   ├── SettingsNegocio.jsx      # Sub-tab general
│   │   ├── SettingsServidor.jsx     # Sub-tab sync
│   │   ├── SettingsTabs.jsx         # Sub-tab navigation
│   │   ├── Ticket.jsx               # Recibo
│   │   └── VistaMesas.jsx           # Mapa de mesas
│   ├── context/                     # React Context
│   │   ├── FinanceContext.jsx
│   │   ├── MenuContext.jsx
│   │   ├── OrdersContext.jsx        # Sync con versionado
│   │   ├── SettingsContext.jsx
│   │   ├── UserContext.jsx
│   │   └── UserManager.jsx
│   ├── lib/                         # Utilidades
│   │   ├── api.js                   # Cliente HTTP + syncManager
│   │   ├── syncManager.js           # fetchWithTimeout + retry
│   │   └── utils.js                 # Helpers (cn, formatPrice, etc.)
│   └── services/                    # (legacy)
│       ├── index.js
│       ├── menuService.js
│       └── orderService.js
│
├── .dockerignore
├── .env                             # (no en git) Root env
├── .env.example.docker
├── .gitignore
├── docker-compose.yml               # Producción
├── docker-compose.dev.yml           # Desarrollo
├── docker-entrypoint.sh
├── Dockerfile                       # Producción
├── Dockerfile.dev                   # Desarrollo
├── eslint.config.js
├── index.html                       # HTML raíz
├── package.json                     # Deps + scripts
├── package-lock.json
├── postcss.config.js
├── README.md                        # (raíz, breve)
├── tailwind.config.js
└── vite.config.js
```

## 14.3 Scripts npm

```json
{
  "dev": "vite --host",
  "api": "npm run start --prefix server",
  "dev:full": "concurrently -n vite,api -c cyan,magenta \"npm run dev\" \"npm run api\"",
  "build": "vite build",
  "lint": "eslint .",
  "preview": "vite preview --host",
  "start": "node scripts/cli.js",
  "setup": "node scripts/commands/install.js",
  "update": "node scripts/commands/update.js",
  "start:prod": "node scripts/commands/start-prod.js",
  "health": "node scripts/commands/health.js",
  "docker:up": "docker compose up -d",
  "docker:down": "docker compose down",
  "docker:dev": "docker compose -f docker-compose.dev.yml up",
  "docker:logs": "docker compose logs -f",
  "docker:seed": "docker compose exec -T app node server/prisma/seed.js",
  "docker:rebuild": "docker compose up -d --build",
  "electron": "electron .",
  "electron:dev": "concurrently -k \"npm run dev\" \"node -e setTimeout(()=>process.exit(),3000) && electron .\"",
  "electron:build": "vite build && electron-builder",
  "dist": "electron-builder"
}
```

### Uso Típico

```bash
# Setup inicial completo
npm install
npm run setup

# Desarrollo con hot-reload
npm run dev:full

# Verificar salud
npm run health

# Build para producción
npm run build

# Empaquetar como app de escritorio
npm run dist

# Docker
npm run docker:up
```

## 14.4 Variables de Entorno

### `server/.env`

```env
# Puerto del servidor
PORT=3002

# Entorno
NODE_ENV=development

# Base de datos MySQL
DATABASE_URL="mysql://root:password@localhost:3306/2arbolitos?schema=public&charset=utf8mb4"

# JWT
JWT_SECRET=tu_secreto_muy_largo_y_aleatorio
JWT_EXPIRES_IN=7d

# Frontend (CORS)
FRONTEND_URL=http://localhost:5173

# Indicador Docker (auto-detectado)
DOCKER=false
```

### `.env` (raíz, opcional para Docker)

```env
MYSQL_ROOT_PASSWORD=tu_password_seguro
JWT_SECRET=otro_secreto
```

## 14.5 Pipeline de Build

```mermaid
flowchart LR
    SOURCE[Código fuente] --> LINT[ESLint]
    LINT --> VITE[Vite Build]
    VITE --> DIST[dist/ optimizado]
    DIST --> SERVER[Express sirve estáticos]
    SOURCE --> ELECTRON[Electron Build]
    DIST --> ELECTRON
    SERVER --> ELECTRON
    ELECTRON --> WIN[Windows .exe NSIS]
    ELECTRON --> MAC[macOS .dmg]
    ELECTRON --> LINUX[Linux .AppImage / .deb]
```

## 14.6 Proceso de Desarrollo

### 14.6.1 Configuración Inicial

```bash
# 1. Clonar
git clone https://github.com/Yefer-Betta/2Arbolitos.git
cd 2Arbolitos

# 2. Instalar deps
npm install
cd server && npm install && cd ..

# 3. Crear BD y .env
# (ver docs/12-INSTALACION.md)

# 4. Prisma
cd server
npx prisma generate
npx prisma db push
node prisma/seed.js
cd ..
```

### 14.6.2 Desarrollo Iterativo

```bash
# Terminal 1: Vite (puerto 5173)
npm run dev

# Terminal 2: API (puerto 3002)
npm run api

# O ambos juntos:
npm run dev:full
```

Hot reload funciona para componentes React. Cambios en el backend requieren reinicio.

### 14.6.3 Estructura de un Componente Típico

```jsx
// src/components/MiComponente.jsx
import React, { useState, useEffect } from 'react';
import { useContext } from '../context/Contexto';
import { apiGet, apiPost } from '../lib/api';
import { SomeIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export function MiComponente({ prop1, prop2, onAction }) {
  const { data } = useContext();
  const [local, setLocal] = useState(null);
  
  useEffect(() => {
    apiGet('/endpoint').then(setLocal);
  }, []);
  
  return (
    <div className={cn("base-class", condition && "conditional-class")}>
      {/* UI */}
    </div>
  );
}
```

### 14.6.4 Agregar una Nueva Ruta API

```javascript
// 1. Crear/editar server/src/controllers/miController.js
export const miController = {
  async miAccion(req, res) {
    try {
      const result = await prisma.miModelo.findMany();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

// 2. Registrar en server/src/routes/index.js (o ruta específica)
import miController from '../controllers/miController.js';
router.get('/mi-endpoint', miController.miAccion);

// 3. Consumir en frontend
// src/lib/api.js ya tiene apiGet/apiPost
const data = await apiGet('/mi-endpoint');
```

### 14.6.5 Agregar un Nuevo Modelo Prisma

```prisma
// server/prisma/schema.prisma
model MiModelo {
  id        String   @id @default(uuid())
  campo     String
  createdAt DateTime @default(now())
  
  @@map("mi_modelo")
}
```

```bash
cd server
npx prisma generate
npx prisma db push
```

> ⚠️ `db push` modifica el esquema directamente. Para producción usar `prisma migrate dev` y commits de migraciones.

## 14.7 Sistema de Versionado y Conflict-Merge (Detalle)

### Cliente: `src/lib/syncManager.js`

```javascript
// fetchWithTimeout con AbortController
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Retry exponencial
async function withRetry(fn, maxRetries = 5, delays = [1000, 2000, 4000, 8000, 15000]) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, delays[i]));
    }
  }
}
```

### Servidor: `server/src/controllers/tableController.js`

```javascript
async updateState(req, res) {
  const { tableId, items, _clientVersion } = req.body;
  
  let current = await prisma.tableState.findUnique({ where: { tableId } });
  
  if (!current) {
    current = await prisma.tableState.create({
      data: { tableId, items: JSON.stringify(items), version: 0 }
    });
    notifySSEClients('table:updated', { tableId, items, version: 0 });
    return res.status(201).json({ version: 0 });
  }
  
  if (_clientVersion < current.version) {
    return res.status(409).json({
      conflict: true,
      serverData: JSON.parse(current.items),
      serverVersion: current.version
    });
  }
  
  const updated = await prisma.tableState.update({
    where: { tableId },
    data: {
      items: JSON.stringify(items),
      version: current.version + 1
    }
  });
  
  notifySSEClients('table:updated', { 
    tableId, 
    items, 
    version: updated.version 
  });
  
  return res.json({ version: updated.version });
}
```

## 14.8 Debugging

### 14.8.1 Logs del Servidor

El servidor usa `console.log`/`console.error` básico. En desarrollo se ven en la terminal. En producción con PM2:

```bash
pm2 logs 2arbolitos
pm2 logs 2arbolitos --lines 100
pm2 flush  # limpiar
```

### 14.8.2 DevTools del Navegador

- **Network**: ver requests HTTP, latencia, headers
- **Console**: errores JS
- **Application → Service Workers**: ver SW (debería estar vacío en Electron)
- **Application → Local Storage**: ver `activeTables`, `orders`, token JWT
- **Application → Cache Storage**: cache de VitePWA (limpiar si hay problemas)

### 14.8.3 Errores Comunes

| Error | Causa | Solución |
|:------|:------|:---------|
| `ECONNREFUSED 3306` | MySQL no corre | `net start mysql` |
| `JWT malformed` | Token corrupto | Limpiar localStorage, re-login |
| `CORS policy blocked` | Origen no permitido | Verificar IP en whitelist |
| `Prisma Client not generated` | Falta `prisma generate` | `cd server && npx prisma generate` |
| `EADDRINUSE :::3002` | Puerto ocupado | `lsof -i :3002` y matar proceso |

## 14.9 Performance y Optimización

### 14.9.1 Bundle Size

- **Frontend dist**: ~700 KB JS + ~50 KB CSS (gzipped)
- **Electron app**: ~189 MB (incluye Chromium y Node.js)
- **Server node_modules**: ~150 MB (en desarrollo, no se distribuye)

### 14.9.2 Optimizaciones Aplicadas

- ✅ Vite tree-shaking + minificación
- ✅ Tailwind CSS purge de clases no usadas
- ✅ React 19 con compilador optimizador (auto-memoización)
- ✅ Lazy loading de rutas (pendiente)
- ✅ Code splitting (pendiente)
- ✅ Service Worker para assets estáticos (PWA)

### 14.9.3 Optimizaciones Pendientes (Roadmap v2)

- [ ] React.lazy + Suspense para rutas
- [ ] Compresión gzip en Express
- [ ] CDN para assets estáticos
- [ ] Redis para caché de productos
- [ ] Índices adicionales en BD

## 14.10 Seguridad

### Implementado

- ✅ Passwords con bcrypt (10 rounds)
- ✅ JWT firmado HS256
- ✅ CORS whitelist
- ✅ Prisma queries parametrizadas (no SQL injection)
- ✅ React escapa JSX (no XSS)

### Pendiente (Roadmap v1.1)

- [ ] HTTPS para producción (Let's Encrypt + reverse proxy)
- [ ] CSP headers
- [ ] Rate limiting en login (express-rate-limit)
- [ ] Helmet middleware
- [ ] Audit log de operaciones críticas
- [ ] Encriptación de campos sensibles (teléfono, etc.)

## 14.11 Publicación y Distribución

### Build de Release

```bash
# 1. Limpiar
rm -rf dist release

# 2. Build
npm run build

# 3. Empaquetar (Windows, elevado)
npx electron-builder --win --dir  # sin instalador
npx electron-builder --win         # con instalador NSIS

# macOS
npx electron-builder --mac

# Linux
npx electron-builder --linux
```

### Archivos Generados

```
release/
├── 2Arbolitos POS Setup 1.0.0.exe       # Instalador NSIS (~189 MB)
├── 2Arbolitos POS Setup 1.0.0.exe.blockmap  # Para updates
├── win-unpacked/                        # Versión portable
│   ├── 2Arbolitos POS.exe
│   ├── resources/
│   │   ├── app.asar                     # Bundle de la app
│   │   └── app.asar.unpacked/           # Prisma engine
│   ├── locales/                         # Chromium locales
│   └── ...
├── latest.yml                           # Update metadata
└── builder-effective-config.yaml        # Config usada
```

### Auto-Update (No implementado aún)

Para v2: usar `electron-updater` con feed desde GitHub Releases.

## 14.12 Comandos Útiles

```bash
# Limpiar caches
rm -rf node_modules server/node_modules dist release
npm install && cd server && npm install && cd ..

# Resetear Prisma
cd server
npx prisma migrate reset
npx prisma db push
node prisma/seed.js

# Regenerar iconos
node scripts/generate-icons.js
node scripts/generate-logo-variants.js

# Logs detallados
DEBUG=* npm run dev

# Probar build sin empaquetar
npm run build && npx serve dist

# Inspeccionar bundle
npx vite-bundle-visualizer
```

## 14.13 Conclusión

El sistema 2Arbolitos está construido con un stack moderno y mantenible. La separación clara entre frontend (React), backend (Express), datos (Prisma+MySQL) y distribución (Electron) permite:

- **Desarrollo independiente** de cada capa
- **Testing aislado** de funcionalidades
- **Deployment flexible** (servidor standalone, Docker, Electron)
- **Escalabilidad gradual** según necesidades

El manual técnico es **vivo**: debe actualizarse cuando se agreguen nuevos componentes, rutas, o cambien los procedimientos de build.
