# 08 — Referencia de la API

## 8.1 Convenciones

- **Base URL**: `http://<host>:3002/api`
- **Content-Type**: `application/json` (excepto endpoints SSE)
- **Autenticación**: Header `Authorization: Bearer <token>` en endpoints protegidos
- **Códigos de estado**:
  - `200 OK` — operación exitosa
  - `201 Created` — recurso creado
  - `400 Bad Request` — payload inválido
  - `401 Unauthorized` — falta/invalida autenticación
  - `403 Forbidden` — sin permisos
  - `404 Not Found` — recurso no existe
  - `409 Conflict` — conflicto de versionado (TableState)
  - `500 Internal Server Error` — error del servidor

## 8.2 Resumen de Endpoints

| Verbo | Ruta | Auth | Descripción |
|:------|:-----|:-----|:------------|
| POST | `/auth/login` | No | Iniciar sesión |
| POST | `/auth/register` | No | Registrar usuario (solo admin en prod) |
| GET | `/auth/me` | Sí | Usuario actual |
| GET | `/health` | No | Health check |
| GET | `/products` | No | Listar productos |
| GET | `/products/:id` | No | Obtener producto |
| POST | `/products` | Sí | Crear producto |
| PUT | `/products/:id` | Sí | Actualizar producto |
| DELETE | `/products/:id` | Sí | Soft-delete producto |
| GET | `/categories` | No | Listar categorías |
| POST | `/categories` | Sí | Crear categoría |
| PUT | `/categories/:id` | Sí | Actualizar categoría |
| DELETE | `/categories/:id` | Sí | Soft-delete categoría |
| GET | `/orders` | Sí | Listar órdenes (con filtros) |
| GET | `/orders/active` | Sí | Órdenes activas (PENDING/PREPARING/READY) |
| POST | `/orders` | Sí | Crear orden |
| PUT | `/orders/:id` | Sí | Actualizar orden |
| DELETE | `/orders/:id` | Sí | Cancelar orden |
| GET | `/tables` | No | Listar mesas |
| GET | `/tables/:id` | No | Obtener mesa |
| POST | `/tables` | Sí | Crear mesa |
| PUT | `/tables/:id` | Sí | Actualizar mesa |
| DELETE | `/tables/:id` | Sí | Soft-delete mesa |
| GET | `/tables/:id/state` | Sí | Obtener estado activo (carrito) |
| PUT | `/tables/state` | Sí | Actualizar estado (con versionado) |
| GET | `/settings` | No | Listar configuraciones |
| GET | `/settings/:key` | No | Obtener setting específico |
| PUT | `/settings/:key` | Sí | Actualizar setting |
| GET | `/settings/qr` | No | Obtener QR + URL del servidor |
| GET | `/expenses` | Sí | Listar gastos |
| POST | `/expenses` | Sí | Registrar gasto |
| DELETE | `/expenses/:id` | Sí | Eliminar gasto |
| GET | `/closures` | Sí | Listar cierres de caja |
| POST | `/closures` | Sí | Crear cierre de caja |
| GET | `/events` | No | **SSE** — stream de eventos |

## 8.3 Autenticación

### POST /auth/login

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Respuesta 200 OK:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "name": "Administrador",
    "role": "ADMIN"
  }
}
```

**Errores:**

- `401 Unauthorized` — credenciales inválidas
- `403 Forbidden` — usuario inactivo

### GET /auth/me

```http
GET /api/auth/me
Authorization: Bearer eyJhbGc...
```

**Respuesta 200:**

```json
{
  "id": "uuid",
  "username": "admin",
  "name": "Administrador",
  "role": "ADMIN"
}
```

## 8.4 Productos

### GET /products

```http
GET /api/products?active=true
```

**Query params:**
- `active` (bool) — filtrar por activos
- `categoryId` (uuid) — filtrar por categoría

**Respuesta 200:**

```json
[
  {
    "id": "uuid",
    "name": "Hamburguesa Especial",
    "categoryId": "uuid",
    "category": { "id": "uuid", "name": "Platos Principales" },
    "price": 18000,
    "isUsd": false,
    "active": true,
    "imageUrl": "https://...",
    "description": "Carne 200g, queso, lechuga"
  }
]
```

### POST /products

```http
POST /api/products
Authorization: Bearer ...
Content-Type: application/json

{
  "name": "Pizza Margherita",
  "categoryId": "uuid",
  "price": 22000,
  "isUsd": false,
  "imageUrl": "https://...",
  "description": "..."
}
```

**Respuesta 201:** producto creado.

### PUT /products/:id

```http
PUT /api/products/uuid
Authorization: Bearer ...
Content-Type: application/json

{
  "price": 23000,
  "active": false
}
```

### DELETE /products/:id

Soft-delete (`active = false`).

## 8.5 Órdenes

### GET /orders

```http
GET /api/orders?status=PENDING&startDate=2026-06-01&endDate=2026-06-30
```

**Filtros:**
- `status` — PENDING, PREPARING, READY, SERVED, CANCELLED
- `orderType` — MESA, PARA_LLEVAR, DOMICILIO
- `startDate`, `endDate` — ISO 8601
- `tableId` — uuid de mesa

### POST /orders

```http
POST /api/orders
Authorization: Bearer ...
Content-Type: application/json

{
  "tableId": "uuid",  // opcional
  "orderType": "MESA",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "notes": "Sin picante"
    }
  ],
  "notes": "Cliente frecuente",
  "discountPercent": 10
}
```

**Respuesta 201:**

```json
{
  "id": "uuid",
  "tableId": "uuid",
  "status": "PENDING",
  "totalCop": 32400,
  "totalUsd": 0,
  "exchangeRate": 4000,
  "items": [...],
  "createdAt": "2026-06-03T20:00:00.000Z"
}
```

**Side effect:** publica evento SSE `order:created` a todos los clientes.

### PUT /orders/:id/status

```http
PUT /api/orders/uuid
Authorization: Bearer ...
Content-Type: application/json

{
  "status": "PREPARING"
}
```

## 8.6 Mesas y Estado de Mesa

### GET /tables

```http
GET /api/tables?active=true
```

Devuelve mesas con flag `isOccupied` y `currentOrder`.

### PUT /tables/state — Endpoint Crítico (Versionado)

```http
PUT /api/tables/state
Authorization: Bearer ...
Content-Type: application/json

{
  "tableId": "uuid",
  "items": [
    {
      "product": { "id": "uuid", "name": "Coca-Cola", "price": 5000, "isUsd": false },
      "quantity": 2,
      "notes": ""
    }
  ],
  "_clientVersion": 5
}
```

**Respuesta 200 (sin conflicto):**

```json
{
  "versión": 6
}
```

**Respuesta 409 (conflicto):**

```json
{
  "conflict": true,
  "serverData": [...],
  "serverVersion": 7
}
```

**Respuesta 201 (nueva mesa):**

```json
{
  "versión": 0
}
```

**Side effect:** publica evento SSE `table:updated` a todos los demás clientes.

## 8.7 Configuración

### GET /settings/:key

```http
GET /api/settings/exchangeRate
```

**Respuesta 200:**

```json
{
  "key": "exchangeRate",
  "value": "4200",
  "type": "number"
}
```

### PUT /settings/:key

```http
PUT /api/settings/exchangeRate
Authorization: Bearer ...
Content-Type: application/json

{
  "value": "4300",
  "type": "number"
}
```

### GET /settings/qr — Endpoint Especial

```http
GET /api/settings/qr
```

**Respuesta 200:**

```json
{
  "url": "http://192.168.1.10:3002",
  "qrSvg": "<svg>...</svg>"
}
```

**Importante:** esta ruta está **antes** de `/settings/:key` en el router para no ser capturada por el wildcard.

## 8.8 Cierre de Caja

### POST /closures

```http
POST /api/closures
Authorization: Bearer ...
Content-Type: application/json

{
  "date": "2026-06-03",
  "notes": "Cierre turno noche",
  "exchangeRate": 4200
}
```

**Respuesta 201:**

```json
{
  "id": "uuid",
  "date": "2026-06-03T20:00:00.000Z",
  "orderCount": 47,
  "totalSalesCOP": 845000,
  "totalSalesUSD": 87.5,
  "totalExpenses": 32000,
  "exchangeRate": 4200,
  "notes": "Cierre turno noche"
}
```

Calcula automáticamente: suma de órdenes SERVED del día, resta gastos.

## 8.9 Server-Sent Events

### GET /events

```http
GET /api/events
Accept: text/event-stream
```

**Respuesta 200 OK:**

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

:heartbeat

event: order:created
data: {"id":"uuid","tableId":"uuid","status":"PENDING","totalCop":18000,...}

event: table:updated
data: {"tableId":"uuid","items":[...],"versión":6}

```

**Eventos publicados:**

| Evento | Cuándo | Payload |
|:-------|:-------|:--------|
| `order:created` | Nueva orden POST | objeto order completo |
| `order:updated` | PUT en orden | objeto order con cambios |
| `order:status:changed` | Cambio de status | `{id, status}` |
| `table:updated` | PUT /tables/state exitoso | `{tableId, items, versión}` |
| `table:cleared` | DELETE items de mesa | `{tableId}` |
| `menu:updated` | CRUD producto/categoría | `{type, id}` |

**Heartbeat**: comentario `:heartbeat` cada 30 segundos para mantener viva la conexión.

**Reconexión**: el cliente usa el API nativo `EventSource` que reconecta automáticamente.

## 8.10 Endpoints Auxiliares

### GET /health

```http
GET /api/health
```

**Respuesta 200:**

```json
{
  "status": "ok",
  "timestamp": "2026-06-03T21:00:00.000Z"
}
```

### GET /qr (HTML, no API)

```http
GET /qr
```

Devuelve página HTML con QR visualizado:

```html
<!DOCTYPE html>
<html>
<body>
  <div class="card">
    <h1>🔗 2Arbolitos POS</h1>
    <p>Escanea para abrir en tu dispositivo</p>
    <div class="qr"><svg>...</svg></div>
    <p>http://192.168.1.10:3002</p>
    <p>Conéctate a la misma red WiFi</p>
  </div>
</body>
</html>
```

## 8.11 Códigos de Error

### Formato de Error

```json
{
  "error": "Mensaje legible para el usuario"
}
```

### Errores Comunes

| Status | `error` típico | Causa |
|:-------|:---------------|:------|
| 400 | `"Faltan campos requeridos"` | Payload incompleto |
| 400 | `"La cantidad debe ser mayor a 0"` | Validación |
| 401 | `"Token no proporcionado"` | Sin header Authorization |
| 401 | `"Token inválido o expirado"` | JWT inválido |
| 403 | `"Usuario inactivo"` | `active = false` |
| 404 | `"Mesa no encontrada"` | ID inexistente |
| 409 | `"Versión desactualizada"` | Conflicto de TableState |
| 500 | `"Error interno del servidor"` | Error no controlado |

## 8.12 Ejemplo de Cliente JavaScript

```javascript
// src/lib/api.js
const BASE = '/api';

export async function apiGet(path) {
  const res = await fetchWithTimeout(`${BASE}${path}`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}

export async function apiPost(path, data) {
  const res = await fetchWithTimeout(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return res.json();
}

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
```

## 8.13 Versionado de la API

Actualmente la API es **v1 implícita** (sin prefijo de versión). En el futuro se introducirá `/api/v2/...` para cambios breaking. Los clientes detectarán la versión vía header de respuesta `X-API-Version: 1`.
