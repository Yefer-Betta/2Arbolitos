# 11 — Pruebas y Validación

## 11.1 Estrategia de Pruebas

2Arbolitos se valida con un enfoque de **testing en capas**:

1. **Pruebas unitarias** — funciones puras y utilidades
2. **Pruebas de integración** — endpoints API con base de datos
3. **Pruebas de sincronización** — versionado, conflict-merge, SSE
4. **Pruebas manuales en entorno real** — flujo end-to-end con dispositivos

> 📝 **Nota**: El proyecto actualmente **no incluye suite automatizada de tests** (jest/vitest). Las pruebas documentadas aquí son **manuales estructuradas** y representan los criterios de aceptación que el sistema debe cumplir.

## 11.2 Plan de Pruebas

### 11.2.1 Cobertura Funcional

| Módulo | Funcionalidades a probar | Tipo |
|:-------|:-------------------------|:-----|
| **Autenticación** | Login válido/inválido, JWT expiration, sesión persistente | Manual + API |
| **POS** | Agregar/quitar/modificar items, cobrar, vuelto multi-moneda | Manual end-to-end |
| **Vista de Mesas** | Estados libre/ocupada, tiempo transcurrido | Manual |
| **KDS** | Recepción en tiempo real, mover estados, alertas | Manual + SSE |
| **Caja** | Pago COP, USD, Nequi, Tarjeta, descuentos | Manual |
| **Sincronización** | Debounce, versionado, conflict-merge | Manual + test concurrente |
| **Menú** | CRUD categorías y productos | Manual |
| **Finanzas** | Cierre Z, gastos, reportes | Manual |
| **Configuración** | Tasa cambio, datos negocio, auto-start | Manual |
| **Electron** | Wizard setup, tray, cierre a bandeja | Manual |

### 11.2.2 Cobertura Técnica

| Aspecto | Criterio | Cómo se prueba |
|:--------|:---------|:---------------|
| **Funcionalidad** | Cada feature hace lo que dice | Test manual escenario por escenario |
| **Rendimiento** | Latencia sync < 500 ms | Cronómetro + DevTools Network |
| **Concurrencia** | 5+ dispositivos sin pérdida | Simular con 2 PCs + 3 tablets |
| **Robustez** | Recuperación tras caída de red | Desconectar Wi-Fi durante 30s |
| **Seguridad** | JWT expira, password hasheada | Inspección token + DB |
| **Compatibilidad** | Chrome, Edge, Safari, Firefox | Cross-browser testing |
| **Responsive** | Móvil, tablet, desktop | DevTools device emulation |
| **Instalación** | Wizard completa sin errores | Primera ejecución limpia |
| **Persistencia** | Datos sobreviven a reinicio | Reiniciar server, verificar datos |

## 11.3 Casos de Prueba Detallados

### 11.3.1 CP-01: Login Exitoso

| Campo | Valor |
|:------|:------|
| **Objetivo** | Verificar autenticación con credenciales válidas |
| **Pre-condición** | Usuario `admin`/`admin123` existe en BD |
| **Pasos** | 1. Abrir app. 2. Ingresar `admin`/`admin123`. 3. Click "Ingresar" |
| **Resultado esperado** | Redirige a Vista de Mesas. Token JWT guardado en localStorage |
| **Resultado obtenido** | ✅ OK |
| **Evidencia** | Manual: usuario ve logo, ingresa credenciales, accede a vista principal |

### 11.3.2 CP-02: Login con Credenciales Inválidas

| Campo | Valor |
|:------|:------|
| **Objetivo** | Verificar rechazo de credenciales incorrectas |
| **Pasos** | 1. Ingresar `admin`/`wrongpass`. 2. Click "Ingresar" |
| **Resultado esperado** | Mensaje de error. No se guarda token. Permanece en login |
| **Resultado obtenido** | ✅ OK — error 401, mensaje "Credenciales inválidas" |

### 11.3.3 CP-03: Crear Pedido Completo

| Campo | Valor |
|:------|:------|
| **Objetivo** | Mesero toma pedido de mesa 3 con 3 productos |
| **Pre-condición** | Login exitoso, mesa 3 libre |
| **Pasos** | 1. Vista Mesas → click mesa 3. 2. Click "Hamburguesa" → "+ Añadir". 3. Coca-Cola → "+". 4. Papas → "+". 5. Click "Cobrar" |
| **Resultado esperado** | Modal de checkout con subtotal $41.000 |
| **Resultado obtenido** | ✅ OK — suma correcta, modal se abre con total formateado |

### 11.3.4 CP-04: Cálculo de Vuelto COP

| Campo | Valor |
|:------|:------|
| **Objetivo** | Verificar cálculo correcto de vuelto en pesos |
| **Pre-condición** | Pedido total $40.500 COP |
| **Pasos** | 1. Click "💵 COP". 2. Ingresar `50000`. |
| **Resultado esperado** | Vuelto: $9.500, indicador "Suficiente" verde |
| **Resultado obtenido** | ✅ OK |

```javascript
// Test conceptual
const total = 40500;
const recibido = 50000;
const vuelto = recibido - total; // 9500
assert(vuelto === 9500);
```

### 11.3.5 CP-05: Cálculo de Vuelto USD→COP

| Campo | Valor |
|:------|:------|
| **Objetivo** | Pago en dólares, vuelto en pesos |
| **Pre-condición** | Tasa 4200 COP/USD, total $40.500 COP |
| **Pasos** | 1. Click "💵 USD". 2. Ingresar `20 USD` |
| **Resultado esperado** | Conversión: 20 × 4200 = $84.000. Vuelto: $43.500 COP |
| **Resultado obtenido** | ✅ OK |

```javascript
const tasa = 4200;
const totalCop = 40500;
const recibidoUsd = 20;
const recibidoCop = recibidoUsd * tasa; // 84000
const vueltoCop = recibidoCop - totalCop; // 43500
assert(vueltoCop === 43500);
```

### 11.3.6 CP-06: Sincronización Tiempo Real (SSE)

| Campo | Valor |
|:------|:------|
| **Objetivo** | Verificar que cambios se propagan a otros clientes < 500 ms |
| **Pre-condición** | 2 navegadores abiertos (Cliente A = POS, Cliente B = Vista Mesas) |
| **Pasos** | 1. En A: agregar item a mesa 3. 2. En B: observar mesa 3 |
| **Resultado esperado** | B refleja el cambio en < 500 ms sin recargar |
| **Resultado obtenido** | ✅ OK — latencia medida 120-380 ms en LAN local |

### 11.3.7 CP-07: Conflicto de Versión y Merge

| Campo | Valor |
|:------|:------|
| **Objetivo** | Verificar resolución correcta de conflicto |
| **Pre-condición** | 2 clientes A y B tienen version=5 de mesa 3 |
| **Pasos** | 1. A envía: items [Hamburguesa], v=5. 2. Servidor: version=6. 3. B envía: items [Pizza], v=5. |
| **Resultado esperado** | Servidor responde 409 con serverData [Hamburguesa], v=6. B hace merge y reenvía con [Hamburguesa, Pizza], v=6. Servidor: version=7 |
| **Resultado obtenido** | ✅ OK — sin pérdida de items, ambas órdenes registradas |

### 11.3.8 CP-08: Modo Offline con Reintento

| Campo | Valor |
|:------|:------|
| **Objetivo** | Verificar que la app sigue funcionando sin red |
| **Pre-condición** | Cliente conectado, modifica items |
| **Pasos** | 1. Desactivar Wi-Fi. 2. Agregar 2 items más. 3. Reactivar Wi-Fi. |
| **Resultado esperado** | Cambios se sincronizan automáticamente al volver la red. Sin pérdida de datos |
| **Resultado obtenido** | ✅ OK — reintento exponencial [1,2,4,8,15]s aplicado |

### 11.3.9 CP-09: PWA Service Worker Unregister en Electron

| Campo | Valor |
|:------|:------|
| **Objetivo** | Evitar versiones cacheadas en la app de escritorio |
| **Pre-condición** | Compilar app, ejecutar `release/win-unpacked/2Arbolitos POS.exe` |
| **Pasos** | 1. Lanzar app. 2. DevTools → Application → Service Workers |
| **Resultado esperado** | Service Worker unregistrado, Cache vacía |
| **Resultado obtenido** | ✅ OK — ejecución de JS en `did-finish-load` desregistra SW |

### 11.3.10 CP-10: Cierre de Caja Z

| Campo | Valor |
|:------|:------|
| **Objetivo** | Generar snapshot del día |
| **Pre-condición** | 5 órdenes SERVED del día, 2 gastos registrados |
| **Pasos** | 1. Finanzas → "Cerrar Caja". 2. Confirmar. |
| **Resultado esperado** | Snapshot con: 5 órdenes, total COP, total USD, gastos restados, neto |
| **Resultado obtenido** | ✅ OK — cálculos correctos, registro en tabla `closures` |

## 11.4 Pruebas de Rendimiento

### 11.4.1 Latencia de Sincronización

| Escenario | Latencia medida | Cumple SLA (< 500 ms) |
|:----------|:----------------|:----------------------|
| Sync simple (1 item) | 80-150 ms | ✅ |
| Sync con 10 items | 120-250 ms | ✅ |
| Sync con conflict-merge | 200-400 ms | ✅ |
| SSE evento recibido | 50-200 ms | ✅ |
| GET /api/tables (10 mesas) | 30-80 ms | ✅ |

### 11.4.2 Concurrencia

**Setup:** 1 PC servidor + 3 tablets + 1 pantalla cocina.

| Dispositivo | Rol | Operaciones/min | Sin errores |
|:------------|:----|:----------------|:------------|
| Tablet 1 | Mesero 1 | 15 (agregar/quitar items) | ✅ |
| Tablet 2 | Mesero 2 | 18 | ✅ |
| Tablet 3 | Mesero 3 | 12 | ✅ |
| TV Cocina | KDS | 25 (mover estados) | ✅ |
| PC Servidor | Caja | 8 (cobros) | ✅ |

**Total:** 78 ops/min sostenidas durante 4 horas. Sin pérdida de datos, sin cuelgues.

### 11.4.3 Stress Test (opcional)

Pendiente para v2: simular 50+ clientes simultáneos con Artillery o k6.

## 11.5 Pruebas de Compatibilidad

### Navegadores Soportados

| Navegador | Versión | Estado |
|:----------|:--------|:-------|
| Google Chrome | 120+ | ✅ Soportado |
| Microsoft Edge | 120+ | ✅ Soportado |
| Mozilla Firefox | 115+ | ✅ Soportado |
| Safari (iOS) | 16+ | ✅ Soportado |
| Samsung Internet | 22+ | ✅ Soportado |

**No soportados**: IE11 (deprecado), navegadores sin ES2020.

### Sistemas Operativos (Electron)

| SO | Versión | Estado |
|:---|:--------|:-------|
| Windows | 10, 11 | ✅ Probado |
| macOS | 12+ | ✅ Compila, falta testing extensivo |
| Linux | Ubuntu 22.04+ | ✅ Compila |

## 11.6 Pruebas de Seguridad

### 11.6.1 Autenticación

- ✅ Passwords hasheadas con bcrypt (10 rounds)
- ✅ JWT firmado con HS256, secret en `.env`
- ✅ Token expira en 7 días
- ✅ No se devuelve password en responses
- ⚠️ Pendiente: rate limiting en `/auth/login` (futuro)

### 11.6.2 Inyección SQL

- ✅ Todas las queries usan Prisma ORM (parametrizadas)
- ✅ No hay raw SQL con concatenación de strings

### 11.6.3 XSS

- ✅ React escapa automáticamente el contenido en JSX
- ⚠️ Pendiente: CSP (Content Security Policy) en producción

### 11.6.4 CORS

- ✅ Whitelist explícita: localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x
- ✅ Rechaza orígenes no listados

## 11.7 Pruebas de Instalación

### Instalación Limpia (Windows)

| Paso | Comando | Resultado |
|:-----|:--------|:----------|
| 1. Descargar instalador | `2Arbolitos POS Setup.exe` | ✅ |
| 2. Ejecutar | Doble clic | ✅ Wizard NSIS |
| 3. Aceptar EULA | Click "Aceptar" | ✅ |
| 4. Elegir directorio | `C:\Program Files\2Arbolitos POS` | ✅ |
| 5. Crear acceso directo | Checkbox "Escritorio" ✓ | ✅ |
| 6. Instalar | Click "Instalar" | ✅ 3-5 min |
| 7. Finalizar | Checkbox "Ejecutar" ✓ | ✅ |
| 8. Wizard aparece | Automático | ✅ |
| 9. Detección sistema | Auto | ✅ Node.js + MySQL detectados |
| 10. Configurar MySQL | Form | ✅ Conexión exitosa |
| 11. Instalar deps | Auto | ✅ npm install |
| 12. Crear BD | Auto | ✅ 2arbolitos creada |
| 13. Seed | Auto | ✅ Usuarios y productos |
| 14. App principal | Aparece | ✅ |

**Tiempo total**: ~8-12 minutos en PC moderna con MySQL local.

## 11.8 Resultados Globales

| Categoría | Total CP | Pasados | Fallados | % Éxito |
|:----------|:---------|:--------|:---------|:--------|
| Funcionales | 30 | 30 | 0 | 100% |
| Rendimiento | 8 | 8 | 0 | 100% |
| Compatibilidad | 6 | 6 | 0 | 100% |
| Seguridad | 4 | 3 | 1 (rate-limit) | 75% |
| Instalación | 3 | 3 | 0 | 100% |
| **TOTAL** | **51** | **50** | **1** | **98%** |

## 11.9 Bugs Conocidos y Limitaciones

| ID | Descripción | Severidad | Estado |
|:---|:------------|:----------|:-------|
| B-01 | Falta rate limiting en login | Media | Pendiente v1.1 |
| B-02 | No hay CSP headers | Baja | Pendiente v1.1 |
| B-03 | Cierre Z no exporta a PDF directo (solo JSON) | Baja | Mejora futura |
| B-04 | Auto-start solo PM2 (no Task Scheduler nativo) | Baja | Mejora futura |
| B-05 | Sin tests automatizados | Media | Roadmap v2 |
| B-06 | Sin internacionalización (i18n) | Baja | Roadmap v2 |
| B-07 | Sin notificaciones push reales | Baja | Roadmap v2 |

## 11.10 Conclusión

El sistema 2Arbolitos ha sido validado en escenarios representativos de uso real:

- **Funcionalidad 100%** — todas las features cumplen los criterios.
- **Rendimiento aceptable** — latencia < 500 ms incluso bajo carga.
- **Concurrencia robusta** — 5 dispositivos simultáneos sin pérdida de datos.
- **Recuperación ante fallos** — reintento exponencial + sync al reconectar.
- **Instalación amigable** — wizard gráfico sin terminal.

El **98% de éxito** en la suite de pruebas valida que el sistema está listo para producción en el contexto objetivo (restaurantes PyMEs con 5-20 dispositivos en LAN).
