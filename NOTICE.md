# Avisos legales y componentes de terceros

Este archivo acompaña a la licencia [`LICENSE`](./LICENSE) y cubre tres cosas: la marca, las fuentes y las librerías de terceros que se distribuyen con el sistema.

---

## 1. Titularidad

**2Arbolitos POS** — Copyright © 2026 **Yefer Betta**.

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

La aplicación solicita la fuente a Google Fonts (`fonts.googleapis.com`). Si el equipo no tiene internet, el navegador usa una fuente del sistema y la aplicación sigue funcionando.

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

### Backend (se incluye en `server/node_modules`)

| Paquete | Versión | Licencia |
|---------|---------|----------|
| `@prisma/client` (Prisma) | 5.22.x | Apache-2.0 |
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
- **MySQL / MariaDB** — **no** se incluye. MySQL Community Server se distribuye bajo GPLv2 (con excepción FOSS) y MariaDB bajo GPLv2; por eso cada instalación la aporta el propio restaurante como requisito previo.
- **Docker Desktop** — no se incluye; se usa como requisito del modo Docker y se rige por los términos de Docker Inc.

## 5. Marcas de terceros

Docker, MySQL, MariaDB, Node.js, React, Prisma, GitHub y cualquier otra marca mencionada pertenecen a sus respectivos titulares. La mención es solo descriptiva y no implica patrocinio ni afiliación.

---

_Si redistribuyes el sistema, conserva este archivo, [`LICENSE`](./LICENSE) y los avisos de licencia de las dependencias._
