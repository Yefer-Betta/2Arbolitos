# 2Arbolitos — Sistema POS

Sistema de punto de venta para restaurantes: pedidos por mesa, **para llevar**, cocina, finanzas, historial e informes. Incluye API en Node.js con Prisma/MySQL y cliente web en React (Vite), con sincronización entre equipos en la misma red.

## Estructura del proyecto

```
2Arbolitos/
├── src/                 # Frontend React (Vite, Tailwind)
│   ├── components/
│   ├── context/
│   └── lib/               # API cliente, syncManager, IndexedDB
├── server/                # API Express + Prisma
│   ├── src/
│   │   ├── routes/
│   │   └── controllers/
│   └── prisma/
├── package.json           # Scripts: dev, api, dev:full
├── vite.config.js         # Proxy /api → API local
├── INSTALAR.bat           # Windows: instalación guiada (MySQL, Prisma, build)
└── INICIAR_TODO.bat       # Windows: deps, .env, Vite + API, navegador
```

## Requisitos

- **Node.js** 18 o superior (LTS recomendado)
- **MySQL** 8 (o compatible) en ejecución antes de arrancar el API

## Instalación

### Windows (recomendado)

1. Inicia MySQL (XAMPP, WAMP o servicio local).
2. Ejecuta **`INSTALAR.bat`** en la raíz del proyecto (instala dependencias, crea `server/.env`, base de datos Prisma, build del frontend).

### Manual

```bash
# Raíz del proyecto
npm install

cd server
npm install
copy .env.example .env   # Windows; en Linux/Mac: cp .env.example .env
# Edita server/.env: DATABASE_URL, PORT (por defecto 3002), JWT_SECRET

npx prisma generate
npx prisma db push
node prisma/seed.js       # opcional: usuarios de ejemplo

cd ..
npm run build             # opcional: producción
```

## Desarrollo

El frontend en desarrollo usa **Vite** (puerto **5173**) y reenvía `/api` al backend. El puerto del API se define en **`server/.env`** (`PORT`, por defecto **3002**). Si creas un `.env` en la raíz con `VITE_API_PROXY_TARGET`, Vite usará esa URL para el proxy; si no, se deduce el puerto desde `server/.env` (ver `vite.config.js`).

```bash
# Opción 1 — una sola terminal (Vite + API)
npm run dev:full

# Opción 2 — dos terminales
npm run api          # solo backend
npm run dev          # solo Vite (host 0.0.0.0 para red local)
```

### Windows — inicio guiado

Doble clic en **`INICIAR_TODO.bat`** (o `INICIAR_SISTEMA.bat` / `iniciar-2arbolitos.bat`): instala dependencias si faltan, prepara `server/.env` desde el ejemplo, genera `.env` en la raíz para el proxy si no existe, abre **`npm run dev:full`** en otra ventana y el navegador en `http://localhost:5173`.

**Importante:** si el API no conecta a MySQL, no escuchará el puerto y verás errores de proxy en Vite hasta que la base de datos esté disponible.

## Producción

Tras `npm run build`, el despliegue depende de tu hosting. El servidor Express vive en `server/`; configura `PORT`, `DATABASE_URL` y sirve el build estático según tu configuración.

## Puertos habituales

| Servicio        | Puerto por defecto | URL local                    |
|-----------------|--------------------|------------------------------|
| API (Express)   | 3002               | `http://localhost:3002`      |
| Frontend (Vite) | 5173               | `http://localhost:5173`      |

En la WiFi, otros dispositivos usan `http://<IP-de-esta-PC>:5173` (misma red que el PC servidor).

## Usuarios por defecto (tras `seed`)

| Rol    | Usuario | Contraseña |
|--------|---------|------------|
| Admin  | admin   | admin123   |
| Mesero | mesero  | waiter123  |
| Cocina | cocina  | cook123    |

## Características

- Pedidos por mesa y **pedido para llevar**
- Menú, cocina y vistas operativas
- Finanzas, cierres e historial
- Sincronización cliente–servidor (API + cola offline donde aplique)
- PWA (Vite PWA)

## Tecnologías

- **Frontend:** React 19, Vite 7, Tailwind CSS 4, PWA
- **Backend:** Node.js, Express, Prisma, MySQL
- **Herramientas:** ESLint, `concurrently` (dev)

## Licencia

MIT
