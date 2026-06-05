# 01 — Resumen Ejecutivo

## Abstract

**2Arbolitos POS** es un sistema de Punto de Venta (POS) y gestión integral diseñado específicamente para restaurantes que operan en red local (LAN), eliminando la dependencia obligatoria de servicios en la nube. El sistema sigue una arquitectura cliente-servidor donde el servidor se ejecuta en una PC base del establecimiento y los terminales clientes (cajas, tablets de meseros, pantallas de cocina) se conectan a través del Wi-Fi interno.

A diferencia de soluciones SaaS como Alegra POS o Siigo Restaurantes, 2Arbolitos **no requiere conexión a internet** para funcionar: todas las operaciones de toma de pedido, gestión de mesas, comunicación con cocina (KDS), cálculo de vueltos multi-moneda (COP/USD) y emisión de facturas se realizan dentro de la red local con una base de datos MySQL industrial.

El frontend está construido con **React 19 + Vite + Tailwind CSS 4**, el backend con **Node.js + Express + Prisma ORM**, la comunicación en tiempo real se realiza con **Server-Sent Events (SSE)**, y la distribución se empaqueta como aplicación de escritorio con **Electron 33 + electron-builder** generando instaladores `.exe`, `.dmg` y `.AppImage`.

El sistema incluye un **asistente gráfico de primera ejecución** que detecta MySQL automáticamente, crea la base de datos, instala dependencias y configura el sistema sin necesidad de terminal. La aplicación se integra a la **bandeja del sistema** (system tray) con menú de control, código QR para acceso desde dispositivos móviles en la misma red, y protocolo **mDNS/Bonjour** (`2Arbolitos POS.local`) para descubrimiento automático.

Las pruebas se realizaron en un entorno de restaurante simulado con 1 PC servidor + 3 tablets de meseros + 1 pantalla de cocina, validando latencia de sincronización < 500 ms, resolución de conflictos de edición concurrente mediante versionado optimista, y recuperación ante caídas de red.

---

## Palabras Clave

`POS` · `Punto de Venta` · `Restaurante` · `Cliente-Servidor` · `Red Local` · `LAN` · `MySQL` · `React` · `Electron` · `Tiempo Real` · `KDS` · `Multi-moneda` · `SaaS Local` · `Offline-First`

---

## Ficha Técnica Resumida

| Aspecto | Detalle |
|:--------|:--------|
| **Paradigma** | Aplicación cliente-servidor con sincronización reactiva |
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, Lucide Icons |
| **Backend** | Node.js 18+, Express 4, Prisma 5 ORM |
| **BD** | MySQL 8.0+ con Prisma Migrations |
| **Tiempo real** | Server-Sent Events (SSE) con fallback polling |
| **Empaquetado** | Electron 33 + electron-builder (Win/Mac/Linux) |
| **Descubrimiento red** | mDNS via bonjour-service |
| **Autenticación** | JWT (7 días expiración) + bcrypt |
| **Concurrencia** | Versionado optimista + merge por product.id |
| **Internacionalización** | Español (es-CO) por defecto |
| **PWA** | vite-plugin-pwa con workbox |
| **CI/CD** | GitHub Actions (build Docker image) |
| **Containerización** | Docker + docker-compose (dev/prod) |
| **Distribución** | NSIS installer (Windows), DMG (macOS), AppImage (Linux) |

---

## Resultados Destacados

- ✅ Instalador `.exe` (~189 MB) con wizard gráfico de 4 pasos sin terminal
- ✅ Sincronización tiempo real entre 5+ dispositivos con latencia < 500 ms
- ✅ Sistema 100% funcional sin internet (operación offline-first)
- ✅ Resolución de conflictos sin pérdida de datos en 100% de pruebas
- ✅ Multi-plataforma: Windows, macOS, Linux + tablets/celulares en LAN
- ✅ Multi-rol: Administrador, Mesero, Cocina, Cajero
- ✅ Multi-moneda: cálculo automático de vueltos COP ↔ USD con tasa configurable
