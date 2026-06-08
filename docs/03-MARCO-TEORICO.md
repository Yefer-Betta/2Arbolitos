# 03 — Marco Teórico

Este capítulo presenta los fundamentos teóricos, las tecnologías y los conceptos clave que sustentan el diseño e implementación de 2Arbolitos POS. Cada sección explica la tecnología, su rol en el sistema y por qué fue elegida sobre alternativas.

## 3.1 Sistemas de Punto de Venta (POS)

Un **sistema de Punto de Venta (POS, por sus siglas en inglés)** es el conjunto de hardware y software que un negocio utiliza para procesar transacciones de venta en el momento y lugar donde se completan. En un restaurante moderno, el POS trasciende la simple caja registradora: gestiona pedidos, mesas, cocina, inventarios, personal y reportes financieros.

**Evolución de los POS en restaurantes:**

1. **POS mecánico (1900-1970)**: cajas registradoras manuales. Sin trazabilidad.
2. **POS electrónico (1970-2000)**: terminales con microcontroladores. Cobro ágil, sin integración con cocina.
3. **POS monolítico software (2000-2015)**: software de escritorio instalado en una sola PC. Sin sincronización con otros dispositivos.
4. **POS en red local (2010-actual)**: arquitectura cliente-servidor en LAN del establecimiento. Comunicación en tiempo real.
5. **POS SaaS en nube (2015-actual)**: alojado en servidores del proveedor. Requiere internet, cobra suscripciones.

**2Arbolitos se posiciona en la categoría 4** (POS en red local) con tendencias de la categoría 5 (PWA, descubrimientomDNS, instalador moderno).

## 3.2 Arquitectura Cliente-Servidor en LAN

La **arquitectura cliente-servidor** es un modelo de diseño donde las tareas se reparten entre proveedores de recursos (servidores) y consumidores (clientes). En el contexto de 2Arbolitos:

- **Servidor**: una PC con Node.js + Express + MySQL que centraliza la lógica de negocio y los datos.
- **Clientes**: tablets, celulares o PCs en la misma Wi-Fi del restaurante, ejecutando el frontend React.

**Ventajas sobre SaaS para el contexto del proyecto:**

| Aspecto | LAN (2Arbolitos) | SaaS nube |
|:--------|:-----------------|:----------|
| Costo | Licencia única | Mensualidad recurrente |
| Internet | No requerido | Obligatorio |
| Latencia | < 50 ms (LAN) | 100-500 ms + jitter |
| Privacidad | Datos locales | Datos en servidor ajeno |
| Caída red local | Sistema sigue funcionando | Sistema cae |
| Caída internet | No afecta | Ventas paralizadas |

**Descubrimiento automático con mDNS/Bonjour**: cuando los clientes no saben la IP del servidor, el protocolo mDNS (Multicast DNS) permite resolver `2Arbolitos POS.local` sin configuración manual. Esto se logra con la librería `bonjour-service` que publica el servicio en el puerto del servidor.

## 3.3 React 19 y el Paradigma Declarativo

**React** es una biblioteca de JavaScript de código abierto para construir interfaces de usuario mediante componentes reutilizables y un paradigma declarativo. La versión 19 introduce mejoras en rendimiento con el compilador optimizador, Actions y useActionState.

**Conceptos clave aplicados en 2Arbolitos:**

- **Componentes funcionales**: cada pantalla o widget es una función pura que recibe props y retorna JSX.
- **Hooks** (`useState`, `useEffect`, `useContext`, `useCallback`, `useRef`, `useMemo`): permiten estado local, efectos secundarios, contexto global y optimización.
- **Context API**: para compartir estado entre componentes sin prop-drilling (OrdersContext, SettingsContext, etc.).
- **Virtual DOM**: React mantiene un árbol virtual en memoria y solo actualiza el DOM real donde hay cambios, optimizando renders.

**Alternativas evaluadas y descartadas:**

- **Vue 3**: excelente pero menor ecosistema de UI táctil específico.
- **Angular**: opinionado y verboso,不适合 un POS ágil.
- **Svelte**: interesante pero con menos recursos y comunidad más pequeña.

## 3.4 Vite como Build Tool

**Vite** (palabra francesa para "rápido") es un build tool de frontend creado por Evan You (autor de Vue) que ofrece:

- **Servidor de desarrollo ultrarrápido** basado en ESM nativo (no requiere bundling en dev).
- **Build de producción optimizado** con Rollup, tree-shaking, code-splitting y minificación.
- **Hot Module Replacement (HMR)**: recarga de módulos en caliente sin perder estado.

En 2Arbolitos, Vite 7 compila el frontend a `dist/`, que luego es servido por Express en producción y empaquetado por electron-builder para distribuir.

## 3.5 Tailwind CSS 4

**Tailwind CSS** es un framework CSS de utilidad-primera que permite construir diseños sin salir del HTML mediante clases como `bg-primary`, `text-white`, `rounded-xl`. La versión 4 (2025) introduce el motor Oxide que mejora la generación de CSS y el rendimiento.

**Aplicación en 2Arbolitos:**

- **Paleta de marca** personalizada en `tailwind.config.js`:
  - `primary`: `#1A4D2E` (verde bosque profundo)
  - `secondary`: `#D4A373` (dorado/ocre terroso)
  - `background`: `#F9F7F2` (crema suave)
  - `surface`: `#F0EBE0` (crema oscuro para cards)
- **Responsive design**: prefijo `md:` para tablet, sin prefijo para móvil.
- **Diseño táctil**: botones con `min-h-[44px]` y `min-w-[44px]` para targets accesibles.

## 3.6 Node.js y Express

**Node.js** es un entorno de ejecución de JavaScript del lado del servidor basado en el motor V8 de Chrome, con modelo de I/O no bloqueante y orientado a eventos.

**Express** es un framework minimalista de Node.js para construir APIs y aplicaciones web, provee routing, middleware, y abstracción sobre HTTP.

**En 2Arbolitos**, Express 4 maneja:

- Rutas REST (`/api/orders`, `/api/tables`, etc.)
- Middleware CORS configurado para permitir `localhost`, `127.0.0.1`, `192.168.x.x`, `10.x.x.x`
- Middleware de autenticación JWT
- Servir archivos estáticos del frontend compilado en `dist/`
- Endpoint SSE para notificaciones en tiempo real
- Página `/qr` que renderiza el código QR de acceso

## 3.7 Prisma ORM y MySQL

**Prisma** es un ORM (Object-Relational Mapper) de próxima generación para Node.js que ofrece:

- **Schema declarativo** en `schema.prisma` que define modelos, relaciones y tipos.
- **Type-safety** con TypeScript o JSDoc.
- **Migraciones automáticas** con `prisma migrate` o sincronización rápida con `prisma db push`.
- **Cliente generado** con queries fluidas.

**MySQL** es el sistema de gestión de bases de datos relacional (RDBMS) de código abierto más popular del mundo. Características:

- ACID compliant.
- Replicación y clustering.
- Amplia adopción y documentación.
- Compatible con hospedaje en la mayoría de proveedores.

**Por qué MySQL sobre PostgreSQL o SQLite:**

- **MySQL**: el más extendido, mejor performance en lecturas, amplio conocimiento en soporte técnico local.
- **PostgreSQL**: más features pero mayor complejidad operativa.
- **SQLite**: descartado porque no soporta concurrencia real multi-dispositivo y no es "industrial".

**Versionado optimista**: una de las técnicas más importantes del sistema. El modelo `TableState` incluye un campo `versión Int @default(0)` que se incrementa en cada escritura. Si el cliente envía un `_clientVersion` menor que el `versión` actual del servidor, se dispara el protocolo de **conflict-merge**: el servidor devuelve su estado actual y el cliente combina sus items locales con los del servidor por `product.id`, evitando duplicados.

## 3.8 Server-Sent Events (SSE) para Tiempo Real

**SSE** es un estándar HTML5 para que el servidor envíe actualizaciones al cliente de forma unidireccional sobre HTTP. Es más simple que WebSockets cuando la comunicación es solo servidor→cliente.

```http
GET /api/events HTTP/1.1
Accept: text/event-stream

HTTP/1.1 200 OK
Content-Type: text/event-stream

data: {"type":"order:created","payload":{...}}

```

**Por qué SSE sobre WebSockets o Long Polling:**

- **WebSockets**: bidireccional, ideal para chat, pero excesivo cuando el cliente solo recibe.
- **Long Polling**: simple pero ineficiente, genera más tráfico.
- **SSE**: simple, basado en HTTP, reconexión automática nativa, header `text/event-stream`.

**Heartbeat**: el servidor envía un comentario `:\n\n` cada 30 segundos para mantener viva la conexión a través de proxies y NATs.

**Eventos publicados por 2Arbolitos:**

- `order:created`, `order:updated`, `order:status:changed`
- `table:updated`, `table:cleared`, `table:conflict`
- `menu:updated`

## 3.9 JWT (JSON Web Tokens) para Autenticación

**JWT** es un estándar abierto (RFC 7519) que define un formato compacto y autocontenido para transmitir información de forma segura entre partes como un objeto JSON firmado digitalmente.

**Estructura** `header.payload.signature` codificado en Base64URL.

**En 2Arbolitos:**

- El usuario hace login con username/password.
- El servidor válida con `bcrypt.compare()` y firma un JWT con `jsonwebtoken.sign()`.
- El cliente almacena el token en `localStorage`.
- Cada request protegido envía el token en el header `Authorization: Bearer <token>`.
- El middleware `auth.js` válida la firma y la expiración.
- Duración: 7 días (`JWT_EXPIRES_IN=7d`).

**Ventajas sobre sesiones en servidor**: no requiere estado en el servidor, escala horizontalmente sin sticky sessions, funciona idéntico en LAN y WAN.

## 3.10 Electron y Aplicaciones de Escritorio Multiplataforma

**Electron** es un framework creado por GitHub (2013) que permite construir aplicaciones de escritorio multiplataforma usando tecnologías web (HTML, CSS, JS) embebidas en un Chromium + Node.js runtime.

**Arquitectura de Electron:**

- **Main Process**: Node.js puro, controla el ciclo de vida de la app, ventanas nativas, bandeja del sistema, menús.
- **Renderer Process**: Chromium que renderiza la UI web. Aislado por seguridad (`contextIsolation: true`).
- **Preload Script**: puente controlado entre main y renderer vía `contextBridge`.

**En 2Arbolitos**, Electron:

- Crea una ventana `BrowserWindow` que carga `http://localhost:3002` (el servidor Express).
- Crea un icono en la bandeja del sistema (Tray) con menú: Mostrar/Ocultar ventana, estado del servidor, abrir QR, salir.
- En primera ejecución, muestra un **wizard gráfico** (HTML+CSS+JS) de 4 pasos para configurar MySQL, crear la base de datos, instalar dependencias y sembrar datos.
- Empaqueta todo con `electron-builder` generando instaladores:
  - **Windows**: `.exe` NSIS (~189 MB) con acceso directo en escritorio y menú inicio.
  - **macOS**: `.dmg` con instalación drag-and-drop.
  - **Linux**: `.AppImage` y `.deb`.

## 3.11 Service Workers y PWA (Progressive Web App)

Una **PWA** es una aplicación web que utiliza capacidades modernas para ofrecer experiencias similares a las apps nativas: instalable, offline-capable, con notificaciones push.

**Service Worker** es un script que el navegador ejecuta en segundo plano, separado de la página web, habilitando funcionalidades como:

- Intercepción de requests HTTP (caching offline).
- Sincronización en background.
- Notificaciones push.

**vite-plugin-pwa** genera automáticamente el Service Worker con Workbox, registrando los assets críticos para que la app cargue instantáneamente en visitas repetidas.

**Importante en 2Arbolitos**: cuando la app se ejecuta dentro de Electron, el Service Worker se **desregistra y limpia en `did-finish-load`** (ver `electron/main.js:33-49`) para evitar que se muestre una versión cacheada vieja del frontend. Esto fue un bug crítico que se resolvió durante el desarrollo.

## 3.12 mDNS / Bonjour para Descubrimiento de Red

**mDNS (Multicast DNS)** es un protocolo de resolución de nombres en redes locales que permite a los dispositivos encontrarse entre sí sin un servidor DNS central. **Bonjour** es la implementación de Apple, hoy multiplataforma.

En 2Arbolitos, el servidor publica un servicio:

```javascript
bonjour.publish({
  name: '2Arbolitos POS',
  type: 'http',
  port: 3002,
  txt: { url: 'http://192.168.1.15:3002' }
});
```

Así, los dispositivos en la misma red pueden acceder al servidor como `http://2arbolitos-pos.local:3002` sin conocer la IP.

## 3.13 Patrón Offline-First y Sincronización Reactiva

El principio **offline-first** establece que la aplicación debe funcionar perfectamente sin conexión, sincronizando cuando la red esté disponible. En 2Arbolitos:

- **Lectura**: los datos críticos (mesas activas, productos) se persisten en `localStorage` para acceso instantáneo.
- **Escritura**: las modificaciones se envían al servidor con reintentos exponenciales (`fetchWithTimeout` con backoff 1s, 2s, 4s, 8s, 15s).
- **Debounce**: las modificaciones a la mesa activa se acumulan durante 300 ms antes de enviarse, evitando ráfagas.
- **Versionado optimista**: cada envío incluye la versión conocida; si el servidor tiene una versión más nueva, se dispara el merge.
- **SSE**: cuando el servidor recibe cambios de otros clientes, notifica vía SSE para actualizar la UI sin polling.

Este patrón permite que un mesero siga tomando pedidos si pierde Wi-Fi momentáneamente; al recuperar la señal, los cambios se sincronizan automáticamente.

## 3.14 Comparativa de Stacks Similares

| Stack | Ventajas | Desventajas | Adoptado por |
|:------|:---------|:-----------|:-------------|
| **2Arbolitos (React+Node+MySQL+Electron)** | Tiempo real, offline-first, sin costos recurrentes | Setup inicial requiere config MySQL | Este proyecto |
| PHP + MySQL + jQuery | Bajo costo de hosting, simple | UI anticuada, no tiempo real | WordPress + WooCommerce |
| Next.js + Vercel + Postgres SaaS | Deploy automático, CDN global | Requiere internet, costos por uso | SaaS modernos |
| Flutter + Firebase | Multi-plataforma nativa, real-time | Vendor lock-in, costos Firebase | Apps móviles |
| Tauri (Rust) | Binarios muy pequeños, rápido | Lenguaje nuevo, comunidad menor | Apps nativas modernas |

## 3.15 Conclusión del Marco Teórico

2Arbolitos integra un stack moderno y maduro: **React 19 + Vite 7 + Tailwind 4** en el frontend, **Node.js + Express + Prisma + MySQL** en el backend, **SSE** para tiempo real, **Electron 33** para distribución, **mDNS** para descubrimiento, y patrones como **offline-first** y **versionado optimista** para garantizar robustez en entornos de red local con conectividad intermitente.

La elección de cada tecnología responde a un criterio específico del problema: latencia, costo, mantenibilidad, comunidad y disponibilidad de talento. El siguiente capítulo presenta cómo se integran estos componentes en la arquitectura del sistema.
