# 2Arbolitos POS — Agent Guide

## Instalar agentes OpenCode (para developers)

```bash
npm run setup:agents
```

Copia SkillsForOpenCode desde la configuración global al proyecto. Después puedes usar `/plan`, `/security`, `/code-review`, `/refactor-clean`, `/tdd`. Sin .bat, solo `node`.

## Para el usuario final

Hay dos formas soportadas de instalar. **Docker es la recomendada**; el paquete portable es para equipos donde no se puede o no se quiere instalar Docker.

| Modo | Requisito único | Instalación |
|------|-----------------|-------------|
| **Docker** (recomendado) | Docker Desktop | `instalar.bat` (una vez) + `iniciar.ps1` (uso diario) |
| **Portable Windows** (sin Docker) | MySQL 8 o MariaDB 10.4+ | ZIP `2Arbolitos-Portable-Windows-x64-<versión>.zip` → doble clic en `start.bat` |

### Docker

| Paso | Qué se hace |
|------|-------------|
| **1. Instalar** | Doble clic en `instalar.bat` → crea `.env`, abre firewall y levanta todo |
| **2. Usar cada día** | Doble clic en `iniciar.ps1` → menú para Iniciar/Detener/Reiniciar/QR |

- `instalar.bat` (solo instalación): abre el **instalador visual** (auto‑eleva a admin). Con `instalar.bat /consola` usa el modo texto. Valida Docker, detecta IP LAN, genera secretos, abre el firewall, construye, arranca, verifica y deja un acceso directo al POS en el escritorio.
- `iniciar.ps1` (uso diario): solo `docker compose` — iniciar, detener, reiniciar, QR, estado. **No requiere Node.js.**
- `npm start` / `npm run setup` quedan para developers (menú interactivo).

### Portable (sin Docker)

- El ZIP se genera con `npm run pack:portable` (ver más abajo) y se distribuye como artefacto; no hay instalador `.bat` de «instalación», solo `start.bat`.
- Incluye **Node.js embebido** (`node/node.exe`), el frontend compilado (`dist/`) y `server/` con dependencias de producción. `start.bat` prepara el esquema, corre el seed si la base está vacía y arranca el servidor.
- El backend Express sirve también el frontend, así que **no usa Nginx**: todo corre en un solo proceso en `0.0.0.0:3002`.
- Usa `prisma db push --accept-data-loss` (no migraciones) y crea la base de datos si no existe.

## Quick start

```bash
docker compose up -d                    # production
docker compose logs -f                  # tail all containers
docker compose down                     # stop
```

Dev (requires local MySQL or `docker compose up -d db`):

```bash
npm run dev:full                        # Vite + Express concurrently
npm run dev                             # frontend only (Vite, proxies /api → :3002)
npm run api                             # backend only
npm run lint                            # ESLint
npm run build                           # Vite production build
npm run pack:portable                   # ZIP portable para Windows (ver sección)
```

On Windows, `instalar.bat` opens the **visual installer** (WPF): auto‑elevates to admin, validates Docker CLI + engine, detects LAN IP, generates secret `.env`, enables the firewall rule, builds and starts the containers, waits for HTTP, verifies login and creates a desktop shortcut to the POS. `instalar.bat /consola` runs the same logic in text mode (`SetupOps.ps1 -Action Install -Console`).

Single‑PC production: `docker compose up -d` → `http://localhost`.

## Docker architecture

Three containers on bridge `2arbolitos-net`:

| Service | Image | Internal port | External |
|---------|-------|---------------|----------|
| `db` | mysql:8.0 | 3306 | — |
| `backend` | `2arbolitos-backend` (server/Dockerfile) | 3002 | — |
| `frontend` | `2arbolitos-frontend` (Dockerfile.frontend → Nginx) | 80 | `${FRONTEND_PORT:-80}` |

- `backend` waits for `db: service_healthy`
- `frontend` waits for `backend: service_started` (nginx proxies `/api → backend:3002`)
- Data volume `mysql_data` persists across restarts

## Backend (server/)

- Express (ESM, `"type": "module"`), entrypoint `src/index.js`
- Prisma ORM (MySQL 8, `utf8mb4`)
- **Dos modos de esquema según el despliegue:**
  - Docker/compose → `prisma migrate deploy` (migraciones versionadas en `server/prisma/migrations/`)
  - Portable/dev rápido → `prisma db push --accept-data-loss`
- `docker-entrypoint.sh` runs on every start:
  1. Waits for MySQL (TCP check, up to 60s)
  2. Creates `payments_orderId_idx` (pre‑migration, error-tolerant)
  3. Detects DB state: `migrated` (already has `_prisma_migrations`), `legacy` (tables from `db push`, no history) or `empty`. If legacy, baselines `20240101000000_init` with `prisma migrate resolve --applied`
  4. `prisma migrate deploy`
  5. Runs `prisma/seed.js` **only if `user.count() === 0`** (otherwise skips)
  6. Starts Node server
- **Seed wipes all data on run** — it only runs when DB is empty, so data survives restarts
- `server/prisma/seed.js` loads `server/.env` itself (`import 'dotenv/config'`) — works both in Docker (dotenv does not overwrite existing env vars) and locally/portable
- `bcrypt` requires salt rounds of 10 — slow but safe
- **All `$` inside double‑quoted `node -e` blocks must be escaped as `\$`** (shell variable expansion)
- Health check: TCP connect to port 3002 (not HTTP)

### Key Prisma commands (within server/)

```bash
npm run db:generate    # prisma generate
npm run db:push        # prisma db push
npm run db:migrate     # prisma migrate dev (crea migración)
npm run db:deploy      # prisma migrate deploy (aplica migraciones)
npm run db:studio      # prisma studio
npm run db:seed        # node prisma/seed.js (DANGER: wipes all data)
```

### Container‑specific server commands

```bash
npm run docker:seed    # docker compose exec -T backend node prisma/seed.js
npm run docker:rebuild # docker compose up -d --build
```

## Frontend (src/)

- React 19 + Vite 7 + Tailwind CSS 4
- PWA via `vite-plugin-pwa` (auto‑update, IndexedDB for offline)
- `getApiBase()` computes base URL: `VITE_API_URL || window.location.origin + "/api"`
- Dev proxy in `vite.config.js`: `/api` → `http://127.0.0.1:3002` (reads PORT from `server/.env`)
- SSE endpoint: `/api/events` (nginx read timeout 86400s)

### Offline sync

- `src/lib/syncManager.js` manages pending queue, retries with backoff
- `FETCH_TIMEOUT = 10000`, `MAX_RETRIES = 5`, `SYNC_INTERVAL = 5000`
- Online/offline detected via browser events + periodic polls
- `apiGet()` falls back to IndexedDB cache when offline

## Auth

- JWT en **cookie httpOnly** `token` (no se expone a JS → mitiga XSS).
- `server/src/config/cookies.js`: `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `maxAge` 7 días, `secure` = `process.env.COOKIE_SECURE === 'true'` (por defecto `false` porque la LAN es HTTP; poner `COOKIE_SECURE=true` solo detrás de HTTPS).
- Login: `POST /api/auth/login` setea la cookie; logout: `POST /api/auth/logout` la borra.
- `getToken()` en `server/src/middleware/auth.js` acepta además `Authorization: Bearer <jwt>` como respaldo para scripts/clientes no‑navegador.
- `authorize(...roles)` restringe por rol (`ADMIN, MANAGER, CASHIER, WAITER, COOK`).
- Endpoints de menú con `optionalAuth` (p. ej. `GET /api/products`, `GET /api/categories`): sin cookie devuelven solo campos públicos; con cookie, el detalle completo. Es intencional para el menú por QR.

## Database

24 models (Prisma), MySQL 8 with `utf8mb4`. Key tables:

| Model | Table name | Notes |
|-------|-----------|-------|
| `User` | `users` | Roles: ADMIN, MANAGER, CASHIER, WAITER, COOK |
| `Permission` / `RolePermission` | `permissions` / `role_permissions` | Permisos por rol |
| `Order` | `orders` | `orderType`: MESA, PARA_LLEVAR, DOMICILIO. `deliveryPhone` for domicilios |
| `Payment` | `payments` | Split payments per order, `@@index([orderId])` |
| `Product` | `products` | `isUsd` flag for USD pricing |
| `ModifierGroup` / `Modifier` / `ProductModifierGroup` | — | Modificadores de producto |
| `InventoryItem` | `inventory_items` | Raw materials only (not final products) |
| `InventoryMovement` | `inventory_movements` | Audit trail for stock changes |
| `Table` / `TableState` | `tables` / `table_states` | Mesas y su estado |
| `Customer` / `Reservation` | `customers` / `reservations` | Clientes y reservas |
| `Settings` | `settings` | Key‑value store (`business`, `exchangeRate`, `exchangeRateBs`) |
| `AuditLog` | `audit_logs` | Trazabilidad de acciones |
| `Closure` / `Expense` | `closures` / `expenses` | Cierres de caja y gastos |
| `Supplier` / `PurchaseOrder` | `suppliers` / `purchase_orders` | Compras y proveedores |
| `Attendance` | `attendance` | Asistencia de personal |

Setting `tokenExpiration` controls JWT expiry on the client side.

## Portable Windows package

```bash
npm run pack:portable                       # build + empaqueta
npm run build && npm run pack:portable -- --skip-build   # reutiliza dist/ existente
```

- Empaquetador: `scripts/pack-portable.js`. Salida: `release/2Arbolitos-Portable-Windows-x64-<versión>.zip`.
- Contenido: `node/node.exe` (Node embebido), `dist/`, `server/` (src + prisma + `node_modules` de producción) y `start.bat`.
- Primera ejecución (`start.bat`): interactivo, crea `server\.env` con `JWT_SECRET` aleatorio, ejecuta `prisma db push` (crea la DB si no existe) y el seed si está vacía. Arranca en `0.0.0.0:3002` y abre el navegador.
- Arranques siguientes: detecta datos existentes y no vuelve a tocar la base.
- Requiere **MySQL 8 o MariaDB 10.4+** en la misma máquina (no lo empaqueta).
- `--skip-build` reutiliza `dist/` si ya existe; si no existe, lanza `vite build`.

## `.gitattributes` expectations

| Extension | Line ending |
|-----------|-------------|
| `.sh`, `.bash` | LF (Linux containers) |
| `Dockerfile*` | LF |
| `.bat` | CRLF (Windows native) |
| `.js`, `.jsx`, `.json`, `.css`, `.yml`, `.md`, `.env*` | Auto (text) |

Shell scripts **must remain LF** or the Docker container will fail to execute them (`#!/bin/sh\r` is invalid).

## Deployment

**Windows only** para los instaladores. Docker: `instalar.bat` abre la ventana de instalación (auto‑eleva a admin), valida Docker, detecta la IP, crea `.env`, abre el firewall, construye, arranca, verifica y crea el acceso directo. `instalar.bat /consola` hace lo mismo en texto. Linux/Mac: `docker compose up -d --build` manual.

Sin Docker: distribuir el ZIP portable y ejecutar `start.bat` (requiere MySQL/MariaDB local).

Default users after seed: `admin/admin123`, `gerente/waiter123`, `cajero/waiter123`, `mesero/waiter123`, `cocina/cook123`.

`.env` is gitignored. `HOST_IP` controls QR‑code generation (detected by `instalar.bat`; falls back to request `Host` header if `0.0.0.0`). `COOKIE_SECURE=true` solo si se sirve detrás de HTTPS.

## No tests

The project has no test framework. There is a single CI workflow (`.github/workflows/docker-build.yml`) that builds and pushes Docker images to GHCR — it does not run tests.

## Capturas visuales (POS)

```bash
npm run dev                 # frontend en 5173 y API en 3002
npm run shots -- --tag antes
npm run shots -- --tag despues --only pos,kitchen
```

- Arnés sin dependencias: `scripts/visual/shots.mjs` lanza Edge headless con CDP, inicia sesión real (`admin/admin123`) e inyecta la cookie `httpOnly`.
- Guarda `screenshots/<tag>-<viewport>-<pantalla>.png` en 1440×900, 1024×768 y 390×844. La carpeta está en `.gitignore`.
- Escenarios: `login`, `mesas`, `pedido` (Mesa 1 + 3 ítems), `carrito`, `cocina`, `historial`, `inventario`, y variantes `mesas-oscuro` / `pedido-oscuro`.
- `pedido`/`carrito` limpian la mesa al terminar (`DELETE /tables/state/mesa-1`) para no dejar cuentas abiertas.

## Panel de control (Windows)

`Panel.bat` → `scripts/panel/Panel.ps1` (WPF) + `scripts/lib/Ops.ps1` (operaciones compartidas con el instalador).

- Sin dependencias: PowerShell 5.1 + .NET Framework 4.8 (vienen con Windows). No requiere Node ni npm.
- Detecta el modo: **Docker** si existe `docker-compose.yml`, **Portable** si existen `node\node.exe` y `server\src\index.js`.
- Estado, iniciar/detener/reiniciar, abrir POS, copiar URL, QR, respaldo (`mysqldump` vía `docker compose exec`), diagnóstico, logs y botón **Reparar instalación** (abre `instalar.bat`).
- El sondeo corre en un runspace aparte cada 4 s para no congelar la UI.
- Se empaqueta también en el ZIP portable (`pack-portable.js` → `copyPanel`, que copia `Panel.ps1` y `scripts/lib/Ops.ps1`).
- `Get-ComposePs` usa `docker compose ps -a` para distinguir "detenido" de "no creado".

### Actualización con un clic

El botón **Buscar actualizacion** consulta la última *release* de GitHub y, si hay una versión mayor que la instalada, pide confirmación y la aplica sola.

| Pieza | Dónde |
|-------|-------|
| Consulta de release | `Get-LatestRelease` / `Get-UpdateInfo` en `scripts/lib/Ops.ps1` (API pública, repo `$Script:RepoSlug`) |
| Comparación de versiones | `ConvertTo-AppVersion` + `Get-AppVersion` (`package.json` → `version.txt` → `server/package.json`) |
| Aplicar en Docker | `git pull --ff-only` si hay `.git`; si no, ZIP del tag (`/archive/refs/tags/<tag>.zip`) → `docker compose up -d --build` |
| Aplicar en Portable | descarga el asset `*Portable-Windows-x64*.zip`, copia encima conservando `.env`, `logs`, `backups` y reinicia |
| UI | `Panel.ps1`: `BtnUpdate` + `TxtUpdateHint`, `Start-UpdateCheck` / `Complete-UpdateCheck` en el runspace de acciones |

Reglas al respecto:

- El ZIP portable **debe** incluir `package.json` y `version.txt` en la raíz; sin ellos el panel no sabe qué versión corre (`pack-portable.js` → `writeVersionFiles`).
- En modo Portable la actualización exige que la release tenga adjunto el ZIP portable; si falta, el panel avisa y enlaza a la release en vez de romper la instalación.
- Los datos nunca se tocan: no se borra el volumen, ni `.env`, ni los respaldos.

### Publicar una versión nueva

1. Subir la versión en `package.json` y `server/package.json` (mismo número).
2. `npm run build` y, si se publica el portable, `npm run pack:portable`.
3. Commit + push a `main`, luego `git tag vX.Y.Z && git push origin vX.Y.Z`.
4. Crear la release en GitHub con ese tag y adjuntar `release/2Arbolitos-Portable-Windows-x64-X.Y.Z.zip`.

El workflow `docker-build.yml` se dispara con `main` y con tags `v*` (publica imágenes en GHCR). El panel solo ve versiones publicadas como *release*, no basta con el tag.


**Importante:** los `.ps1` deben guardarse en **UTF-8 con BOM**. PowerShell 5.1 lee sin BOM como ANSI y rompe los acentos. `Panel.bat` debe ir en **CRLF**.

Autotest sin abrir ventana:

```powershell
powershell -NoProfile -STA -ExecutionPolicy Bypass -File scripts\panel\Panel.ps1 -SelfTest
```

## Instalador visual (Windows)

`instalar.bat` → `scripts/setup/Installer.ps1` (WPF) + `scripts/setup/SetupOps.ps1` (lógica).

- **Instalar / Reparar / Desinstalar** en una sola ventana, con la misma paleta del panel.
- La ventana es solo interfaz: cada acción se ejecuta como proceso hijo (`powershell -File SetupOps.ps1`) y el progreso llega por un archivo **JSON Lines** (`-ProgressFile`). Así la UI nunca se congela y un fallo de Docker no la tumba.
- `instalar.bat /consola` ejecuta el mismo `SetupOps.ps1 -Action Install -Console` (respaldo si WPF falla).
- Al instalar crea el acceso directo **2Arbolitos POS** en el escritorio (`%LOCALAPPDATA%\2Arbolitos\app.ico` generado desde `public/pwa-192x192.png`).
- Registro de cada operación en `logs\instalacion-<fecha>.log`.

### Catálogo de errores

`Get-FailureInfo` clasifica la salida de Docker/Prisma en códigos: `ENV_STALE`, `DB_PASSWORD`, `NAME_CONFLICT`, `PORT_BUSY`, `ENGINE_OFF`, `WSL_DOWN`, `PULL_FAIL`, `MIGRATION`, `NO_SPACE`. Los casos reales viven como fixtures en `scripts/setup/fixtures/*.log` (el nombre del archivo es el código esperado).

Reparaciones seguras (`Invoke-Repair`): `env`, `engine`, `start`, `recreate`, `restart`, `dbpass` (reutiliza la contraseña anterior leyéndola del contenedor `2arbolitos-db`), `firewall`, `orphans`. Borrar el volumen nunca es automático: exige `-RemoveVolume` y confirmación escrita en la UI.

### Autotest

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\setup\SetupOps.ps1 -Action SelfTest
powershell -NoProfile -STA -ExecutionPolicy Bypass -File scripts\setup\Installer.ps1 -SelfTest
```

El primero valida el catálogo contra los fixtures, la generación de `.env` y el estado; el segundo carga el XAML y comprueba que existan todos los controles y funciones.
