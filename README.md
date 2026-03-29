# 2Arbolitos - Sistema POS

Sistema de Punto de Venta (POS) para restaurantes con gestión de pedidos, cocina, finanzas y más.

## Estructura

```
2Arbolitos/
├── backend/          # API Server (Express + Prisma + MySQL)
│   └── src/
│       ├── index.js  # Servidor principal
│       ├── routes/   # Endpoints API
│       └── db/       # Cliente Prisma
│
├── frontend/         # Aplicación Web (React + Vite)
│   └── src/
│       ├── components/  # Componentes React
│       ├── context/     # Estado global
│       └── lib/         # Utilidades (API)
│
└── package.json      # Scripts de inicio
```

## Inicio Rápido

### Requisitos

- Node.js 18+
- MySQL 8.0+

### Instalación

```bash
# Instalar dependencias de ambos
npm run install:all

# O individualmente:
cd backend && npm install
cd frontend && npm install
```

### Desarrollo

```bash
# Iniciar ambos (backend + frontend)
npm run dev

# Solo backend (puerto 3001)
npm run dev:backend

# Solo frontend (puerto 5173)
npm run dev:frontend
```

### Producción

```bash
# Build del frontend
npm run build

# Iniciar servidor (sirve frontend estático en puerto 3001)
npm start
```

## Puertos

| Servicio | Puerto | URL |
|----------|--------|-----|
| API | 3001 | http://localhost:3001 |
| Frontend Dev | 5173 | http://localhost:5173 |
| Frontend Prod | 3001 | http://localhost:3001 |

## Usuarios por defecto

- Admin: `admin` / `123`
- Mesero: `mesero` / `123`
- Cocina: `cocina` / `123`

## Características

- Gestión de pedidos y mesas
- Vista de cocina en tiempo real
- Control de inventario y escandallos
- Reportes financieros y cierre de día
- Sistema de backup/restauración
- Aplicación progresiva (PWA)
- Sincronización en tiempo real con base de datos

## Tecnologías

- **Frontend:** React 19, Vite, TailwindCSS, PWA
- **Backend:** Express, Prisma, MySQL
- **Herramientas:** ESLint, Prettier

## Licencia

MIT
