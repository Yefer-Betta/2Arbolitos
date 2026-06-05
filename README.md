# 🌳 2Arbolitos POS

### Sistema de Punto de Venta y Gestión Integral para Restaurantes

[![Versión](https://img.shields.io/badge/versión-1.0.0-1A4D2E?style=flat-square)]()
[![Licencia](https://img.shields.io/badge/licencia-MIT-D4A373?style=flat-square)]()
[![Node](https://img.shields.io/badge/node-%E2%89%A518-339933?style=flat-square&logo=node.js&logoColor=white)]()
[![MySQL](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?style=flat-square&logo=mysql&logoColor=white)]()
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)]()
[![Electron](https://img.shields.io/badge/Electron-33-47848F?style=flat-square&logo=electron&logoColor=white)]()
[![Plataforma](https://img.shields.io/badge/plataforma-Win%20%7C%20Mac%20%7C%20Linux-lightgrey?style=flat-square)]()

> _"Dos árboles, una raíz: tecnología que crece en el restaurante local."_

Sistema POS (Punto de Venta) que opera en **red local (LAN) sin internet obligatorio**, integra gestión de mesas, cocina en tiempo real, ventas multi-moneda (COP/USD) y caja. Empaquetado como aplicación de escritorio **Electron multiplataforma** con instalador gráfico.

A diferencia de soluciones SaaS como Alegra POS o Siigo, 2Arbolitos **no requiere internet**, no cobra suscripciones mensuales y el negocio es dueño de sus datos. Diseñado para restaurantes pequeños y medianos con 5 a 20 dispositivos.

📷 **[CAPTURA REQUERIDA]**: Dashboard principal — `assets/screenshots/00-cover.png`

---

## 📚 Documentación Completa

La documentación técnica y de usuario detallada está en la carpeta [`docs/`](./docs/) — **17 archivos** con análisis, diagramas UML, modelo de base de datos, manuales, pruebas y más.

| # | Documento | Descripción |
|:-:|:----------|:------------|
| 00 | [Portada](./docs/00-PORTADA.md) | Carátula del proyecto |
| 01 | [Resumen Ejecutivo](./docs/01-RESUMEN-EJECUTIVO.md) | Abstract + keywords + ficha técnica |
| 02 | [Introducción](./docs/02-INTRODUCCION.md) | Contexto, justificación, objetivos, alcance |
| 03 | [Marco Teórico](./docs/03-MARCO-TEORICO.md) | 8+ tecnologías analizadas en profundidad |
| 04 | [Arquitectura](./docs/04-ARQUITECTURA.md) | 3-capas + diagramas de componentes |
| 05 | [Diagramas UML](./docs/05-DIAGRAMAS-UML.md) | 7 diagramas: casos de uso, clases, secuencias, estados |
| 06 | [Base de Datos](./docs/06-BASE-DE-DATOS.md) | Diagrama ER + 11 modelos + versionado optimista |
| 07 | [Despliegue](./docs/07-DESPLIEGUE.md) | Topología LAN + Docker + Electron + CI/CD |
| 08 | [API Reference](./docs/08-API-REFERENCE.md) | 40+ endpoints REST + SSE documentados |
| 09 | [Flujos de Negocio](./docs/09-FLUJOS-NEGOCIO.md) | POS, pago multi-moneda, sync conflict-merge |
| 10 | [Interfaz UI/UX](./docs/10-INTERFAZ-UI.md) | Paleta, wireframes, navegación, responsive |
| 11 | [Pruebas](./docs/11-PRUEBAS.md) | Plan + 10 casos detallados + métricas |
| 12 | [Instalación](./docs/12-INSTALACION.md) | Wizard 4 pasos + 4 métodos + troubleshooting |
| 13 | [Manual de Usuario](./docs/13-MANUAL-USUARIO.md) | Manual por rol (Admin/Mesero/Cocina/Cajero) |
| 14 | [Manual Técnico](./docs/14-MANUAL-TECNICO.md) | Stack, estructura, scripts, build pipeline |
| 15 | [Conclusiones](./docs/15-CONCLUSIONES.md) | Logros, métricas, lecciones, trabajo futuro |
| 16 | [Bibliografía](./docs/16-BIBLIOGRAFIA.md) | 54 referencias, libros, RFCs, estándares |

> 💡 Los diagramas están en sintaxis **Mermaid** y se renderizan automáticamente en GitHub.

---

## ✨ Características Principales

| | |
|:-|:--|
| 🛒 **Punto de Venta táctil** | Interfaz optimizada para tablets y celulares, botones ≥ 44 px |
| 🪑 **Vista de Mesas en tiempo real** | Mapa visual con estados Libre / Ocupada / Tiempo de atención |
| 🧑‍🍳 **Kitchen Display System (KDS)** | Tablero Kanban: Pendientes → En Preparación → Listas |
| 💵 **Multi-moneda COP ↔ USD** | Cálculo automático de vueltos con tasa configurable |
| 🔄 **Sincronización en tiempo real** | Server-Sent Events con versionado optimista y conflict-merge |
| 📡 **Funciona sin internet** | Operación 100% offline-first en la red local del restaurante |
| 🌐 **Descubrimiento automático** | mDNS/Bonjour: `2arbolitos-pos.local` |
| 📱 **Acceso desde móviles por QR** | Escaneas y se abre la app, sin instalar nada |
| 🖥️ **App de escritorio** | Electron con instalador NSIS, icono en bandeja, wizard gráfico |
| 💾 **Multi-plataforma** | Windows, macOS, Linux + tablets/celulares en LAN |
| 🐳 **Docker ready** | docker-compose para dev y prod |
| 🔒 **Autenticación JWT** | Roles: Admin, Mesero, Cocina, Cajero |
| 📊 **Finanzas** | Cierre de caja Z, gastos operativos, historial completo |
| 🔧 **Backup/Restore** | Desde la UI, exportable a JSON |
| 🌳 **Branding 2Arbolitos** | Logo, paleta de marca verde bosque + dorado ocre |

---

## 🛠️ Stack Tecnológico

### Frontend
- **React 19** + **Vite 7** + **Tailwind CSS 4**
- **Lucide React** (iconografía)
- **vite-plugin-pwa** (Service Worker)
- Context API + Hooks para estado global

### Backend
- **Node.js 18+** + **Express 4**
- **Prisma 5** ORM con **MySQL 8.0+**
- **JWT** para autenticación
- **Server-Sent Events** (SSE) para tiempo real
- **bonjour-service** para mDNS
- **qrcode** para generación de QR
- **multer / xlsx** (preparado para exports)

### Desktop
- **Electron 33** + **electron-builder 26**
- Wizard gráfico HTML+CSS+JS para primera ejecución
- Icono en bandeja del sistema con menú de control
- Genera instaladores `.exe` (NSIS), `.dmg`, `.AppImage`

### DevOps
- **Docker** + **docker-compose**
- **GitHub Actions** para CI (build Docker)
- **PM2** para producción como servicio del SO

---

## 🚀 Inicio Rápido

### Requisitos Previos
- **Node.js** 18 o superior
- **MySQL** 8.0+ (o XAMPP/WAMP)

### Instalación Asistida (recomendada)

```bash
# Clonar
git clone https://github.com/Yefer-Betta/2Arbolitos.git
cd 2Arbolitos

# Instalar dependencias
npm install && cd server && npm install && cd ..

# Menú interactivo (elige "Instalar Sistema por Primera Vez")
npm start
```

El menú interactivo ofrece:

| Opción | Acción |
|:-------|:-------|
| 1 | Instalar Sistema por Primera Vez (wizard completo) |
| 2 | Iniciar en Producción (PM2 como servicio) |
| 3 | Actualizar Código y Reiniciar |
| 4 | Iniciar en Modo Desarrollo (Vite + API con hot-reload) |

### Acceso

- **App local**: `http://localhost:3002`
- **App en LAN**: `http://<IP-servidor>:3002`
- **App por mDNS**: `http://2arbolitos-pos.local:3002`
- **Código QR de acceso**: `http://<IP-servidor>:3002/qr`

### Empaquetar como App de Escritorio

```bash
npm run build
npm run dist
# Genera release/2Arbolitos POS Setup 1.0.0.exe (~189 MB)
```

### Docker

```bash
docker compose up -d
```

---

## 🔐 Usuarios Iniciales (Seed)

| Rol | Usuario | Contraseña |
|:----|:--------|:-----------|
| 👑 Administrador | `admin` | `admin123` |
| 🛒 Mesero | `mesero` | `waiter123` |
| 🧑‍🍳 Cocina | `cocina` | `cook123` |

> ⚠️ **Cambiar inmediatamente en producción.**

---

## 📂 Estructura del Proyecto

```
2Arbolitos/
├── docs/                        # 📚 17 archivos de documentación
├── electron/                    # 🖥️ Wrapper Electron (main, tray, wizard)
├── logo/                        # 🎨 Logo original fuente
├── public/                      # 🖼️ Assets servidos (logo, iconos PWA)
├── scripts/                     # 🔧 CLI + generadores de iconos
│   ├── cli.js                   # Menú interactivo principal
│   ├── generate-icons.js        # Genera iconos desde logo
│   ├── generate-logo-variants.js
│   └── commands/                # install, start-dev, start-prod, health, etc.
├── server/                      # ⚙️ Backend Node.js
│   ├── prisma/
│   │   ├── schema.prisma        # 11 modelos + 4 enums
│   │   └── seed.js              # Datos iniciales
│   └── src/
│       ├── index.js             # Entry + startServer() exportable
│       ├── sse.js               # Hub de Server-Sent Events
│       ├── config/database.js
│       ├── controllers/         # 8 controladores
│       ├── middleware/auth.js   # JWT
│       └── routes/              # 8 rutas REST
├── src/                         # 🎨 Frontend React
│   ├── components/              # 17 componentes (POS, KDS, VistaMesas, etc.)
│   ├── context/                 # 6 contextos (Orders, Menu, Settings, etc.)
│   ├── lib/                     # api.js, syncManager.js, utils.js
│   └── services/                # (legacy)
├── build/                       # 📦 Recursos para electron-builder (icon.ico)
├── .github/workflows/           # CI: docker-build.yml
├── docker-compose.yml           # Producción
├── Dockerfile                   # Build producción
├── index.html                   # HTML raíz
├── package.json                 # Deps + scripts
├── tailwind.config.js           # Paleta de marca
└── vite.config.js               # Vite + PWA
```

---

## 🎨 Branding

- **Verde bosque profundo** `#1A4D2E` — Primary
- **Dorado ocre terroso** `#D4A373` — Secondary
- **Crema suave** `#F9F7F2` — Background
- **Tipografía**: [Outfit](https://fonts.google.com/specimen/Outfit)

Logo generado en variantes: `logo.png` (original), `logo-light.png` (sidebar oscuro), `logo-dark.png` (fondos claros).

---

## 📊 Métricas del Proyecto

| Métrica | Valor |
|:--------|:------|
| Componentes React | 17 |
| Contextos | 6 |
| Controladores backend | 8 |
| Endpoints API | 40+ |
| Modelos de datos | 11 |
| Enums | 4 |
| Líneas de código (frontend) | ~6,500 |
| Líneas de código (backend) | ~2,800 |
| Documentación | ~4,500 líneas / 17 archivos |
| Tamaño instalador | 189 MB |
| Latencia sync | < 500 ms |

---

## 🧪 Estado del Proyecto

- ✅ Funcionalidad core completa
- ✅ Sincronización robusta con conflict-merge
- ✅ Multi-plataforma (Win/Mac/Linux)
- ✅ Mobile responsive
- ✅ Documentación completa
- ⚠️ Tests automatizados pendientes (mejora v1.1)
- ⚠️ Facturación electrónica no incluida (roadmap v1.2)

Ver [`docs/15-CONCLUSIONES.md`](./docs/15-CONCLUSIONES.md) para logros, limitaciones y roadmap completo.

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/mi-mejora`)
3. Commit tus cambios (`git commit -m 'feat: mi mejora'`)
4. Push (`git push origin feature/mi-mejora`)
5. Abre un Pull Request

---

## 📄 Licencia

**MIT** — Ver [`LICENSE`](./LICENSE) para más detalles.

---

## 👤 Autor

**Yefer Betta**
- Repositorio: [github.com/Yefer-Betta/2Arbolitos](https://github.com/Yefer-Betta/2Arbolitos)
- Documentación completa: [`docs/`](./docs/)

---

> 🌳 _Construido con React, Node.js, Prisma, MySQL, Electron y mucho café._
