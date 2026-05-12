# 🌳 2Arbolitos — Sistema POS y Gestión de Restaurante

![2Arbolitos Cover](https://via.placeholder.com/1200x300/1A4D2E/FFFFFF?text=2Arbolitos+POS+System)

Sistema avanzado de Punto de Venta (POS) y gestión operativa para restaurantes. Diseñado con una interfaz moderna y táctil para agilizar la toma de pedidos, gestionar el salón, coordinar la cocina y mantener el control financiero del establecimiento. Incluye arquitectura robusta Cliente-Servidor con base de datos real (MySQL).

---

## ✨ Características Principales

*   🛒 **Punto de Venta (POS):** Interfaz ágil e intuitiva (tipo tablet/desktop) para la toma de pedidos rápidos.
*   🍽️ **Gestión de Órdenes:** Soporte para pedidos por **Mesa**, **Para Llevar** y **Domicilio**.
*   🪑 **Vista de Mesas (Table Map):** Monitoreo visual del estado de las mesas en tiempo real (Libre, Ocupada, Tiempo de atención).
*   🧑‍🍳 **Kitchen Display System (KDS):** Tablero tipo Kanban en tiempo real para la cocina. Visualiza preparaciones (Pendientes, En Preparación, Listas) mediante WebSockets / Polling.
*   💵 **Multi-moneda:** Cobros, cálculo de vueltos e informes duales en Pesos Colombianos (COP) y Dólares (USD), con tasa de cambio ajustable.
*   📊 **Finanzas y Cierres:** Reportes de cierre de caja (End of Day), control de gastos operativos e historial completo de ventas.
*   🔒 **Roles de Usuario Autenticados:** Sistema seguro con login y permisos restringidos (Admin, Cajero, Mesero, Cocina).

## 🛠️ Tecnologías

### Frontend (Cliente)
*   **React 19** + **Vite 7**
*   **Tailwind CSS 4** para un diseño moderno y responsivo
*   **Lucide React** para iconografía y **Axios** para consumo de API.

### Backend (API Servidor)
*   **Node.js** con **Express.js**
*   **Prisma ORM** para el modelado, validaciones y tipado de base de datos.
*   **MySQL 8+** como motor de base de datos relacional.
*   **JWT** para autenticación segura.
*   **PM2** para gestión de procesos y despliegue a prueba de fallos.

---

## 📂 Estructura del Proyecto

```text
2Arbolitos/
├── src/                 # Frontend React (Vite, Tailwind, Componentes)
├── server/              # API Express + Prisma (Controladores, Rutas)
├── scripts/             # Scripts modulares de automatización (.bat)
├── PANEL_DE_CONTROL.bat # Asistente unificado de comandos para Windows
├── package.json         # Scripts principales (dev, api, dev:full)
└── ...
```

---

## 🚀 Instalación y Despliegue (Windows)

### Requisitos Previos
*   **Node.js** v18 o superior.
*   **MySQL** v8.0+ instalado y en ejecución (XAMPP, WAMP, o nativo).

### Instalación Rápida Asistida

El sistema incluye herramientas automatizadas para que la instalación y administración en un entorno Windows sea sumamente sencilla:

1. Asegúrate de tener el servicio MySQL corriendo.
2. Haz doble clic en el archivo raíz **`PANEL_DE_CONTROL.bat`**.
3. En el menú, selecciona **`1. Instalar Sistema por Primera Vez`**. 
   - El script preparará entornos, instalará dependencias npm del cliente y del servidor, creará la base de datos `2arbolitos`, empujará los schemas (Prisma db push) y agregará los usuarios iniciales (seed).

### Iniciar el Sistema

Desde el mismo `PANEL_DE_CONTROL.bat` puedes arrancar el sistema:

*   **Opción 2 (Producción):** Configura y arranca el ecosistema usando `PM2`. Ambos servicios (Frontend y Backend) correrán en segundo plano de manera estable, y el sistema se iniciará al encender el PC (opcional según PM2 startup).
*   **Opción 4 (Desarrollo):** Ejecuta de forma visible en consola mediante `npm run dev:full` con hot-reloading (ideal para programar).

---

## 💻 Desarrollo (Instalación Manual Unix/Mac/Windows)

```bash
# 1. Instalar dependencias del Frontend
npm install

# 2. Instalar dependencias del Backend
cd server
npm install

# 3. Configurar Entorno (.env)
cp .env.example .env
# Edita server/.env y ajusta DATABASE_URL según credenciales locales

# 4. Configurar Base de Datos
npx prisma generate
npx prisma db push
node prisma/seed.js # Crea usuarios y configuraciones por defecto

# 5. Volver a la raíz y correr (Modo Dev Concurrente)
cd ..
npm run dev:full
```

*   **Frontend (Vite):** `http://localhost:5173`
*   **Backend (API):** `http://localhost:3001` (Ajustable en `.env`)

---

## 🔐 Usuarios de Prueba Generados (Seed)

| Rol | Usuario (Username) | Contraseña |
| :--- | :--- | :--- |
| **Administrador** | `admin` | `admin123` |
| **Mesero** | `mesero` | `waiter123` |
| **Cocina** | `cocina` | `cook123` |

*(Se recomienda encarecidamente cambiar estas credenciales en un entorno de producción real, desde el módulo de configuración o en la BD directamente).*

---

**Licencia:** MIT
