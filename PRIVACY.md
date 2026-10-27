# Política de privacidad y tratamiento de datos

**Última actualización:** 26 de octubre de 2026

> **Nota importante.** Este documento describe cómo funciona el software y es una base lista para adaptar. **No es asesoría legal.** Cada restaurante es el responsable del tratamiento de los datos de sus clientes y debe revisar este texto con un abogado y ajustarlo a la normativa de su país (por ejemplo, Ley 1581 de 2012 en Colombia, Ley 8968 en Costa Rica, LFPDPPP en México o RGPD si opera en la Unión Europea) antes de usarlo con público real.

---

## 1. Quién trata los datos

**2Arbolitos POS** es un sistema que se instala y opera **en la infraestructura del propio restaurante**. No existe una cuenta en la nube del desarrollador, ni un servidor central que reciba información.

- **Responsable del tratamiento:** el restaurante (persona natural o jurídica) que instala y opera el sistema. Es quien define para qué se usan los datos y atiende los derechos de los titulares.
- **Desarrollador del software:** no tiene acceso a la base de datos, a los respaldos ni a la información de clientes o empleados. Su papel se limita a distribuir el código.

## 2. Qué datos se guardan

| Conjunto | Datos | Para qué |
|----------|-------|----------|
| **Usuarios del sistema** | usuario, nombre, rol, contraseña **cifrada** (hash bcrypt), estado activo | Autenticación y control de permisos |
| **Órdenes y ventas** | ítems, cantidades, precios, propinas, notas, tipo de pedido, dirección y teléfono de domicilio | Operar el punto de venta, cuentas y facturación interna |
| **Clientes** | nombre, teléfono, correo, dirección | Fidelización, reservas y domicilios |
| **Reservas** | nombre, teléfono, correo, fecha, personas, notas | Gestión de reservas |
| **Asistencia** | usuario, entrada/salida, notas | Control de personal |
| **Proveedores** | nombre, teléfono, correo, dirección, notas | Compras y abastecimiento |
| **Caja y gastos** | cierres, montos, notas | Contabilidad operativa |
| **Auditoría** | usuario, acción, fecha | Trazabilidad de cambios |

No se solicitan datos sensibles (salud, origen étnico, creencias, datos biométricos). Si el restaurante decide anotarlos en el campo libre de notas, pasa a ser responsabilidad suya.

## 3. Dónde se almacenan

- En una base **MySQL/MariaDB** que corre en el servidor del restaurante (un PC, un mini servidor o el equipo donde se instaló Docker).
- Los **respaldos** se generan en la carpeta `backups/` de esa misma máquina.
- **No hay sincronización con la nube.** El sistema funciona sin internet y no envía datos a servidores externos.

## 4. Para qué se usan

1. Operar el punto de venta y la cocina.
2. Gestionar mesas, pedidos, domicilios y reservas.
3. Cobrar, cerrar caja y llevar el control de gastos.
4. Administrar usuarios y permisos.
5. Cumplir obligaciones contables y fiscales del restaurante.

**No se usan** para publicidad, perfilamiento comercial, venta de datos ni entrenamiento de modelos de inteligencia artificial.

## 5. Con quién se comparten

Los datos **no se venden ni se ceden** a terceros. Solo salen de la máquina en estos casos concretos y limitados:

| Destino | Cuándo | Qué se envía |
|---------|--------|--------------|
| **Google Fonts** (`fonts.googleapis.com`) | Al abrir la aplicación en un navegador con internet, para descargar la tipografía Outfit | La IP del navegador y datos técnicos de la petición, según la política de Google |
| **GitHub** (`api.github.com` / `github.com`) | Solo si un administrador pulsa **Buscar actualizacion** en el panel | Ningún dato del restaurante; GitHub puede registrar la IP de quien consulta |
| **Proveedor de internet / red local** | Tráfico normal de la red | Metadatos de conexión |

> Si necesitas que la aplicación no haga **ninguna** petición externa, se puede servir la tipografía desde el propio servidor (autoalojada) y no usar el botón de actualización. Consúltalo con quien administre tu instalación.

El **menú público por QR** (`GET /api/products`, `GET /api/categories` sin sesión) expone únicamente campos comerciales del menú: nombre, descripción, precio, categoría e imagen. Nunca expone clientes, ventas ni usuarios. Cualquier persona conectada a la red puede leerlo; por eso el servidor debe permanecer en la red interna.

## 6. Cookies y almacenamiento del navegador

- **Cookie de sesión `token`**: guarda el JWT del usuario que inició sesión. Es `httpOnly` (no accesible desde JavaScript), `SameSite=Lax` y dura **7 días** o hasta que se cierre sesión.
- **Almacenamiento local del navegador**: la PWA guarda en el dispositivo una copia de trabajo (catálogo, pedidos pendientes de sincronizar y preferencias como el tema) para poder operar sin conexión.
- **No hay cookies de publicidad, analítica ni rastreo de terceros.**

## 7. Cuánto tiempo se conservan

El plazo lo define el restaurante según sus obligaciones contables. El sistema aplica **baja lógica** en usuarios, categorías y mesas (se marcan como inactivos y se ocultan, pero no se borran), de modo que algunos registros permanecen hasta que un administrador los elimine de forma definitiva en la base de datos.

Los respaldos (`backups/*.sql`) **no se borran solos**: su rotación y destrucción es responsabilidad del restaurante.

## 8. Seguridad

Medidas incluidas en el software:

- Contraseñas almacenadas con hash **bcrypt** (nunca en texto plano).
- Sesión en cookie `httpOnly`, lo que reduce el robo de token por XSS.
- Límite de **10 intentos de inicio de sesión cada 15 minutos** por IP.
- CORS restringido a direcciones locales y privadas (`localhost`, `127.0.0.1`, `192.168.x.x`, `10.x.x.x`).
- Cabeceras de seguridad con Helmet.
- Base de datos **no publicada** fuera de la red interna de Docker.

Recomendaciones para el restaurante:

- Cambiar las contraseñas de los usuarios de ejemplo (`admin/admin123`, etc.) el primer día.
- No exponer el POS directamente a internet; para acceso remoto usar VPN.
- Si se publica detrás de HTTPS, activar `COOKIE_SECURE=true`.
- Restringir el acceso físico al servidor y a la red WiFi del personal.
- Guardar los respaldos en un equipo distinto y cifrados.

## 9. Derechos de las personas

Los clientes, empleados y proveedores pueden solicitar **acceso, actualización, rectificación, supresión, oposición y revocación** del consentimiento sobre sus datos. Esas solicitudes se atienden **ante el restaurante** (responsable), no ante el desarrollador, que no tiene acceso a la información.

Para ejercerlos, el restaurante puede usar las funciones del sistema:

- Editar o desactivar clientes y usuarios desde **Clientes** y **Administración**.
- Eliminar definitivamente los registros en la base de datos o en los respaldos.

## 10. Menores de edad

El sistema no está dirigido a menores ni recopila datos de menores de forma deliberada. Si una reserva o un domicilio incluye datos de un menor, el restaurante debe contar con la autorización de su representante legal.

## 11. Cambios en esta política

Esta política puede actualizarse junto con el software. La fecha de la última revisión aparece al inicio del documento y el historial queda en el repositorio: <https://github.com/Yefer-Betta/2Arbolitos/commits/main/PRIVACY.md>.

## 12. Contacto

- **Sobre el software:** abre un issue en <https://github.com/Yefer-Betta/2Arbolitos/issues>.
- **Sobre tus datos personales:** dirígete al restaurante donde diste tus datos.

---

_Consulta también los [Términos de uso](./TERMS.md) y los [Avisos de terceros](./NOTICE.md)._
