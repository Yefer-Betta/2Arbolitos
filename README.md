# 🌳 2Arbolitos POS

### Sistema de Punto de Venta y Gestión Integral para Restaurantes

[![Versión](https://img.shields.io/badge/versión-1.1.1-1A4D2E?style=flat-square)](https://github.com/Yefer-Betta/2Arbolitos/releases/latest)
[![Release](https://img.shields.io/github/v/release/Yefer-Betta/2Arbolitos?style=flat-square&color=1A4D2E&label=release)](https://github.com/Yefer-Betta/2Arbolitos/releases/latest)
[![Licencia](https://img.shields.io/badge/licencia-MIT-D4A373?style=flat-square)](#-licencia)
[![Docker / Portable](https://img.shields.io/badge/Docker%20%2F%20Portable-compatible-2496ED?style=flat-square&logo=docker&logoColor=white)]()
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)]()

Sistema POS que opera en **red local (LAN) sin internet obligatorio**, integra gestión de mesas, cocina en tiempo real, ventas multi-moneda (COP/USD/Bs.) y caja. Se accede desde el navegador de cualquier dispositivo en la red. Se despliega con **Docker** (recomendado) o como **paquete portable para Windows** sin Docker.

### 📥 Instalar

| Modo | Requisito único | Cómo empezar |
|:-----|:----------------|:-------------|
| 🐳 **Docker** (recomendado) | Docker Desktop | Descarga el [código](https://github.com/Yefer-Betta/2Arbolitos/archive/refs/heads/main.zip) (o clona el repo) y abre `instalar.bat` |
| 💻 **Portable Windows x64** | MySQL 8 / MariaDB 10.4+ | Descarga el [ZIP portable](https://github.com/Yefer-Betta/2Arbolitos/releases/download/v1.1.1/2Arbolitos-Portable-Windows-x64-1.1.1.zip), descomprime y abre `start.bat` |

**Última versión: [v1.1.1](https://github.com/Yefer-Betta/2Arbolitos/releases/latest)** · [Todas las versiones](https://github.com/Yefer-Betta/2Arbolitos/releases) · [`AGENTS.md`](./AGENTS.md) para desarrolladores

---

## ✨ Características Principales

| | |
|:-|:--|
| 🛒 **Punto de Venta táctil** | Interfaz optimizada para tablets y celulares |
| 🪑 **Vista de Mesas en tiempo real** | Mapa visual con estados Libre / Ocupada / Tiempo de atención |
| ✏️ **Mesas gestionables** | Crear, renombrar y desactivar desde **Gestionar**; el nombre también se edita desde el carrito del pedido |
| 🧑‍🍳 **Kitchen Display System (KDS)** | Tablero Kanban para cocina |
| 🗂️ **Menú y categorías** | Pestaña **Categorías** con crear, editar y eliminar; los productos se agrupan por tipo |
| 💵 **Multi-moneda COP/USD/Bs.** | Cálculo de vueltos con tasas configurables |
| 🔄 **Sincronización en tiempo real** | Server-Sent Events con versionado optimista |
| 📡 **Funciona sin internet** | Operación offline en la red local del restaurante |
| 🐳 **Docker o portable** | Un comando con Docker, o un ZIP autocontenido en Windows |
| ⬆️ **Actualización con un clic** | El panel consulta la última release y la instala sin tocar tus datos |
| 📱 **Acceso desde móviles por QR** | Escaneas y se abre la app, sin instalar nada |
| 🔒 **Autenticación JWT** | Cookie httpOnly · Roles: Admin, Gerente, Cajero, Mesero, Cocina |
| 👥 **Perfiles con baja reversible** | Solo se listan los activos; los desactivados se pueden ver y reactivar |
| 📊 **Finanzas** | Cierre de caja Z, gastos operativos, historial |
| 💾 **Backup/Restore** | `npm run backup` para respaldar/restaurar la base de datos |

---

## 🚀 Inicio Rápido (Docker)

### Requisitos
- Windows 10/11, macOS o Linux
- **Docker Desktop** instalado y corriendo

### Instalación visual (recomendada)

```batch
git clone https://github.com/Yefer-Betta/2Arbolitos.git
cd 2Arbolitos
instalar.bat
```

`instalar.bat` abre una ventana (PowerShell 5.1 + WPF, sin dependencias nuevas) con tres flujos:

| Acción | Qué hace |
|--------|----------|
| **Instalar o reinstalar** | Genera `.env` con secretos aleatorios, abre el puerto en el firewall, construye las imágenes y arranca los contenedores, mostrando el progreso en vivo. |
| **Revisar y reparar** | Analiza Docker, `.env`, contenedores, puerto y firewall, y ofrece una corrección por cada problema encontrado. |
| **Desinstalar** | Detiene y elimina los contenedores. La base de datos y los respaldos se conservan salvo que marques la casilla y escribas `BORRAR`. |

Al terminar deja un acceso directo **2Arbolitos POS** en el escritorio que abre el sistema (`http://localhost`).

Si la ventana no abre o prefieres texto, el mismo instalador funciona en consola:

```batch
instalar.bat /consola
```

Ambos caminos comparten la lógica (`scripts\setup\SetupOps.ps1`) y dejan un registro en `logs\instalacion-*.log`.

> El instalador se auto-eleva a Administrador. Si rechazas el aviso de Windows, continúa sin la regla de firewall y lo advierte.

### Errores que corrige solo

- Contenedores de un intento anterior (conflicto de nombres) → los elimina y reintenta.
- `.env` ausente, con BOM, con claves repetidas o con el secreto por defecto → lo reescribe conservando lo válido (deja `.env.bak`).
- Contenedores con configuración vieja (`JWT_SECRET`) → los recrea para que lean el `.env` actual.
- Contraseña de la base distinta a la del volumen → reutiliza la anterior **sin borrar datos**.
- Puerto 80 ocupado → avisa y permite elegir otro (por ejemplo 8080).
- Docker Desktop cerrado → intenta abrirlo y espera al motor.
- IP local cambiada → actualiza `HOST_IP` para los QR.
- Regla de firewall ausente → la vuelve a crear.

### Inicio Manual (si ya está configurado)

```bash
docker compose up -d
```

Para uso diario, también puedes usar `iniciar.ps1` (clic derecho → Ejecutar con PowerShell), que ofrece menú para Iniciar, Detener, Reiniciar, QR y Estado, sin requerir Node.js.

### Detener

```bash
docker compose down
```

---

## 🖥️ Panel de control (Windows)

`Panel.bat` abre una ventana con el estado del sistema y las acciones del día a día. No requiere Node.js ni instalar nada: usa PowerShell 5.1 y WPF, incluidos en Windows 10/11. Funciona tanto con Docker como con el paquete portable.

| Sección | Qué muestra / hace |
|---------|--------------------|
| **Estado** | Motor Docker, contenedores `db` / `backend` / `frontend`, `/api/health` y base de datos |
| **Acceso** | URL local, URL de red para celulares, abrir el POS, copiar la URL y ver el QR |
| **Acciones** | Iniciar · Detener (con confirmación) · Reiniciar · Abrir Docker Desktop si está cerrado |
| **Actualizar** | **Buscar actualizacion**: consulta la última release publicada y, si hay una más nueva, la aplica con confirmación (Docker: `git pull` + rebuild; portable: descarga el ZIP conservando `.env`, `logs`, `backups` y la base de datos) |
| **Respaldo** | Fecha del último respaldo y botón para generar uno en `backups/backup-*.sql` |
| **Reparar** | Abre el instalador visual para diagnosticar y corregir problemas comunes |
| **Diagnóstico** | Revisión completa del entorno, con botón para copiar el resultado |
| **Registro** | Últimas 200 líneas de los contenedores, filtrables por servicio |

Doble clic en `Panel.bat`. En el paquete portable queda junto a `start.bat`.

> **Actualizar es seguro:** el panel nunca borra el volumen de la base de datos, ni el `.env`, ni los respaldos. Si la versión nueva no trae ZIP portable, avisa y enlaza a la release en vez de romper la instalación.

> El respaldo desde el panel solo está disponible en modo Docker (`mysqldump` dentro del contenedor). En modo portable el botón aparece deshabilitado.

---

## 📦 Paquete Portable para Windows (sin Docker)

Cada release incluye un ZIP autocontenido con **Node.js embebido**, el frontend compilado y el backend listo para correr. Ideal para equipos donde no se puede o no se quiere instalar Docker.

Descárgalo desde [la última release](https://github.com/Yefer-Betta/2Arbolitos/releases/latest) (`2Arbolitos-Portable-Windows-x64-<versión>.zip`), descomprime y abre `start.bat`. La primera ejecución pide los datos de MySQL, crea la base, corre el seed y abre el navegador.

Para generarlo tú mismo desde el código:

```bash
npm run pack:portable          # genera release/2Arbolitos-Portable-Windows-x64-<versión>.zip
npm run build && npm run pack:portable -- --skip-build   # reutiliza el build actual
```

El paquete se crea en `release/` e incluye `start.bat` (lanza todo con doble clic), `Panel.bat`, `node/node.exe`, `dist/`, `server/` con sus dependencias y `version.txt` (para que el panel sepa qué versión corre).

> **Requisito único:** MySQL 8 (o MariaDB 10.4+) corriendo en la máquina.
> El backend Express sirve también el frontend, así que **no necesita Nginx**: todo corre en un solo proceso.

> El ZIP publicado no se sube a mano: lo genera y adjunta GitHub Actions (`.github/workflows/portable-release.yml`) al empujar un tag `v*`.

---

## 🔐 Usuarios Iniciales

| Rol | Usuario | Contraseña |
|:----|:--------|:-----------|
| 👑 Administrador | `admin` | `admin123` |
| 🧭 Gerente | `gerente` | `waiter123` |
| 🛒 Cajero | `cajero` | `waiter123` |
| 🛒 Mesero | `mesero` | `waiter123` |
| 🧑‍🍳 Cocina | `cocina` | `cook123` |

> ⚠️ **Cambiar las contraseñas inmediatamente en producción.**

---

## 💾 Backup

```bash
npm run backup                              # Genera respaldo SQL de la base de datos en backups/
docker compose exec db sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" 2arbolitos' > restore.sql   # manual
```

---

## 📁 Estructura del Proyecto

```
2Arbolitos/
├── server/                      # ⚙️ Backend Node.js + Prisma
│   ├── prisma/
│   │   ├── schema.prisma        # Modelos de datos
│   │   └── seed.js              # Datos iniciales
│   ├── src/
│   │   ├── index.js             # Servidor Express
│   │   ├── sse.js               # Server-Sent Events
│   │   ├── controllers/         # Lógica de negocio
│   │   ├── middleware/          # JWT
│   │   └── routes/              # Endpoints REST
│   └── docker-entrypoint.sh     # Inicialización automática
├── src/                         # 🎨 Frontend React
│   ├── components/              # POS, KDS, Mesas, Menú, Finanzas, etc.
│   ├── context/                 # Estado global
│   └── lib/                     # API, sync, utilidades
├── scripts/                     # Utilidades (backup, cli, empaquetador portable)
│   ├── panel/                   # Panel de control Windows (WPF)
│   └── setup/                   # Instalador visual y catálogo de errores
├── .github/workflows/           # CI: imágenes Docker y ZIP portable
├── docker-compose.yml           # Orquestación de servicios
├── Dockerfile                   # Build backend
├── Dockerfile.frontend          # Frontend con Nginx
├── nginx.conf                   # Proxy reverso
├── instalar.bat                 # Instalación única (auto-eleva a admin)
├── iniciar.ps1                  # Uso diario (iniciar/detener/QR)
├── Panel.bat                    # Panel de control (estado, respaldo, actualizar)
├── .env.example.docker          # Plantilla de variables de entorno
└── .gitignore
```

---

## 🆕 Novedades

### v1.1.1 — última

- **Pedidos:** corregido el `ReferenceError` que dejaba en blanco la pantalla del pedido al abrir una mesa.
- **Mesas:** el nombre personalizado se muestra también dentro del pedido y se puede editar desde el carrito (doble clic en el nombre o el lápiz).
- **Estabilidad:** liberar una mesa (cobrar o anular) ya no deja cuentas fantasma al sincronizar.

### v1.1.0

- **Mesas:** crear, renombrar y desactivar desde **Gestionar**; crear una mesa con un número desactivado la reactiva.
- **Menú:** nueva pestaña **Categorías** con crear, editar y eliminar.
- **Perfiles:** solo se muestran los activos, con vista y reactivación de desactivados (baja reversible).
- **Panel:** botón **Buscar actualizacion** para actualizar el sistema con un clic.

👉 Historial completo en [Releases](https://github.com/Yefer-Betta/2Arbolitos/releases).

---

## 📄 Documentación

La documentación de referencia del desarrollador está en [`AGENTS.md`](./AGENTS.md) (arquitectura, comandos Docker, base de datos y despliegue).

---

## 🌐 Acceso a la App

| Desde | URL |
|:------|:----|
| Mismo equipo servidor (Docker) | `http://localhost` |
| Celular/tablet en LAN | `http://<IP-del-servidor>` |
| Paquete portable (Windows) | `http://localhost:3002` |
| QR automático | Se muestra al ejecutar `instalar.bat` |

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|:-----|:-----------|
| Frontend | React 19 + Vite 7 + Tailwind CSS 4 |
| Backend | Node.js + Express |
| Base de datos | MySQL 8 / MariaDB 10.4+ |
| ORM | Prisma 5 |
| Proxy | Nginx (solo en Docker) |
| Tiempo real | Server-Sent Events (SSE) |
| Despliegue | Docker Compose · Paquete portable (Node embebido) |

---

## 🎨 Branding

- **Verde bosque profundo** `#1A4D2E` — Primary
- **Dorado ocre terroso** `#D4A373` — Secondary
- **Crema suave** `#F9F7F2` — Background
- **Tipografía**: Outfit

---

## 📊 Métricas del Proyecto

| Métrica | Valor |
|:--------|:------|
| Componentes React | 50 |
| Endpoints API | 91 |
| Modelos de datos | 24 |
| Líneas de código | ~11,000 |
| Documentación técnica | `AGENTS.md` + `README.md` |
| Latencia sync | < 500 ms |

---

## 🧪 Estado del Proyecto

- ✅ Funcionalidad core completa (POS, KDS, Mesas, Menú, Finanzas)
- ✅ Multi-moneda (COP, USD, Bs.)
- ✅ Sincronización en tiempo real y operación offline
- ✅ Despliegue Docker automático y paquete portable
- ✅ Actualización con un clic desde el panel de Windows
- ⚠️ Facturación electrónica (roadmap v1.2)

---

## 📄 Licencia

**MIT** — puedes usar, modificar y distribuir el proyecto conservando el aviso de autoría.

---

## 👤 Autor

**Yefer Betta**
- GitHub: [github.com/Yefer-Betta/2Arbolitos](https://github.com/Yefer-Betta/2Arbolitos)

---

> 🌳 _Construido con React, Node.js, Prisma, MySQL, Docker y mucho café._
