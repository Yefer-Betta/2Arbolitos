# 🌳 Sistema de Gestión 2Arbolitos
## Guía de Instalación para el Restaurante

---

## 📋 Requisitos del Sistema

- **Sistema Operativo**: Windows 10 o superior (PC Servidor Principal)
- **Base de Datos**: MySQL 8.0+ (Recomendado XAMPP o instalador nativo MySQL)
- **Conexión a Internet**: Solo para la instalación inicial
- **Red Local (LAN)**: Router Wi-Fi para conectar tablets o celulares (meseros/cocina) al PC principal
- **Navegador**: Google Chrome o Microsoft Edge (recomendado)
- **Espacio en Disco**: Mínimo 2 GB libres

---

## 🚀 Instalación Inicial

### Paso 1: Instalar Node.js y MySQL

1. Descarga e instala **Node.js LTS** desde: **https://nodejs.org** (Opciones por defecto).
2. Descarga e instala **MySQL** (Puedes usar XAMPP para hacerlo más fácil o MySQL Installer).
3. Asegúrate de que el servicio de MySQL esté corriendo en el puerto `3306` (por defecto).
4. *(Opcional)* Crea una base de datos vacía llamada `2arbolitos` (el instalador intentará crearla automáticamente).

### Paso 2: Ejecutar el Instalador Automático

1. Copia la carpeta **"2Arbolitos"** a una ubicación permanente (ej: `C:\2Arbolitos`).
2. Haz doble clic en **`PANEL_DE_CONTROL.bat`**.
3. En el menú, selecciona la **Opción 1: Instalar Sistema por Primera Vez**.
4. Sigue las instrucciones en pantalla. Se instalarán dependencias, se configurará la base de datos y se crearán los usuarios por defecto.

---

## ▶️ Uso Diario y Producción

Este sistema utiliza un gestor de procesos profesional (`PM2`) para ejecutarse en segundo plano de manera confiable, sin que se cierre por accidente.

### Iniciar el Sistema (Modo Producción)

1. Haz doble clic en **`PANEL_DE_CONTROL.bat`**
2. Selecciona la **Opción 2: Iniciar Servidor en Produccion (Segundo plano)**.
3. El sistema se iniciará en segundo plano. Se abrirá el navegador en el PC local apuntando a `http://localhost:5173`.
4. ¡El sistema quedará encendido incluso si cierras la consola negra!

### Conectar otros dispositivos (Meseros / Cocina)

1. En el PC Principal, abre el Panel de Control de Windows o el Símbolo del Sistema (CMD) y escribe `ipconfig` para ver tu "Dirección IPv4" (Ej: `192.168.1.15`).
2. Toma la tablet o celular que está conectado al *mismo Wi-Fi*.
3. Abre Chrome o Edge en el dispositivo y navega a `http://192.168.1.15:5173` (Reemplaza la IP por la tuya).

### Cerrar o Apagar el Sistema

El sistema corre de fondo permanentemente. Si necesitas detener los servicios (por ejemplo, para actualizar), abre un Símbolo del Sistema (CMD) y escribe:
`npx pm2 stop all`

---

## 💾 COPIA DE SEGURIDAD (¡MUY IMPORTANTE!)

> ⚠️ **CRÍTICO**: El sistema guarda toda tu información contable y el menú en la base de datos MySQL.

### Cómo hacer copias de seguridad de la Base de Datos

Se recomienda hacer respaldos de la base de datos MySQL usando herramientas como **phpMyAdmin**, **MySQL Workbench**, o scripts automatizados de volcado (`mysqldump`).
Consulta con tu desarrollador/técnico para configurar una tarea programada que respalde los datos diariamente.

---

## 📖 Funciones Principales

### 🛒 Punto de Venta (POS)
- Toma rápida de pedidos en modo táctil.
- Gestión avanzada de Mesas (Table Map) y cuentas separadas.

### 🧑‍🍳 Cocina (KDS)
- Pantalla exclusiva y en vivo para que la cocina prepare las comandas usando un tablero visual (Kanban).

### 📊 Contabilidad y Finanzas
- Cierres de caja (Reportes Z) y apertura de turnos.
- Registro de gastos y cobros multi-moneda (COP/USD).

---

## 🔐 Usuarios de Acceso Inicial

- **Administrador**: `admin` / `admin123`
- **Mesero**: `mesero` / `waiter123`
- **Cocina**: `cocina` / `cook123`

---

**Versión del Sistema**: 2.0 (Arquitectura Cliente-Servidor Local)
**Última actualización**: 2026
