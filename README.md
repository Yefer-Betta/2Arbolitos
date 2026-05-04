# 🌳 2Arbolitos — Sistema POS y Gestión de Restaurante

![2Arbolitos Cover](https://via.placeholder.com/1200x300/1A4D2E/FFFFFF?text=2Arbolitos+POS+System)

Sistema avanzado de Punto de Venta (POS) y gestión operativa para restaurantes. Diseñado con una interfaz moderna y táctil para agilizar la toma de pedidos, gestionar el salón, coordinar la cocina y mantener el control financiero del establecimiento. Incluye soporte multi-moneda (COP/USD) y un potente backend.

---

## ✨ Características Principales

*   🛒 **Punto de Venta (POS):** Interfaz ágil e intuitiva (tipo tablet/desktop) para la toma de pedidos rápidos.
*   🍽️ **Gestión de Órdenes:** Soporte para pedidos por **Mesa**, **Para Llevar** y **Domicilio**.
*   🪑 **Vista de Mesas (Table Map):** Monitoreo visual del estado de las mesas en tiempo real (Libre, Ocupada, Tiempo de atención).
*   🧑‍🍳 **Kitchen Display System (KDS):** Tablero tipo Kanban en tiempo real para que la cocina visualice y gestione el estado de las preparaciones (Pendientes, En Preparación, Listos).
*   💵 **Multi-moneda:** Cobros, cálculo de vueltos e informes duales en Pesos Colombianos (COP) y Dólares (USD), con tasa de cambio ajustable.
*   📊 **Finanzas y Cierres:** Reportes de cierre de caja (End of Day), control de gastos operativos e historial completo de ventas.
*   🍔 **Gestión de Menú y Escandallos:** Administrador de productos, categorías, y visualización de costos (recetas/escandallos).
*   📱 **PWA Ready:** Sincronización cliente-servidor eficiente y optimización PWA.

## 🛠️ Tecnologías

### Frontend (Cliente)
*   **React 19** + **Vite 7**
*   **Tailwind CSS 4** para un diseño moderno y responsivo
*   **Lucide React** para iconografía
*   **PWA** (Vite PWA Plugin)

### Backend (API)
*   **Node.js** con **Express.js**
*   **Prisma ORM** para el modelado y acceso a datos
*   **MySQL 8** como base de datos relacional principal
*   **JWT** para autenticación basada en roles (Admin, Cajero, Mesero, Cocina)

---

## 📂 Estructura del Proyecto

```text
2Arbolitos/
├── src/                 # Frontend React (Vite, Tailwind)
│   ├── components/      # Vistas principales (POS, KDS, Finanzas, etc.)
│   ├── context/         # Estado global (Auth, Configuración)
│   └── lib/             # Lógica cliente, syncManager
├── server/              # API Express + Prisma
│   ├── src/
│   │   ├── routes/      # Endpoints (Orders, Products, Auth, etc.)
│   │   └── controllers/ # Lógica de negocio
│   └── prisma/          # Esquema de DB (schema.prisma)
├── package.json         # Scripts principales (dev, api, dev:full)
├── INSTALAR.bat         # Windows: Instalación automática y DB setup
└── INICIAR_TODO.bat     # Windows: Arranque de Frontend + Backend
```

---

## 🚀 Instalación y Despliegue Local

### Requisitos Previos
*   **Node.js** v18 o superior.
*   **MySQL** v8.0+ en ejecución (puede ser XAMPP, WAMP o Docker).

### Instalación Rápida (Windows)
1. Asegúrate de tener MySQL corriendo.
2. Haz doble clic en el archivo **`INSTALAR.bat`**. Esto instalará todas las dependencias, creará la base de datos, aplicará las migraciones y generará los archivos `.env` necesarios.

### Instalación Manual (Linux / Mac / Windows)

```bash
# 1. Instalar dependencias del Frontend
npm install

# 2. Instalar dependencias del Backend
cd server
npm install

# 3. Configurar Entorno
cp .env.example .env
# -> Edita server/.env y ajusta DATABASE_URL y PORT si es necesario.

# 4. Configurar Base de Datos
npx prisma generate
npx prisma db push
node prisma/seed.js # Crea usuarios por defecto y configuración inicial

# 5. Volver a la raíz
cd ..
```

---

## 💻 Desarrollo y Ejecución

Puedes levantar todo el sistema de manera unificada o por separado.

### Opción 1: Todo junto (Recomendado)
```bash
npm run dev:full
```
*Inicia tanto el servidor Vite (Frontend) como el servidor Express (Backend API).*

### Opción 2: Terminales separadas
**Terminal 1 (Backend):**
```bash
npm run api
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

### Puertos por defecto:
*   **Frontend (Vite):** `http://localhost:5173`
*   **Backend (API):** `http://localhost:3001` (Ajustable en `.env`)

---

## 🔐 Usuarios de Prueba (tras ejecutar el Seed)

| Rol | Usuario | Contraseña |
| :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` |
| **Mesero** | `mesero` | `waiter123` |
| **Cocina** | `cocina` | `cook123` |

---

## 🌐 Despliegue a Producción
Para desplegar la aplicación en un VPS o plataforma Cloud:
1. Compila el frontend: `npm run build`
2. Sirve la carpeta `/dist` generada junto con tu servidor Express (o en un CDN/Vercel apuntando al backend).
3. Asegúrate de configurar correctamente `DATABASE_URL`, `JWT_SECRET` y el puerto en tus variables de entorno del servidor.

---

**Licencia:** MIT
