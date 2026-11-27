# Plan Fase 3 — Instalador .exe sin Docker ni MySQL externo

## Objetivo
Entregar un paquete portable Windows x64 que **no requiera que el usuario instale MySQL/MariaDB por su cuenta**. El paquete debe incluir:
- Node.js portable (ya existe)
- Frontend compilado (ya existe)
- Backend Express + Prisma (ya existe)
- **MariaDB portable embebido** (NUEVO en Fase 3)
- start.bat que inicie MariaDB, cree la BD, ejecute migraciones, seed si está vacía, y arranque el backend
- Panel de control que gestione también MariaDB

## Alcance acordado (AUDITORIA.md, bloque "Fase 3")
> Instalador `.exe` sin Docker ni MySQL externo (recomendación: MariaDB portable como servicio).

Notas:
- La licencia de MariaDB es GPLv2 → debe añadirse a `NOTICE.md`.
- No se generó un instalador `.exe` compilado (Inno Setup/NSIS) en esta fase por complejidad y falta de herramientas de compilación en este entorno; se entrega como **ZIP portable autosuficiente** (`start.bat` hace todo). El ZIP ya existe; Fase 3 lo hace autosuficiente en DB.
- Ampliación `v1.1.6`: `scripts/pack-msi.js` genera un **MSI** con WiX 3 que instala el ZIP portable con MariaDB y los archivos de Docker/Kiri. No reemplaza al ZIP; lo complementa.

## Pendientes de Fase 3 (lista)
1. [ ] Descargar/incluir MariaDB portable para Windows x64 (zip oficial) en el paquete
2. [ ] Modificar `start.bat` para iniciar MariaDB embebido (mysqld), crear BD, migrar, seed, arrancar backend
3. [ ] Modificar `ptool.cjs` (o crear equivalente) para operar contra MariaDB embebido
4. [ ] Actualizar `Panel.ps1` / `Ops.ps1` para detectar y gestionar MariaDB embebido (iniciar/detener/estado)
5. [ ] Actualizar `NOTICE.md` con GPLv2 de MariaDB
6. [ ] Actualizar `README-PORTABLE.txt` (generado por pack-portable.js) con instrucciones de MariaDB embebido
7. [ ] Actualizar `pack-portable.js` para copiar MariaDB en el staging (opcional, bandera `--with-mariadb`)
8. [ ] Commits por tema (sin push ni tags)
9. [ ] Verificación: lint, build, tests
10. [ ] Actualizar `AUDITORIA.md` marcando Fase 3 como completado
11. [ ] Detener para OK del usuario

## Decisiones de diseño
- MariaDB se inicia como **proceso embebido** desde `start.bat` (no como servicio de Windows permanente), para evitar problemas de permisos y desinstalación limpia.
- El puerto de MariaDB es 3306 por defecto; configurable en `server/.env` (`DB_PORT`).
- Los datos de MariaDB viven en `mariadb/data/` dentro de la carpeta del paquete (persistentes entre reinicios).
- Si el usuario ya tiene MySQL/MariaDB externo, puede seguir usándolo editando `server/.env` (DATABASE_URL apunta al externo) y omitiendo el arranque embebido.

## Estado actual (referencia)
- Paquete portable: `scripts/pack-portable.js` genera `release/2Arbolitos-Portable-Windows-x64-<version>.zip`
- `start.bat` actual: valida node, dist, node_modules; pide credenciales MySQL externas; ejecuta `ptool.cjs check|migrate|count-users`; arranca `server/src/index.js`
- `ptool.cjs`: check (conecta), migrate (CREATE DATABASE + prisma migrate deploy), count-users, gen-secret
- Panel: `scripts/panel/Panel.ps1` + `scripts/lib/Ops.ps1` (gestiona Docker o portable vía procesos)

## Commits previstos (uno por tema, sin push ni tags)
1. feat(fase3): agrega MariaDB portable al empaquetador (--with-mariadb)
2. feat(fase3): start.bat inicia MariaDB embebido, migra, seed, arranca backend
3. feat(fase3): panel detecta y gestiona MariaDB embebido
4. docs(fase3): NOTICE.md GPLv2 MariaDB, README-PORTABLE actualizado
5. docs(fase3): cierra Fase 3 en AUDITORIA.md
