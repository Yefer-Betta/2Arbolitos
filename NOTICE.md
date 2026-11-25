# Avisos legales y componentes de terceros

Este archivo acompaña a la licencia [`LICENSE`](./LICENSE) y cubre tres cosas: la marca, las fuentes y las librerías de terceros que se distribuyen con el sistema.

---

## 1. Titularidad

**2Arbolitos POS** — Copyright © 2026 **Yefer Betta** (persona natural de nacionalidad venezolana, residente legal en Colombia).

El código fuente se distribuye bajo licencia **MIT** (ver [`LICENSE`](./LICENSE)).

## 2. Marca y signos distintivos

La licencia MIT **no** concede derechos sobre la marca. Quedan reservados por su titular:

- El nombre **2Arbolitos** y sus variantes.
- El logotipo (`logo.png`), el ícono de la aplicación y los íconos de la PWA.
- La identidad visual (paleta, tipografía y nombres de secciones propias).

Puedes usar el código para tu propio negocio, modificarlo y ofrecerlo como servicio. Si lo redistribuyes o lo rebautizas como otro producto, **debes** retirar la marca, el logotipo y los íconos de 2Arbolitos y no insinuar respaldo o afiliación del titular.

## 3. Tipografía

| Recurso | Licencia |
|---------|----------|
| **Outfit** (Rodrigo Fuenzalida y contributors) | [SIL Open Font License 1.1](https://openfontlicense.org/) |

La tipografía Outfit va autoalojada en el bundle del frontend mediante [`@fontsource/outfit`](https://fontsource.org/) (SIL Open Font License 1.1), por lo que no hay petición externa a Google Fonts al abrir la aplicación.

## 4. Librerías de terceros

Estas son las dependencias que se ejecutan en tiempo de ejecución y que, por lo tanto, viajan dentro del paquete portable y del bundle del frontend. Cada una conserva su licencia original y sus avisos de copyright.

### Frontend (se incluye compilado en `dist/`)

| Paquete | Versión | Licencia |
|---------|---------|----------|
| `react` | 19.2.x | MIT |
| `react-dom` | 19.2.x | MIT |
| `clsx` | 2.1.x | MIT |
| `tailwind-merge` | 3.5.x | MIT |
| `lucide-react` (íconos Lucide) | 0.563.x | ISC |
| `vite-plugin-pwa` / Workbox (PWA y service worker) | 1.2.x | MIT |

### Backend (se incluye en `server/node_modules`)

| Paquete | Versión | Licencia |
|---------|---------|----------|
| `@prisma/client` (Prisma) | 5.22.x | Apache-2.0 |
| `prisma` (CLI de Prisma) | 5.22.x | Apache-2.0 |
| `bcryptjs` | 2.4.x | MIT |
| `bonjour-service` | 1.4.x | MIT |
| `cors` | 2.8.x | MIT |
| `dotenv` | 16.x | BSD-2-Clause |
| `express` | 4.22.x | MIT |
| `express-rate-limit` | 8.6.x | MIT |
| `helmet` | 8.3.x | MIT |
| `jsonwebtoken` | 9.0.x | MIT |
| `mysql2` | 3.22.x | MIT |
| `qrcode` | 1.5.x | MIT |
| `zod` | 4.4.x | MIT |

> Las versiones exactas instaladas pueden variar según `package-lock.json`. El texto completo de cada licencia está en el `LICENSE` o `LICENSE.md` del paquete correspondiente dentro de `node_modules`.

### Plataformas que NO se distribuyen

- **Node.js** — licencia MIT. En el paquete portable se incluye `node/node.exe` sin modificaciones; su licencia viaja con el binario.
- **MySQL Community Server** — **no** se incluye por defecto. Se distribuye bajo GPLv2 (con excepción FOSS). Cada instalación lo aporta como requisito previo, salvo que se use el modo MariaDB portable embebido (ver abajo).
- **Docker Desktop** — no se incluye; se usa como requisito del modo Docker y se rige por los términos de Docker Inc.

### MariaDB portable embebido (opcional, --with-mariadb)

El empaquetador portable puede incluir **MariaDB Community Server** para Windows x64 (`--with-mariadb`) para que el paquete sea autosuficiente y no requiera instalar MySQL/MariaDB por separado.

- **MariaDB Community Server** — licencia **GPLv2**. Al incluirla en el paquete distribuido, usted acepta los términos de la GPLv2 y debe hacer disponible el código fuente correspondiente a quienes reciban el binario.
- Los binarios de MariaDB se copian en la carpeta `mariadb/` del paquete y los datos viven en `mariadb/data/`.
- Si no se usa `--with-mariadb`, el usuario debe instalar MySQL 8 o MariaDB 10.4+ por su cuenta y configurar `DATABASE_URL` en `server/.env`.

## 5. Marcas de terceros

Docker, MySQL, MariaDB, Node.js, React, Prisma, GitHub y cualquier otra marca mencionada pertenecen a sus respectivos titulares. La mención es solo descriptiva y no implica patrocinio ni afiliación.

## 5. Marcas de terceros

Docker, MySQL, MariaDB, Node.js, React, Prisma, GitHub y cualquier otra marca mencionada pertenecen a sus respectivos titulares. La mención es solo descriptiva y no implica patrocinio ni afiliación.

---

_Si redistribuyes el sistema, conserva este archivo, [`LICENSE`](./LICENSE) y los avisos de licencia de las dependencias._
