# 🌳 2Arbolitos POS

### Sistema de Punto de Venta y Gestión Integral para Restaurantes

[![Versión](https://img.shields.io/badge/versión-1.0.0-1A4D2E?style=flat-square)]()
[![Licencia](https://img.shields.io/badge/licencia-MIT-D4A373?style=flat-square)]()
[![Docker / Portable](https://img.shields.io/badge/Docker%20%2F%20Portable-compatible-2496ED?style=flat-square&logo=docker&logoColor=white)]()
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)]()

Sistema POS que opera en **red local (LAN) sin internet obligatorio**, integra gestión de mesas, cocina en tiempo real, ventas multi-moneda (COP/USD/Bs.) y caja. Se accede desde el navegador de cualquier dispositivo en la red. Se despliega con **Docker** (recomendado) o como **paquete portable para Windows** sin Docker.

---

## ✨ Características Principales

| | |
|:-|:--|
| 🛒 **Punto de Venta táctil** | Interfaz optimizada para tablets y celulares |
| 🪑 **Vista de Mesas en tiempo real** | Mapa visual con estados Libre / Ocupada / Tiempo de atención |
| 🧑‍🍳 **Kitchen Display System (KDS)** | Tablero Kanban para cocina |
| 💵 **Multi-moneda COP/USD/Bs.** | Cálculo de vueltos con tasas configurables |
| 🔄 **Sincronización en tiempo real** | Server-Sent Events con versionado optimista |
| 📡 **Funciona sin internet** | Operación offline en la red local del restaurante |
| 🐳 **Docker o portable** | Un comando con Docker, o un ZIP autocontenido en Windows |
| 📱 **Acceso desde móviles por QR** | Escaneas y se abre la app, sin instalar nada |
| 🔒 **Autenticación JWT** | Cookie httpOnly · Roles: Admin, Gerente, Cajero, Mesero, Cocina |
| 📊 **Finanzas** | Cierre de caja Z, gastos operativos, historial |
| 💾 **Backup/Restore** | `npm run backup` para respaldar/restaurar la base de datos |

---

## 🚀 Inicio Rápido (Docker)

### Requisitos
- Windows 10/11, macOS o Linux
- **Docker Desktop** instalado y corriendo

### Instalación Automática (recomendada)

```batch
git clone https://github.com/Yefer-Betta/2Arbolitos.git
cd 2Arbolitos
instalar.bat
```

El script `instalar.bat` (solo instalación) hace todo automáticamente:
1. Se auto-eleva a Administrador
2. Detecta la IP local del servidor
3. Genera `.env` con secretos aleatorios
4. Abre el puerto 80 en el firewall de Windows
5. Construye e inicia los contenedores Docker
6. Muestra la URL y un código QR para acceder desde el celular

> Ejecutar como **Administrador** en Windows para que abra el puerto automáticamente.

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
| **Respaldo** | Fecha del último respaldo y botón para generar uno en `backups/backup-*.sql` |
| **Diagnóstico** | Revisión completa del entorno, con botón para copiar el resultado |
| **Registro** | Últimas 200 líneas de los contenedores, filtrables por servicio |

Doble clic en `Panel.bat`. En el paquete portable queda junto a `start.bat`.

> El respaldo desde el panel solo está disponible en modo Docker (`mysqldump` dentro del contenedor). En modo portable el botón aparece deshabilitado.

---

## 📦 Paquete Portable para Windows (sin Docker)

Genera un ZIP autocontenido con **Node.js embebido**, el frontend compilado y el backend listo para correr. Ideal para equipos donde no se puede/ quiere instalar Docker.

```bash
npm run pack:portable          # genera release/2Arbolitos-Portable-Windows-x64-<versión>.zip
npm run build && npm run pack:portable -- --skip-build   # reutiliza el build actual
```

El paquete se crea en `release/` e incluye `start.bat` (lanza todo con doble clic), `node/node.exe`, `dist/` y `server/` con sus dependencias.

> **Requisito único:** MySQL 8 (o MariaDB 10.4+) corriendo en la máquina.
> El backend Express sirve también el frontend, así que **no necesita Nginx**: todo corre en un solo proceso.

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
│   ├── components/              # POS, KDS, Mesas, Finanzas, etc.
│   ├── context/                 # Estado global
│   └── lib/                     # API, sync, utilidades
├── scripts/                     # Utilidades (backup, cli, empaquetador portable)
├── docker-compose.yml           # Orquestación de servicios
├── Dockerfile                   # Build backend
├── Dockerfile.frontend          # Frontend con Nginx
├── nginx.conf                   # Proxy reverso
├── instalar.bat                 # Instalación única (auto-eleva a admin)
├── iniciar.ps1                  # Uso diario (iniciar/detener/QR)
├── .env.example.docker          # Plantilla de variables de entorno
└── .gitignore
```

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
| Componentes React | 28 |
| Endpoints API | 91 |
| Modelos de datos | 24 |
| Líneas de código | ~11,000 |
| Documentación técnica | `AGENTS.md` + `README.md` |
| Latencia sync | < 500 ms |

---

## 🧪 Estado del Proyecto

- ✅ Funcionalidad core completa (POS, KDS, Mesas, Finanzas)
- ✅ Multi-moneda (COP, USD, Bs.)
- ✅ Sincronización en tiempo real
- ✅ Despliegue Docker automático
- ⚠️ Facturación electrónica (roadmap v1.2)

---

## 📄 Licencia

**MIT** — Ver [`LICENSE`](./LICENSE) para más detalles.

---

## 👤 Autor

**Yefer Betta**
- GitHub: [github.com/Yefer-Betta/2Arbolitos](https://github.com/Yefer-Betta/2Arbolitos)

---

> 🌳 _Construido con React, Node.js, Prisma, MySQL, Docker y mucho café._
