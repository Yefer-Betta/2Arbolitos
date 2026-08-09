# 2Arbolitos POS — Agent Guide

## Instalar agentes OpenCode (para developers)

```bash
npm run setup:agents
```

Copia SkillsForOpenCode desde la configuración global al proyecto. Después puedes usar `/plan`, `/security`, `/code-review`, `/refactor-clean`, `/tdd`. Sin .bat, solo `node`.

## Para el usuario final

| Método | Cómo |
|--------|------|
| **PowerShell** (recomendado) | Clic derecho en `iniciar.ps1` → "Ejecutar con PowerShell" |
| **Node.js** | `npm start` (menú interactivo) |
| **Setup completo** | `npm run setup` |

No más `.bat` raro — todo es `node` o PowerShell moderno.

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
npm run lint                            # ESLint on src/
npm run build                           # Vite production build
```

On Windows, `instalar.bat` (admin elevation, prereq check, clone, build, start, open browser).

Single‑PC production: `docker compose up -d` → `http://localhost`.

## Docker architecture

Three containers on bridge `2arbolitos-net`:

| Service | Image | Internal port | External |
|---------|-------|---------------|----------|
| `db` | mysql:8.0 | 3306 | — |
| `backend` | `2arbolitos-backend` (server/Dockerfile) | 3002 | — |
| `frontend` | `2arbito-pwa` (Dockerfile.frontend) | 80 | `${FRONTEND_PORT:-80}` |

- `backend` waits for `db: service_healthy`
- `frontend` waits for `backend: service_started` (nginx proxies `/api → backend:3002`)
- Data volume `mysql_data` persists across restarts

## Backend (server/)

- Express (ESM, `"type": "module"`), entrypoint `src/index.js`
- Prisma ORM (MySQL 8, `prisma db push`, **no migrations**)
- `docker-entrypoint.sh` runs on every start:
  1. Waits for MySQL (TCP check, up to 60s)
  2. Creates `payments_orderId_idx` (pre‑migration, error-tolerant)
  3. `prisma db push --accept-data-loss`
  4. Runs `prisma/seed.js` **only if `user.count() === 0`** (otherwise skips)
  5. Starts Node server
- **Seed wipes all data on run** — it only runs when DB is empty, so data survives restarts
- `bcrypt` requires salt rounds of 10 — slow but safe
- **All `$` inside double‑quoted `node -e` blocks must be escaped as `\$`** (shell variable expansion)
- Health check: TCP connect to port 3002 (not HTTP)

### Key Prisma commands (within server/)

```bash
npm run db:generate    # prisma generate
npm run db:push        # prisma db push
npm run db:studio      # prisma studio
npm run db:seed        # node prisma/seed.js (DANGER: wipes all data)
```

### Container‑specific server commands

```bash
npm run docker:seed    # docker compose exec backend node prisma/seed.js
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

## Database

19 models (Prisma), MySQL 8 with `utf8mb4`. Key tables:

| Model | Table name | Notes |
|-------|-----------|-------|
| `User` | `users` | Roles: ADMIN, MANAGER, CASHIER, WAITER, COOK |
| `Order` | `orders` | `orderType`: MESA, PARA_LLEVAR, DOMICILIO. `deliveryPhone` for domicilios |
| `Payment` | `payments` | Split payments per order, `@@index([orderId])` |
| `Product` | `products` | `isUsd` flag for USD pricing |
| `InventoryItem` | `inventory_items` | Raw materials only (not final products) |
| `InventoryMovement` | `inventory_movements` | Audit trail for stock changes |
| `Settings` | `settings` | Key‑value store (`business`, `exchangeRate`, `exchangeRateBs`) |

Setting `tokenExpiration` controls JWT expiry on the client side.

## Multi‑currency

Operating currency: **COP**. USD and Bs. are converted to COP at sale time.

- Exchange rates stored in Settings: `exchangeRate` (COP/USD, default 4000), `exchangeRateBs` (COP/Bs., default 40)
- `createOrder` and `addPayment` convert non‑COP amounts server‑side
- `genId()` in frontend uses `crypto.randomUUID()` with `Date.now()` fallback for insecure contexts (HTTP)

## `.gitattributes` expectations

| Extension | Line ending |
|-----------|-------------|
| `.sh`, `.bash` | LF (Linux containers) |
| `Dockerfile*` | LF |
| `.bat` | CRLF (Windows native) |
| `.js`, `.jsx`, `.json`, `.css`, `.yml`, `.md`, `.env*` | Auto (text) |

Shell scripts **must remain LF** or the Docker container will fail to execute them (`#!/bin/sh\r` is invalid).

## Deployment

**Windows only** (Linux/Mac need manual `docker compose`): `instalar.bat` auto‑elevates to admin, checks Git+Docker, clones if needed, detects local IP, creates `.env`, opens firewall port 80, builds, starts, and opens browser.

Default users after seed: `admin/admin123`, `gerente/waiter123`, `cajero/waiter123`, `mesero/waiter123`, `cocina/cook123`.

`.env` is gitignored. `HOST_IP` controls QR‑code generation (detected by `instalar.bat`; falls back to request `Host` header if `0.0.0.0`).

## No CI, no tests

The project has no test framework or CI workflows. The `.github/workflows/` directory is empty.
