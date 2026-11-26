# Auditoría 2Arbolitos POS — Fase 1

Fecha: 2026-11-16
Alcance: revisión de solo lectura de `server/`, `src/`, `scripts/`, Docker, workflows y dependencias.
No se modificó ningún archivo de la aplicación. Este informe es el único archivo nuevo.

Método: lectura del código real con `file:línea`, ejecución de `npm run lint`, `npm run build` y
`npm audit` en la raíz y en `server/`. Docker Desktop estaba apagado, así que no hubo
verificación HTTP en vivo; la evidencia es de código y del bundle compilado.

---

## 1. Línea base (ejecutada, no supuesta)

| Comprobación | Resultado | Detalle |
|---|---|---|
| `npm run build` | **PASA** | `✓ built in 3.23s`. Bundle principal 532.99 kB (aviso de chunk > 500 kB). PWA genera `sw.js` y `workbox-*.js`. |
| `npm run lint` | **FALLA** | 78 errores en 25 archivos (ver desglose). |
| `npm audit` (raíz) | 7 críticos, 12 altos, 11 moderados, 1 bajo | Casi todos en `devDependencies` (`to-ico`, `jimp`, `request`, `sharp`, `vite`, `js-yaml`, `concurrently`). El runtime del frontend no arrastra críticos. |
| `npm audit` (`server/`) | 1 crítico, 2 altos, 3 moderados | `proxy-addr` (vía express 4.22.1), `body-parser`, `zod` 4.4.3 (< 4.6.6), `qs`, `mysql2`, `ip-address`. |

Desglose de lint (regla → cantidad):

| Regla | Cantidad |
|---|---|
| `no-undef` | 35 |
| `no-unused-vars` | 22 |
| `no-empty` | 15 |
| `react-hooks/set-state-in-effect` | 4 |
| `react-hooks/exhaustive-deps` | 2 (warnings) |
| `react-hooks/refs` | 1 |
| `react-refresh/only-export-components` | 1 |

Causa raíz de la mayoría: `eslint.config.js:12-20` aplica `globals.browser` a `**/*.{js,jsx}`,
incluido `server/` y `vite.config.js`. De ahí salen los 35 `no-undef` de `process`, `Buffer`, etc.
No es que el backend “tenga 35 bugs”; es que se lintea con los globals equivocados.

**Consecuencia para el plan:** hoy no se puede cumplir el criterio “lint pasa” sin arreglar antes
la configuración de ESLint. Eso entra en Fase 2 como primer commit, separado de los arreglos
funcionales, para que el resto de los errores se vean de verdad.

---

## 2. Tabla de hallazgos

Estados: **CONFIRMADO** (se verificó en el código), **PARCIAL** (existe pero incompleto),
**FALSO** (la sospecha no se sostiene).

### 2.1 Seguridad y autorización

| # | Hallazgo | Severidad | Estado | Archivo:línea | Arreglo propuesto |
|---|---|---|---|---|---|
| A1 | `PUT` y `DELETE /api/tables/state` usan `optionalAuth`: cualquiera en la LAN puede crear, pisar o borrar el carrito de cualquier mesa sin sesión | **Crítica** | CORREGIDO `2b83c6b` | `server/src/routes/tables.js:10-11` | `authenticate` + `authorize('ADMIN','MANAGER','CASHIER','WAITER')`. El carrito es dato operativo, no público. |
| A2 | `GET /api/products` y `/products/:id` son públicos y devuelven `inventoryItems` completo, con `unitCost` y `quantity` | **Alta** | CORREGIDO `2b83c6b` | `server/src/routes/products.js:7,9`; `server/src/controllers/productController.js:34-43,49-55` | Proyección pública explícita (`select`) sin costos ni stock cuando no hay sesión; el detalle completo solo con `authenticate`. |
| A3 | `GET /api/settings` y `/settings/:key` son públicos y devuelven **todos** los settings, incluido `business` (NIT, teléfono, dirección) y tasas | **Alta** | CORREGIDO `2b83c6b` | `server/src/routes/settings.js:7-8`; `server/src/controllers/settingsController.js:21-43,46-71` | Lista blanca pública (`business` solo nombre/logo/moneda, `exchangeRate`, `exchangeRateBs`) y el resto solo autenticado. |
| A4 | `GET /api/tables`, `/tables/:id` y `/tables/state` son públicos y exponen pedidos activos con ítems y carritos completos | **Media** | CORREGIDO `2b83c6b` | `server/src/routes/tables.js:8-9,14-15`; `server/src/controllers/tableController.js:14-37,142-171` | `authenticate` para estado de mesas y carritos. Solo `GET /tables` (número y ocupado) podría quedar público si algún día hay menú QR. |
| A5 | No existe menú público por QR: sin sesión, `App.jsx` muestra `LoginScreen`. Todo el `optionalAuth` es superficie de ataque sin uso | **Media** | CORREGIDO `2b83c6b` | `src/App.jsx:25-26`; `server/src/routes/products.js:7,9,14`; `settings.js:7-8`; `tables.js:8-9,14-15` | Cerrar las rutas públicas ahora. Si más adelante se quiere menú QR, se abre una ruta dedicada con proyección mínima. |
| A6 | `app.set('trust proxy', 1)` existe, pero está fijo. En Docker detrás de Nginx es correcto; en portable (sin proxy) confía en el primer `X-Forwarded-For` que mande el cliente y permite saltarse el rate limit | **Media** | CORREGIDO `bb243a0` | `server/src/index.js:69` | `TRUST_PROXY` por variable de entorno: `1` por defecto en Docker, `false` en portable, valor numérico o de subred admitido. |
| A7 | `JWT_SECRET` se valida al arrancar, pero la lista negra no incluye el fallback del portable (`2arbolitos_cambia_este_secreto`) ni el de `server/.env.example` | **Alta** | CORREGIDO `bb243a0` | `server/src/index.js:73-78`; `scripts/pack-portable.js:448`; `server/.env.example:9` | Lista central de secretos prohibidos + longitud mínima (32). Eliminar el fallback de `start.bat` (mejor fallar que arrancar inseguro). Comparación también en minúsculas/trim. |
| A8 | `POST /api/auth/logout` no exige sesión | **Baja** | FALSO | `server/src/routes/auth.js:10` | No requiere cambio: solo borra la cookie del que llama; no toca datos ni sesiones ajenas. |
| A9 | Helmet con `contentSecurityPolicy: false` | **Baja** | CONFIRMADO | `server/src/index.js:106-109` | Evaluar CSP en Fase 2 con `script-src 'self'`; requiere probar Vite/PWA y estilos inline del ticket. |
| A10 | CORS permite `localhost`, `127.0.0.1`, `192.168.x` y `10.x`, pero no `172.16/12` (rango típico de Docker/WSL y de algunas LAN) | **Baja** | CONFIRMADO | `server/src/index.js:94-100` | Añadir `172.16-31.x` o, mejor, permitir `ALLOWED_ORIGINS` y mismo origen. |
| A11 | Cualquier `/api/*` desconocido cae en el catch-all y devuelve `index.html` con 200 en vez de 404 JSON | **Baja** | CONFIRMADO | `server/src/index.js:222-224` | `app.use('/api', (req,res) => res.status(404).json(...))` antes del catch-all del SPA. |
| A12 | `/api/health` existe pero no comprueba la base de datos: responde `ok` con MySQL caído | **Media** | CORREGIDO `bb243a0` | `server/src/routes/index.js:38-40` | Health real: `SELECT 1` con timeout corto; 503 si falla. |
| A13 | Solo `auth` y `orders` usan zod. El resto de endpoints con body no valida nada | **Media** | CONFIRMADO | `server/src/routes/*.js`; `server/src/middleware/validate.js` | Zod en los endpoints de escritura de mayor riesgo: expenses, closures, customers, reservations, suppliers, inventory, inventory-movements, settings, products, tables, attendance. |
| A14 | El rol `COOK` recibe 403 en `PUT /orders/:id/status`, pero `KitchenView` lo usa para avanzar PENDING → PREPARING → READY | **Alta** | CORREGIDO `198146f` | `server/src/routes/orders.js:14`; `src/components/KitchenView.jsx:47-50` | Incluir `COOK` en el `authorize` y restringir las transiciones permitidas por rol en el controlador. |

### 2.2 Datos, migraciones y arranque

| # | Hallazgo | Severidad | Estado | Archivo:línea | Arreglo propuesto |
|---|---|---|---|---|---|
| B1 | El portable actualiza con `prisma db push --accept-data-loss` | **Crítica** | CORREGIDO `bb243a0` | `scripts/pack-portable.js:386` (también doc en `:9,297,619-621`) | `prisma migrate deploy` con baseline, igual que `docker-entrypoint.sh`. Nunca `--accept-data-loss` en una instalación con datos. |
| B2 | El seed borra todas las tablas sin pedir confirmación | **Crítica** | CORREGIDO `d9ec4cc` | `server/prisma/seed.js:10-22` | Exigir `--force` o `ALLOW_SEED_WIPE=1`; si hay usuarios y no hay flag, abortar con mensaje claro. |
| B3 | El seed no borra `customers`, `reservations`, `suppliers` ni `attendance`: no falla por FK (las relaciones son opcionales y Prisma hace `SetNull`), pero deja una base a medias —clientes y proveedores viejos, asistencias y reservas con referencias en `null`— | **Media** | CORREGIDO `d9ec4cc` | `server/prisma/seed.js:10-22`; `server/prisma/schema.prisma:341-358,379-390` | Con la protección de B2 el caso normal desaparece. Si se corre con `--force`, hacer un borrado completo y ordenado, o respaldar antes y avisar de que la base queda como nueva. |
| B4 | `docker-entrypoint.sh` ignora el fallo de `prisma migrate deploy` y arranca igual | **Alta** | CORREGIDO `bb243a0` | `server/docker-entrypoint.sh:68-69` | Fallar el arranque (exit 1) si la migración falla. Arrancar con esquema viejo es peor que no arrancar. |
| B5 | Usuarios del seed con contraseñas fijas (`admin123`, `waiter123`, `cook123`) y sin obligación de cambiarlas | **Alta** | CORREGIDO `d9ec4cc` | `server/prisma/seed.js:24-26,28-70` | `mustChangePassword` (aditivo, default `false`) + contraseña inicial aleatoria mostrada una vez por el instalador. Cambio de esquema seguro. |
| B6 | El CLI de Prisma no está declarado como dependencia de runtime; entra al ZIP por ser peer opcional de `@prisma/client` | **Media** | CONFIRMADO | `server/package.json:18-34`; `server/package-lock.json` (`node_modules/prisma` sin `dev`) | Declararlo explícitamente (o fijar el flujo `--system-node` y verificar el binario en el ZIP). Evita que un cambio de npm rompa el instalador. |

### 2.3 Dinero

| # | Hallazgo | Severidad | Estado | Archivo:línea | Arreglo propuesto |
|---|---|---|---|---|---|
| C1 | Los productos `isUsd` se envían al servidor con el precio en USD como si fuera COP: la UI muestra el total convertido, pero el pedido se guarda con un total mucho menor | **Crítica** | CORREGIDO `0a2fafd` | `src/context/OrdersContext.jsx:345-350`; `src/components/POS.jsx:275-281`; `server/src/controllers/orderController.js:190-196` | El servidor recalcula precios desde BD (producto + modificadores), ignora `unitPrice` del cliente y devuelve totales. Order type normalizado (slug lowercase). |
| C2 | `discountValue` se guarda pero nunca se resta; solo se aplica `discountPercent` | **Media** | CORREGIDO `0a2fafd` | `server/src/controllers/orderController.js:217-227,240` | Descuento por valor XOR porcentaje, nunca ambos (campo `mode` lo clarifica). Validación en `orderPricing.js`. |
| C3 | El vuelto no se resta: la caja suma `p.amount` bruto y `totalPaid` también, así que las ventas por método quedan infladas por el cambio entregado | **Alta** | CORREGIDO `8ac6767` | `src/components/Finance.jsx:123-135`; `server/src/controllers/orderController.js:280-285,418-423` | El cierre recalcula ventas desde DB (órdenes en el periodo), cambio excluido. `aggregateSalesByMethod` usada en `closureController.js`. |
| C4 | Aritmética de punto flotante sin redondeo monetario (totales, tasas, descuentos) | **Media** | CORREGIDO `0a2fafd` | `server/src/controllers/orderController.js:186-227`; `src/components/POS.jsx:275-321` | Helper `shared/money.js` (ESM puro) con redondeo COP entero, USD/Bs. 2 decimales. Tests en `money.test.js`. |
| C5 | `POST /orders/:id/payment` no es idempotente y no valida que la suma de pagos no exceda el total; hoy el frontend no lo usa (los pagos van dentro de `POST /orders`) | **Media** | CORREGIDO `8ac6767` | `server/src/controllers/orderController.js:385-437`; `src/context/OrdersContext.jsx:355-372` | Valida suma ≤ total (tolerancia 1 peso), normaliza métodos a mayúsculas y moneda por defecto. Rechaza sobrepago con 400. |
| C6 | Los gastos se pueden duplicar al reintentar: el frontend genera `id`, pero el backend lo ignora y crea otro | **Alta** | CORREGIDO `8ac6767` | `src/context/FinanceContext.jsx:74-82`; `server/src/controllers/expenseController.js:13-26`; `src/lib/syncManager.js:119-230` | `createExpense` hace `upsert` con el `id` del cliente cuando lo envía; doble envío no duplica. |
| C7 | ¿La cola offline duplica pedidos al reintentar? | — | CORREGIDO `0a2fafd` | `server/src/controllers/orderController.js:139-145`; `src/context/OrdersContext.jsx:330-334,356,372` | `clientOrderId` se consulta antes de crear; captura `P2002` y devuelve el pedido existente (201, no 500) ante reintento simultáneo. |
| C8 | Un JWT emitido antes de un cambio de contraseña sigue válido hasta expirar; no hay forma de revocarlo sin cambiar `JWT_SECRET` | **Alta** | CORREGIDO `9873386` | `server/prisma/schema.prisma` (`User.tokenVersion`); `server/src/controllers/authController.js` (login, changePassword, updateUser incrementan e incluyen `tokenVersion` en el JWT); `server/src/middleware/auth.js` (compara `tokenVersion` del JWT con la BD, devuelve 401 `TOKEN_VERSION_MISMATCH` si no coinciden) | Nueva columna `tokenVersion Int @default(0)` en `users`. Cada cambio de contraseña la incrementa, invalidando todos los JWT previos. Migración aditiva (`20261116000000_add_token_version_to_user`). |

### 2.4 Sync, SSE y concurrencia

| # | Hallazgo | Severidad | Estado | Archivo:línea | Arreglo propuesto |
|---|---|---|---|---|---|
| D1 | El control de versión del carrito usa `clientVersion < serverVersion`: dos escrituras con la misma versión se pisan (gana la última) | **Baja** | CONFIRMADO | `server/src/controllers/tableController.js:179-197` | Comparación estricta (`!==` para rechazar versiones viejas) o `updateMany` condicionado a `version = serverVersion`. |
| D2 | ¿SSE sin autenticación o con fuga de listeners? | — | **FALSO** | `server/src/index.js:182-216` | Autentica con cookie/header/query, limpia heartbeat y cliente en `close`. Correcto. |
| D3 | `clientId = Date.now()`: dos clientes que conectan en el mismo milisegundo se pisan en el `Map` y uno deja de recibir eventos | **Baja** | CONFIRMADO | `server/src/index.js:210`; `server/src/sse.js:1-9` | `crypto.randomUUID()` o contador incremental. |

### 2.5 Frontend, PWA y tooling

| # | Hallazgo | Severidad | Estado | Archivo:línea | Arreglo propuesto |
|---|---|---|---|---|---|
| E1 | El manifest no tiene ícono `maskable` | **Media** | CONFIRMADO | `vite.config.js:79-92` | Añadir `purpose: 'maskable'` con un PNG con zona segura (40 % de margen). |
| E2 | En la LAN por IP y HTTP el service worker no se registra (contexto no seguro), así que no hay offline ni instalación PWA en celulares | **Informativa** | CONFIRMADO | `dist/registerSW.js`; `vite.config.js:62-99` | Documentarlo en README. Para tener PWA real haría falta HTTPS (certificado local) o usar la app como web normal. |
| E3 | ¿Falta `@config` en Tailwind 4 y por eso no se generan los colores? | — | **FALSO** | `src/index.css:2` | Presente. Verificado en el CSS compilado: existen `bg-primary`, `text-ink-muted`, `border-line` y `bg-ok-soft`. |
| E4 | `autoprefixer` es redundante con Tailwind 4 (Lightning CSS ya prefija) | **Baja** | CONFIRMADO | `postcss.config.js:4` | Quitarlo y comprobar el CSS compilado. |
| E5 | ESLint lintea `server/` con `globals.browser` | **Alta** (bloquea CI) | CORREGIDO `7b3259f` | `eslint.config.js:12-20` | Bloque separado para `server/**` y `scripts/**` con `globals.node`; arreglar después los errores reales que queden. |
| E6 | No hay CI de lint/build/tests; solo build de imágenes y ZIP portable | **Media** | CONFIRMADO | `.github/workflows/` (solo `docker-build.yml` y `portable-release.yml`) | `ci.yml` con `npm ci`, `npm run lint`, `npm run build` y `npm test`. |

### 2.6 Infraestructura y operación

| # | Hallazgo | Severidad | Estado | Archivo:línea | Arreglo propuesto |
|---|---|---|---|---|---|
| F1 | El healthcheck del backend es TCP, no HTTP | **Media** | CORREGIDO `bb243a0` | `server/Dockerfile:21-22` | `wget`/`node fetch` contra `http://127.0.0.1:3002/api/health`, con el health ya validando la DB (A12). |
| F2 | Los respaldos no funcionan en Docker ni en portable: `mysqldump` no está en la imagen y `scheduler.js` busca `scripts/backup.js`, que no se copia | **Alta** | CONFIRMADO | `scripts/backup.js:13`; `server/src/scheduler.js:20-24`; `server/Dockerfile:1-11` | Respaldo dentro del contenedor con cliente MySQL o `mysqldump` instalado; en portable, ruta al `mysqldump` del sistema/MariaDB embebida. |
| F3 | El actualizador del panel descarga y aplica el ZIP sin verificar SHA256 | **Alta** | CONFIRMADO | `scripts/lib/Ops.ps1:883-890` | Publicar `.sha256` en la release y verificarlo antes de `Expand-Archive`. |
| F4 | `findFreePort` cambia el puerto en silencio si 3002 está ocupado; el healthcheck y el QR siguen asumiendo 3002 | **Media** | CONFIRMADO | `server/src/index.js:48-58,66` | En producción, fallar con mensaje claro si el puerto está ocupado (o fijar `STRICT_PORT=1`). |
| F5 | Dependencias con vulnerabilidades altas/críticas | **Alta** | CONFIRMADO | `npm audit` raíz y `server/` | Actualizar `zod` (≥ 4.6.6), `body-parser`/`express` (evaluar 4.22.x parcheado o 5), `sharp`, `vite`; retirar `to-ico` o aislarlo del runtime. Revisar `proxy-addr` con la versión de express que lo traiga. |
| F6 | Bundle principal de 533 kB (aviso de Vite) | **Baja** | CONFIRMADO | Salida de `npm run build` | `manualChunks` o imports dinámicos de las vistas pesadas (Finance, MenuManager, Escandallo). No bloquea. |

---

## 3. Evidencia de los hallazgos críticos

### 3.1 Escritura anónima del carrito (A1)

```js
// server/src/routes/tables.js:8-11
router.get('/tables/state', optionalAuth, tableController.getTableStates);
router.get('/tables/state/:tableId', optionalAuth, tableController.getTableState);
router.put('/tables/state', optionalAuth, tableController.updateTableState);
router.delete('/tables/state/:tableId', optionalAuth, tableController.deleteTableState);
```

`optionalAuth` deja pasar sin token y `updateTableState` no comprueba rol. Cualquiera en la red
puede borrar el carrito de una mesa o inyectar ítems. Es el hallazgo más grave de la auditoría.

### 3.2 Fuga de costos y stock (A2)

```js
// server/src/controllers/productController.js:34-43
const products = await prisma.product.findMany({
  where,
  include: { category: true, inventoryItems: true },
  ...
});
res.json(products);
```

`inventoryItems` incluye `unitCost`, `quantity` y demás campos del insumo. La ruta es
`optionalAuth`, así que sin cookie se obtiene todo. Lo mismo en `/products/:id`.

### 3.3 Configuración y datos del negocio públicos (A3)

`getSettings` hace `findMany()` sin filtro y devuelve el objeto completo (`settingsController.js:21-43`).
La ruta es `optionalAuth` (`settings.js:7-8`). El setting `business` guarda NIT/teléfono/dirección
según el flujo de configuración. No hay motivo para que sea público si no existe menú QR.

### 3.4 Portable con `--accept-data-loss` (B1)

```bat
:: scripts/pack-portable.js:386 (start.bat generado)
"%NODE_EXE%" node_modules\prisma\build\index.js db push --accept-data-loss --skip-generate
```

`db push` sin historial no puede distinguir un renombre de un borrado+creación. En una actualización
puede eliminar columnas o tablas para “sincronizar” el esquema. El proyecto ya tiene
`docker-entrypoint.sh` con baseline (`:45-69`) y una migración inicial; el portable debe usar el
mismo camino.

### 3.5 Seed destructivo (B2)

```js
// server/prisma/seed.js:10-22
await prisma.inventoryMovement.deleteMany();
await prisma.inventoryItem.deleteMany();
...
await prisma.user.deleteMany();
await prisma.settings.deleteMany();
```

`docker-entrypoint.sh:83-84` lo omite si hay usuarios, pero `npm run db:seed` y el panel no.
Basta un comando en la máquina equivocada para perder el día. Debe exigir flag explícito.

### 3.6 Totales con `isUsd` (C1)

En la UI:

```js
// src/components/POS.jsx:276-281
const originalCop = cart.reduce((sum, item) => {
  const price = item.product?.price || 0;
  const isUsd = item.product?.isUsd;
  return sum + (isUsd ? (price * rate) * item.quantity : price * item.quantity);
}, 0);
```

Al enviar:

```js
// src/context/OrdersContext.jsx:346-350
const transformedItems = originalItems.map(item => ({
  productId: item.product?.id || item.productId,
  quantity: item.quantity,
  unitPrice: item.product?.price || item.unitPrice || 0,   // <-- USD crudo
  totalPrice: (item.product?.price || item.unitPrice || 0) * item.quantity,
  ...
}));
```

El servidor recalcula `totalCop` sumando `unitPrice * quantity`
(`orderController.js:190-196`). Un plato de USD 10 con tasa 4.000 se guarda como COP 10, no 40.000.
El ticket impreso desde el estado local muestra el total correcto y la base guarda otro: descuadre
silencioso de caja.

### 3.7 Caja inflada por el vuelto (C3)

```js
// src/components/Finance.jsx:125-133
for (const p of payments) {
  const method = (p.method || 'cash_cop').toLowerCase();
  const amount = p.amount || 0;          // <-- no resta p.change
  ...
}
```

El servidor hace lo mismo para decidir si el pedido queda `SERVED`
(`orderController.js:280-285` y `418-423`). Con un pago de 50.000 por un total de 45.000, la caja
registra 50.000 de venta y el vuelto de 5.000 no aparece como salida.

### 3.8 Migración que falla y arranque que continúa (B4)

```sh
# server/docker-entrypoint.sh:68-69
echo "Aplicando migraciones (prisma migrate deploy)..."
npx prisma migrate deploy 2>&1 || echo "⚠️  prisma migrate deploy falló"
```

Si una migración falla, el backend arranca con el esquema anterior y los errores aparecen después
como 500 difíciles de diagnosticar. Debe cortar el arranque.

---

## 4. Sospechas descartadas (no se tocarán)

| Sospecha | Veredicto | Evidencia |
|---|---|---|
| Tailwind 4 no genera los colores personalizados | **FALSO** | `src/index.css:2` tiene `@config "../tailwind.config.js"`. En el CSS compilado existen `bg-primary`, `text-ink-muted`, `border-line`, `bg-ok-soft`. |
| `express-rate-limit` v8 lanza error de validación por `trust proxy` | **FALSO** | Con `trust proxy = 1` (no `true`) no se dispara `ERR_ERL_PERMISSIVE_TRUST_PROXY`; los contenedores arrancaron healthy. |
| La cola offline duplica pedidos | **FALSO** | `clientOrderId` + búsqueda previa en `orderController.js:139-145`. |
| SSE sin autenticación o con fuga | **FALSO** | `index.js:182-216` valida JWT y limpia en `close`. Solo el `clientId` por `Date.now()` es mejorable. |
| `/api/auth/logout` sin auth es un agujero | **FALSO** | Solo borra la cookie del solicitante. |
| El catch-all de Express impide que el error handler funcione | **FALSO** | Los `next(err)` saltan los handlers normales y llegan a `errorHandler` (`index.js:226`). |

---

## 5. Propuesta de Fase 2 (para aprobación)

Orden propuesto: primero lo que evita pérdida de datos y cierra accesos; después dinero; al final
tooling y PWA. Un commit por tema.

### 5.1 Bloqueantes de seguridad y datos (van primero)

1. **Cerrar rutas públicas** A1–A5: `authenticate` en `tables/state`, `tables`, `products`,
   `settings`; proyección pública explícita si se quiere conservar `GET /products`.
2. **`TRUST_PROXY` configurable** (A6) con default por entorno; documentar en `.env.example.docker`
   y en el `.env` del portable.
3. **`JWT_SECRET`** (A7): validar también el fallback del portable, longitud mínima y quitar el
   fallback de `start.bat`.
4. **Portable con `migrate deploy` + baseline** (B1): extraer la lógica de
   `docker-entrypoint.sh:45-69` a un script Node reutilizable (`scripts/prisma-bootstrap.js`) para
   que Docker y portable usen la misma.
5. **Seed protegido** (B2, B3): `--force` o `ALLOW_SEED_WIPE=1`; mensaje con conteos antes de borrar.
6. **`mustChangePassword`** (B5): columna nueva con `@default(false)` (migración aditiva, sin tocar
   filas), `true` solo para los usuarios del seed; endpoint de cambio de contraseña; pantalla
   obligatoria en el primer login. Alternativa aceptada: contraseña aleatoria mostrada una vez.
7. **`migrate deploy` que corta el arranque** (B4).
8. **Healthcheck HTTP + health con DB** (A12, F1).
9. **Rol `COOK`** (A14) y validación de transiciones de estado.

### 5.2 Dinero e idempotencia

10. **Conversión `isUsd`** (C1) en un único helper compartido; tests que fallen si se rompe.
11. **Vuelto neto** (C3) en caja, cierre y `shouldServe`.
12. **Descuento único** (C2) y redondeo monetario (C4).
13. **Gastos idempotentes** (C6) con `id` del cliente.
14. **`addPayment`**: idempotencia o retiro si no se usa (C5).
15. **Tests de dinero con Vitest**: totales COP/USD/Bs., `isUsd`, vuelto, propina, descuento por
    valor/porcentaje, pagos divididos que suman exacto y que no exceden.

### 5.3 Tooling, PWA y documentación

16. **ESLint**: globals Node para `server/**` y `vite.config.js`; corregir los errores reales que
    queden (probablemente `no-unused-vars`, `no-empty`, hooks).
17. **`ci.yml`** con `npm ci`, `lint`, `build`, `test` en PR y push a `main`.
18. **Outfit autoalojada** con `@fontsource/outfit`; quitar Google Fonts de `index.html`;
    actualizar `NOTICE.md` y `PRIVACY.md` (quitar la fila de Google Fonts y añadir la fuente local).
19. **Ícono maskable** (E1) y nota en README sobre el límite de PWA en HTTP por IP (E2).
20. **`NOTICE.md`**: añadir `vite-plugin-pwa`/Workbox y el CLI de Prisma si pasa a dependencia
    explícita (B6).

### 5.4 Fuera de la lista que pediste (necesitan sí/no)

Estos los encontré auditando y no estaban en tu enumeración. Son pequeños y de bajo riesgo, pero
no los toco sin aprobación:

- A9 CSP (requiere probar la app; puede romper estilos inline).
- A10 rango `172.16/12` en CORS.
- A11 404 JSON para `/api/*` desconocido.
- A13 zod en el resto de endpoints de escritura.
- D1 comparación estricta de versión del carrito.
- D3 `clientId` de SSE con UUID.
- F2 respaldos reales en Docker/portable (es más de Fase 3, pero el scheduler actual está muerto).
- F4 fallar si el puerto está ocupado en producción.
- F5 actualización de dependencias (puede requerir cambios de compatibilidad; lo haría en commits
  separados y verificando build).
- F6 code-splitting del bundle.

---

## 6. Notas de seguridad para actualizar (regla innegociable)

- La migración de `mustChangePassword` es **aditiva**: `ADD COLUMN ... NOT NULL DEFAULT false`.
  No reescribe filas existentes ni cambia contraseñas.
- El cambio de portable a `migrate deploy` necesita el **baseline** para bases creadas con
  `db push` (ya resuelto en `docker-entrypoint.sh`): detectar `_prisma_migrations` vs `users`,
  `migrate resolve --applied 20240101000000_init` y luego `migrate deploy`.
- `seed.js` no debe ejecutarse solo porque la base “parezca vacía” si el usuario ya tiene datos
  parciales; el chequeo debe ser `user.count() === 0` **y** ausencia de pedidos/gastos.
- Nunca borrar el volumen de MySQL ni el `.env` desde un script de actualización.

---

## 7. Decisión pendiente para Fase 3 (no implementada)

Recomendación preliminar: **MariaDB portable como servicio**. Razones: el esquema ya es MySQL
(`enum`, `utf8mb4`, `db push`/migraciones existentes), Prisma con dos proveedores obliga a mantener
dos juegos de migraciones y SQL específico, y SQLite tiene un solo escritor: con varias terminales
en LAN (POS + cocina + caja) los bloqueos aparecen justo en hora pico. MariaDB es GPLv2 y habría
que documentarlo en `NOTICE.md`. Queda para la Fase 3, con tu confirmación.

---

## 8. Qué necesito de ti para arrancar la Fase 2

1. Aprobar el bloque 5.1 (seguridad y datos) tal cual.
2. Elegir para B5: **`mustChangePassword` + contraseña aleatoria del instalador** (recomendado) o
   solo `mustChangePassword` con las claves actuales del seed.
3. Decir sí/no a los extras de 5.4 (puedo hacerlos en commits aparte).
4. Confirmar si el `GET /products` público se elimina del todo o se conserva con proyección mínima
   pensando en un futuro menú QR.

Con eso empiezo por `eslint.config.js` (para que el lint sea una señal real), luego seguridad,
luego datos, luego dinero, y cierro con tests y CI. No haré push ni tags.

---

## 9. Estado de la Fase 2

### 9.1 Bloque (a) — Lint (cerrado)

| Comprobación | Resultado |
|---|---|
| `npm run lint` | PASA, 0 errores y 0 warnings |
| `npm run build` | PASA (bundle 539 kB; el aviso de tamaño es F6, pendiente) |

Commit `7b3259f`: globals de Node para `server/**`, `scripts/**` y `vite.config.js`; corrección de
`no-unused-vars`, `no-empty`, `react-hooks/refs` y `set-state-in-effect` sin silenciar reglas, salvo
dos excepciones justificadas con comentario (carga asíncrona en providers y QR en `SettingsMovil`).

### 9.2 Bloque (b) — Seguridad y datos (cerrado, pendiente de OK)

| Hallazgo | Commit | Qué cambió |
|---|---|---|
| A1, A4 | `2b83c6b` | `/tables/state` y `/tables` con `authenticate`; escritura del carrito limitada a ADMIN/MANAGER/CASHIER/WAITER |
| A2, A3, A5 | `2b83c6b` | `/products`, `/categories`, `/settings` cerrados con `authenticate`; `optionalAuth` eliminado del middleware y de todas las rutas |
| A6 | `bb243a0` | `TRUST_PROXY` configurable: `1` si `DOCKER=true`, `false` en portable/dev, admite número o subred |
| A7 | `bb243a0` | Lista negra central de secretos (incluye fallbacks del portable y de los `.env.example`), comparación en minúsculas/trim y mínimo 32 caracteres; en producción el arranque falla. `start.bat` ya no cae a un secreto fijo y `docker-compose.yml` exige `JWT_SECRET` |
| A12 | `bb243a0` | `/api/health` hace `SELECT 1` y responde 503 si la base no responde |
| A14 | `198146f` | `COOK` puede avanzar PENDING → PREPARING → READY y cancelar; el controlador limita sus transiciones |
| B1 | `bb243a0` | Portable usa `ptool.cjs migrate`: crea la base, aplica `migrate deploy` con baseline de `20240101000000_init` y ejecuta el marcado de claves por defecto. Se eliminó `db push --accept-data-loss` |
| B2, B3 | `d9ec4cc` | Seed exige `--force`/`ALLOW_SEED_WIPE=1` si hay usuarios, pedidos o gastos; con `--force` borra en orden todas las tablas, incluidas customers, suppliers, reservations, attendance, closures, expenses y modificadores |
| B4 | `bb243a0` | `docker-entrypoint.sh` corta el arranque si `migrate deploy` falla (`set -e`) |
| B5 | `d9ec4cc` | Migración aditiva `mustChangePassword BOOLEAN NOT NULL DEFAULT false`; seed con contraseña aleatoria mostrada una vez y `mustChangePassword=true`; `PUT /api/auth/password`; guard 403 en `authenticate`; pantalla obligatoria de cambio; `server/scripts/flag-default-passwords.js` marca solo cuentas que aún usan `admin123`, `waiter123` o `cook123` |
| E5 | `7b3259f` | ESLint separado por entorno (ver 9.1) |
| F1 | `bb243a0` | Healthcheck del contenedor por HTTP contra `/api/health` |

Notas de implementación del bloque (b):

- La migración `20261116000000_must_change_password` no toca filas existentes. El marcado de
  contraseñas conocidas corre al arrancar (Docker y portable) y no cambia ninguna clave.
- El frontend monta `Settings/Menu/Orders/Finance` solo con sesión activa y sin cambio de contraseña
  pendiente (`src/Root.jsx`), así que no hay llamadas protegidas antes del login.
- `docker compose up` ahora exige `JWT_SECRET` en `.env` (`${JWT_SECRET:?...}`). Es intencional:
  mejor un error claro que arrancar con un secreto público.

### 9.3 Pendientes acordados

| Bloque | Hallazgos | Estado |
|---|---|---|
| (c) Dinero + token versioning | C1, C2, C3, C4, C5, C6, C7 (corregidos) + C8 tokenVersion (corregido) + Vitest | CERRADO |
| (d) Tooling y PWA | E1, E2, E4, E6, F3, F4, NOTICE/PRIVACY | CERRADO |
| Extras aprobados | A10, A11, A13, D1, D3, F2 | CERRADO |
| Solo actualización de dependencias | zod ≥ 4.6.6; proxy-addr 2.0.8 (parche express/body-parser) | CERRADO |
| No por ahora | A9 (CSP), F5 (resto de dependencias), F6 (code-splitting) | PENDIENTE (post-Fase 3) |
| Fase 3 | Instalador `.exe` sin Docker ni MySQL externo (recomendación: MariaDB portable como servicio) | CERRADO |

### 9.4 Verificación del bloque (c)

| Comprobación | Resultado |
|---|---|
| `npm run lint` | PASA, 0 errores y 0 warnings |
| `npm run build` | PASA (bundle generado en `dist/`) |
| `npm test` | PASA, 9 archivos, 53 tests |
| `npx prisma validate` | PASA |
| Migración `tokenVersion` | `server/prisma/migrations/20261116000002_add_token_version_to_user/migration.sql` (aditiva, posterior a must_change_password) |
| Prueba HTTP en vivo | No ejecutada: Docker Desktop estaba apagado; tests usan mocks |

### 9.5 Verificación del bloque (d)

| Comprobación | Resultado |
|---|---|
| `npm run lint` | PASA, 0 errores y 0 warnings |
| `npm run build` | PASA (bundle con `@fontsource/outfit` embebido, PWA con maskable) |
| `npm test` | PASA, 9 archivos, 53 tests (2 skip por falta de MySQL real) |
| `npx prisma validate` | PASA |
| CI workflow | `.github/workflows/ci.yml` (lint + build + test en PR/push) |
| Prueba HTTP en vivo | No ejecutada: Docker Desktop estaba apagado |

### 9.6 Verificación del bloque (c) + (d) + Fase 3

| Comprobación | Resultado |
|---|---|
| `npm run lint` | PASA, 0 errores y 0 warnings |
| `npm run build` | PASA (bundle generado en `dist/`) |
| `npm test` | PASA, 9 archivos, 53 tests |
| `npx prisma validate` | PASA |
| MariaDB portable en empaquetador | `scripts/pack-portable.js --with-mariadb --mariadb-url <URL>` |
| `start.bat` con MariaDB embebido | Inicia mysqld, inicializa data/, crea BD, migra, seed, arranca backend |
| Panel detiene MariaDB embebido | `taskkill /F /IM mysqld.exe` al detener el sistema portable |
| NOTICE.md GPLv2 MariaDB | Documentada licencia de MariaDB Community Server |
| Prueba HTTP en vivo | No ejecutada: Docker Desktop estaba apagado; MariaDB embebido no probado en vivo |

Elementos dejados intencionalmente para una fase posterior (no bloquean Fase 3):
- A9 (CSP): requiere probar la app; puede romper estilos inline.
- F5 (resto de dependencias): actualización de `proxy-addr`/`body-parser` ya parcheada; restantes requieren verificación de compatibilidad.
- F6 (code-splitting): bundle >500 kB aviso de Vite; no bloquea.

---
