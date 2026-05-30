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
├── scripts/             # Scripts de automatización cross-platform (Node.js)
│   ├── cli.js           # Menú interactivo principal
│   └── commands/        # Comandos individuales
├── PANEL_DE_CONTROL.bat # Atajo para Windows (llama a scripts/cli.js)
├── package.json         # Scripts principales (start, setup, dev, dev:full)
└── ...
```

---

## 🚀 Instalación y Despliegue (Windows / macOS / Linux)

### Requisitos Previos
*   **Node.js** v18 o superior.
*   **MySQL** v8.0+ instalado y en ejecución.

### Instalación Rápida Asistida (recomendada)

El sistema incluye un asistente interactivo multiplataforma. Solo ejecuta:

```bash
npm start
```

Esto abre el menú interactivo donde puedes elegir:

1. **Instalar Sistema por Primera Vez** — Te guía paso a paso: configura MySQL, instala dependencias, crea la base de datos, pobla datos de ejemplo y construye el frontend.
2. **Iniciar en Producción (PM2)** — Configura PM2 como servicio del sistema (systemd en Linux, launchd en macOS, servicio de Windows).
3. **Actualizar Código y Reiniciar** — Reconstruye el frontend y reinicia el servidor.
4. **Iniciar en Modo Desarrollo** — Arranca Vite + API con hot-reloading.

O puedes ejecutar comandos individuales directamente:

```bash
npm run setup      # Instalación completa
npm run dev:full   # Modo desarrollo (Vite + API)
npm run start:prod # Configurar producción con PM2
npm run update     # Actualizar y reiniciar
```

### Instalación Manual (avanzada)

```bash
# 1. Instalar dependencias del Frontend
npm install

# 2. Instalar dependencias del Backend
cd server
npm install

# 3. Crear base de datos MySQL
mysql -u root -e "CREATE DATABASE IF NOT EXISTS \`2arbolitos\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

# 4. Configurar Entorno (.env)
cd ..
cp server/.env.example server/.env 2>/dev/null || echo "Crea server/.env manualmente"
# Edita server/.env y ajusta DATABASE_URL según credenciales locales

# 5. Configurar Base de Datos con Prisma
npx prisma generate
npx prisma db push
node prisma/seed.js # Crea usuarios y configuraciones por defecto

# 6. Construir frontend
npm run build

# 7. Iniciar
npm run dev:full
```

*   **Frontend (Vite):** `http://localhost:5173`
*   **Backend (API):** `http://localhost:3002` (ajustable en server/.env)

### Windows: Atajo de Doble Click

En Windows puedes hacer doble clic en **`PANEL_DE_CONTROL.bat`** que abre el mismo menú interactivo.

### macOS / Linux: Atajo Terminal

Puedes crear un alias en tu shell:

```bash
echo "alias 2arbolitos='cd /ruta/a/2Arbolitos && npm start'" >> ~/.bashrc
```

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
