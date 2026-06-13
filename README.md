# 🌳 2Arbolitos POS

### Sistema de Punto de Venta y Gestión Integral para Restaurantes

[![Versión](https://img.shields.io/badge/versión-1.0.0-1A4D2E?style=flat-square)]()
[![Licencia](https://img.shields.io/badge/licencia-MIT-D4A373?style=flat-square)]()
[![Docker](https://img.shields.io/badge/Docker-requerido-2496ED?style=flat-square&logo=docker&logoColor=white)]()
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)]()

Sistema POS que opera en **red local (LAN) sin internet obligatorio**, integra gestión de mesas, cocina en tiempo real, ventas multi-moneda (COP/USD/Bs.) y caja. Se despliega únicamente con **Docker** y se accede desde el navegador de cualquier dispositivo en la red.

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
| 📱 **Acceso desde móviles por QR** | Escaneas y se abre la app, sin instalar nada |
| 🐳 **Docker only** | Un solo comando para iniciar todo el sistema |
| 🔒 **Autenticación JWT** | Roles: Admin, Mesero, Cocina, Cajero |
| 📊 **Finanzas** | Cierre de caja Z, gastos operativos, historial |
| 💾 **Backup/Restore** | Scripts `.bat` para respaldo de base de datos |

---

## 🚀 Inicio Rápido (Docker)

### Requisitos
- Windows 10/11, macOS o Linux
- **Docker Desktop** instalado y corriendo

### Instalación Automática (recomendada)

```batch
git clone https://github.com/Yefer-Betta/2Arbolitos.git
cd 2Arbolitos
autoconfig.bat
```

El script `autoconfig.bat` hace todo automáticamente:
1. Detecta la IP local del servidor
2. Configura `.env` con los valores correctos
3. Abre el puerto 80 en el firewall de Windows
4. Construye e inicia los contenedores Docker
5. Muestra la URL y un código QR para acceder desde el celular

> Ejecutar como **Administrador** en Windows para que abra el puerto automáticamente.

### Inicio Manual (si ya está configurado)

```bash
docker compose up -d
```

### Detener

```bash
docker compose down
```

---

## 🔐 Usuarios Iniciales

| Rol | Usuario | Contraseña |
|:----|:--------|:-----------|
| 👑 Administrador | `admin` | `admin123` |
| 🛒 Mesero | `mesero` | `waiter123` |
| 🛒 Cajero | `cajero` | `waiter123` |
| 🧑‍🍳 Cocina | `cocina` | `cook123` |

> ⚠️ **Cambiar las contraseñas inmediatamente en producción.**

---

## 💾 Backup / Restore

```batch
backup.bat        # Crea respaldo de la base de datos
restore.bat       # Restaura desde un respaldo
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
├── Documentación del Proyecto/  # 📚 Documentación APA (.docx)
├── docker-compose.yml           # Orquestación de servicios
├── Dockerfile                   # Build multi-etapa (CI)
├── Dockerfile.frontend          # Frontend con Nginx
├── nginx.conf                   # Proxy reverso
├── autoconfig.bat               # Configuración automática
├── backup.bat                   # Respaldo de base de datos
├── restore.bat                  # Restauración de base de datos
├── start.bat                    # Inicio rápido
├── .env.example.docker          # Plantilla de variables de entorno
└── .gitignore
```

---

## 📄 Documentación

La documentación completa del proyecto en **formato APA** (normas APA 7ª edición) está disponible en:

- `Documentación del Proyecto/2Arbolitos_POS_Documento_Proyecto_APA.docx`

Incluye: portada, resumen, glosario, introducción, marco teórico, arquitectura, diagramas UML, modelo de base de datos, despliegue, API, flujos de negocio, interfaz, pruebas, manual de usuario, manual técnico, conclusiones y referencias.

También puedes regenerar el documento ejecutando:

```bash
cd scripts
npm install
node gen_apa_doc.js
```

---

## 🌐 Acceso a la App

| Desde | URL |
|:------|:----|
| Mismo equipo servidor | `http://localhost` |
| Celular/tablet en LAN | `http://<IP-del-servidor>` |
| QR automático | Se muestra al ejecutar `autoconfig.bat` |

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|:-----|:-----------|
| Frontend | React 19 + Vite 7 + Tailwind CSS 4 |
| Backend | Node.js + Express |
| Base de datos | MySQL 8 (Docker) |
| ORM | Prisma 5 |
| Proxy | Nginx |
| Tiempo real | Server-Sent Events (SSE) |
| Despliegue | Docker + docker-compose |

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
| Componentes React | 17 |
| Endpoints API | 40+ |
| Modelos de datos | 11 |
| Líneas de código | ~12,000 |
| Documentación APA | 1 documento completo |
| Latencia sync | < 500 ms |

---

## 🧪 Estado del Proyecto

- ✅ Funcionalidad core completa (POS, KDS, Mesas, Finanzas)
- ✅ Multi-moneda (COP, USD, Bs.)
- ✅ Sincronización en tiempo real
- ✅ Despliegue Docker automático
- ✅ Documentación APA completa
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
