# 02 — Introducción

## 2.1 Contexto del Problema

El sector de restaurantes en América Latina, y particularmente en Colombia, presenta una paradoja operativa: negocios que generan ingresos diarios significativos dependen de sistemas tecnológicos frágiles. Según datos del DANE, más del 60% de los restaurantes pequeños y medianos (PyMEs) en Colombia aún gestionan sus ventas con:

- **Cuadernos y papel**: sin trazabilidad de órdenes ni control de inventario.
- **POS monolíticos de una sola caja**: que no escalan a tablets de meseros ni a pantallas de cocina.
- **Soluciones SaaS en la nube** (Alegra POS, Siigo, etc.): que requieren internet constante y cobran mensualidades por usuario/mesa, impactando el margen del negocio.

Esta última categoría, aunque tecnológicamente avanzada, introduce tres problemas críticos para el contexto local:

1. **Dependencia de internet**: zonas con conectividad intermitente quedan paralizadas en horas pico.
2. **Costo recurrente**: una mensualidad de $150.000 COP en 2 años suma $3.600.000 COP sin que el negocio sea dueño del software.
3. **Riesgo de privacidad**: datos sensibles de ventas, proveedores y clientes quedan en servidores de terceros.

Adicionalmente, los meseros y cocineros requieren una herramienta táctil, rápida y con **sincronización en tiempo real** entre el salón y la cocina. Las soluciones existentes o son demasiado costosas (software de franquicias) o no resuelven el problema de la comunicación instantánea.

## 2.2 Justificación del Proyecto

2Arbolitos POS surge como respuesta a esta problemática desde la ingeniería de software:

- **Privacidad de datos**: la base de datos MySQL reside en el PC del propio restaurante. El negocio es dueño de su información.
- **Ahorro a largo plazo**: licencia única vs. suscripciones vitalicias a plataformas SaaS.
- **Operación offline-first**: el sistema funciona 100% en la red local del restaurante, sin depender de la nube.
- **Tiempo real**: integración nativa entre la toma del pedido en la mesa y la pantalla de cocina (Kitchen Display System).
- **Multi-dispositivo**: una PC servidor + N tablets/celulares en la misma Wi-Fi, sin límite de dispositivos.
- **Táctil y moderno**: interfaz responsive optimizada para uso con dedos en tablets.

El proyecto se justifica técnicamente porque integra tecnologías de frontend moderno (React), backend robusto (Node.js + Prisma), base de datos industrial (MySQL), empaquetado nativo (Electron) y protocolos de red (mDNS, SSE) en una solución cohesiva.

## 2.3 Objetivos

### 2.3.1 Objetivo General

Diseñar, desarrollar e implementar un sistema de Punto de Venta (POS) y gestión integral para restaurantes, con arquitectura cliente-servidor en red local, comunicación en tiempo real, soporte multi-moneda y empaquetado como aplicación de escritorio multiplataforma.

### 2.3.2 Objetivos Específicos

1. **Construir un backend robusto** en Node.js con Express y Prisma que exponga una API RESTful con autenticación JWT, validación de datos y notificaciones en tiempo real mediante Server-Sent Events.

2. **Desarrollar un frontend responsive** en React 19 con Tailwind CSS 4 que proporcione interfaces táctiles para toma de pedidos, gestión visual de mesas, pantalla de cocina (KDS) y módulo financiero.

3. **Implementar sincronización reactiva cliente-servidor** con versionado optimista de estado de mesa (`versión Int`), resolución de conflictos por `product.id`, debounce de 300 ms, y reintentos exponenciales para tolerar caídas de red.

4. **Empaquetar la aplicación como software de escritorio** con Electron 33, instalador NSIS para Windows, asistente gráfico de primera ejecución, icono en la bandeja del sistema y código QR para acceso desde dispositivos móviles en la misma LAN.

5. **Validar el sistema** en un entorno de restaurante simulado con múltiples dispositivos, midiendo latencia de sincronización, robustez ante desconexiones y facilidad de uso para personal no técnico.

6. **Documentar el proyecto** con énfasis en la arquitectura técnica, diagramas UML, modelo de datos, flujos de negocio y procedimientos de instalación para facilitar mantenimiento y extensión futura.

## 2.4 Alcance del Proyecto

### Incluye ✅

- Aplicación de escritorio con asistente gráfico de instalación
- Frontend web responsive (desktop, tablet, móvil)
- API RESTful con autenticación y autorización por roles
- Base de datos MySQL con 11 modelos (usuarios, productos, categorías, mesas, órdenes, pagos, etc.)
- Sincronización en tiempo real vía SSE
- Módulo POS táctil con búsqueda, categorías, modificadores
- Vista de mesas (Table Map) con estado en vivo
- Kitchen Display System (KDS) con tablero Kanban
- Módulo de caja: cobros COP/USD, descuentos, vueltos
- Módulo de finanzas: cierre de caja, gastos operativos, reportes
- Módulo de menú: CRUD de categorías y productos
- Historial de ventas con filtros
- Configuración del sistema: tasa de cambio, datos del negocio, auto-start
- Descubrimiento de red vía mDNS (`2Arbolitos POS.local`)
- Acceso desde dispositivos móviles por código QR
- Empaquetado multiplataforma (Windows, macOS, Linux)
- Docker compose para desarrollo y producción
- CI/CD con GitHub Actions

### No Incluye ❌

- Integración con impresoras fiscales/dian electrónicas (fuera de alcance)
- Integración con datáfonos físicos
- Sistema de inventario con receta/costos (módulo de Escandallo parcial)
- Reservas y gestión de clientes
- Facturación electrónica formal (certificación DIAN)
- Aplicación móvil nativa (iOS/Android) — solo web responsive
- Multi-tenancy / múltiples restaurantes en una instalación

## 2.5 Limitaciones Conocidas

- **Rango de operación**: requiere que todos los dispositivos estén en la misma subred LAN. Soporta subredes `192.168.x.x` y `10.x.x.x`.
- **Hardware mínimo**: PC servidor con 4 GB RAM, 2 GB disco, MySQL local o accesible en red.
- **Concurrencia**: testeado hasta 8 dispositivos simultáneos; rendimiento no validado para > 20.
- **Copia de seguridad**: la responsabilidad del backup de MySQL es del administrador del sistema.
- **Sistema operativo de desarrollo**: optimizado para Windows 10/11 como servidor principal; macOS y Linux soportados pero con menor testing.

## 2.6 Metodología de Desarrollo

El proyecto se desarrolló siguiendo una aproximación iterativa-incremental con sprints de 2 semanas, inspirada en Scrum pero simplificada para un equipo de un solo desarrollador:

| Fase | Duración | Entregable |
|:-----|:---------|:-----------|
| Análisis de requerimientos | 2 sem | Documento de casos de uso, modelo de datos |
| Diseño de arquitectura | 1 sem | Diagrama de componentes, stack tecnológico |
| Sprint 1 — Backend + Auth | 2 sem | API REST + JWT + seed data |
| Sprint 2 — POS + Mesas | 2 sem | Frontend básico, gestión de pedidos |
| Sprint 3 — KDS + Cocina | 2 sem | Tablero Kanban en tiempo real |
| Sprint 4 — Caja + Finanzas | 2 sem | Cobros, cierres, reportes |
| Sprint 5 — Multi-moneda | 1 sem | Tasa de cambio, conversión COP/USD |
| Sprint 6 — Empaquetado | 2 sem | Electron + wizard + tray + QR |
| Sprint 7 — Sync robusto | 2 sem | SSE + versionado + conflict-merge |
| Sprint 8 — Pulido final | 2 sem | Mobile responsive + branding + docs |

## 2.7 Estructura del Documento

- **Cap. 03 — Marco Teórico**: tecnologías y conceptos utilizados
- **Cap. 04 — Arquitectura**: vista general del sistema
- **Cap. 05 — Diagramas UML**: casos de uso, clases, secuencias
- **Cap. 06 — Base de Datos**: modelo ER y explicación de entidades
- **Cap. 07 — Despliegue**: topología de red, Docker, Electron
- **Cap. 08 — Referencia de API**: endpoints documentados
- **Cap. 09 — Flujos de Negocio**: procesos POS, pago, sincronización
- **Cap. 10 — Interfaz UI/UX**: navegación, paleta, wireframes
- **Cap. 11 — Pruebas**: plan y resultados de validación
- **Cap. 12 — Instalación**: wizard paso a paso
- **Cap. 13 — Manual de Usuario**: por rol
- **Cap. 14 — Manual Técnico**: build, dev, scripts
- **Cap. 15 — Conclusiones**: logros, trabajo futuro
- **Cap. 16 — Bibliografía**: referencias
