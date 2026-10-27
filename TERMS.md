# Términos de uso

**Última actualización:** 26 de octubre de 2026

> **Nota importante.** Este documento es una base redactada para el proyecto y **no constituye asesoría legal**. Antes de venderlo, distribuirlo comercialmente o usarlo en un negocio con obligaciones fiscales, revísalo con un abogado de tu jurisdicción y completa los espacios marcados.

---

## 1. Aceptación

Al instalar, ejecutar o usar **2Arbolitos POS** (el «Sistema») aceptas estos términos. Si no estás de acuerdo, no uses el Sistema.

Si instalas el Sistema para un restaurante, aceptas estos términos **en nombre de ese negocio** y declaras tener facultades para hacerlo.

## 2. Relación con la licencia del código

El código fuente se distribuye bajo **licencia MIT** (ver [`LICENSE`](./LICENSE)). Esa licencia te permite usar, copiar, modificar, fusionar, publicar, distribuir, sublicenciar y vender copias del software.

**Si hay conflicto entre estos términos y la licencia MIT sobre tus derechos sobre el código, prevalece la MIT.** Estos términos regulan el uso de la distribución oficial, los servicios de soporte y las responsabilidades del operador; no reducen los derechos que la MIT ya te concede.

## 3. Qué es y qué no es

El Sistema es una aplicación de punto de venta para restaurantes: mesas, pedidos, cocina (KDS), caja, inventario, clientes, reservas y reportes. Funciona en red local y no requiere internet.

**El Sistema no es:**

- Un servicio de facturación electrónica certificado ante una autoridad tributaria.
- Un sistema contable oficial ni asesoría contable, fiscal o legal.
- Un servicio en la nube. No hay alojamiento, respaldo remoto ni monitoreo por parte del desarrollador.
- Un mecanismo de cumplimiento normativo automático (protección de datos, salubridad, laboral, etc.).

Cumplir con las obligaciones fiscales, contables, sanitarias y de protección de datos del restaurante es responsabilidad exclusiva del operador.

## 4. Requisitos

| Modo | Requisitos |
|------|------------|
| **Docker** | Docker Desktop (o Docker Engine) en Windows, macOS o Linux; puerto libre (80 por defecto); equipo encendido durante el servicio |
| **Portable Windows x64** | Windows 10/11 x64; MySQL 8 o MariaDB 10.4+ instalado y corriendo en la misma máquina |

También se requiere un navegador actualizado (Chrome, Edge, Firefox o Safari recientes) y, para las funciones de actualización, acceso a internet.

## 5. Responsabilidades del operador

Al usar el Sistema te comprometes a:

1. **Cambiar las contraseñas de ejemplo** (`admin/admin123`, `gerente/waiter123`, etc.) antes de operar con público real.
2. **Crear un usuario por persona**, asignar el rol mínimo necesario y desactivar a quien deje de trabajar en el negocio.
3. **Mantener respaldos** periódicos y probar que se pueden restaurar. La pérdida de datos por ausencia de respaldos es responsabilidad del operador.
4. **Proteger el equipo y la red**: acceso físico, WiFi del personal, sistema operativo actualizado y contraseña de la base de datos.
5. **No exponer el Sistema directamente a internet** sin HTTPS, VPN o un proxy con TLS. El Sistema se diseñó para operar en LAN.
6. **Informar y obtener las autorizaciones** necesarias de clientes y empleados cuyos datos se registren, conforme a la [Política de privacidad](./PRIVACY.md) y a la ley aplicable.
7. **Verificar los resultados** (precios, impuestos, totales, cierres) antes de usarlos como base de declaraciones o pagos.
8. **Cumplir la normativa local** sobre facturación, tickets, conservación de registros y protección de datos.

## 6. Actualizaciones

- El **panel de control** (Docker y portable) consulta las versiones publicadas en GitHub y, si el administrador lo confirma, descarga e instala la nueva versión.
- Las actualizaciones **no borran** la base de datos, el archivo `.env`, los respaldos ni los registros, pero **pueden cambiar la estructura de la base**. Haz un respaldo antes de actualizar.
- Actualizar es opcional. Si decides quedarte en una versión anterior, seguirás sujeto a estos términos y a la licencia MIT, y no recibirás correcciones de seguridad posteriores.
- Las versiones publicadas están en <https://github.com/Yefer-Betta/2Arbolitos/releases>. Descarga siempre desde ese repositorio oficial: el desarrollador no responde por copias modificadas o redistribuidas por terceros.

## 7. Datos y respaldos

- Los datos son **tuyos** y permanecen en tu servidor.
- El desarrollador **no tiene acceso** a la base de datos, a los respaldos ni a la información de clientes, empleados o proveedores, y **no puede** recuperarlos ni consultarlos.
- El soporte no incluye recuperación remota de datos. La restauración se hace desde tus respaldos.

## 8. Soporte

- El canal oficial es el repositorio: <https://github.com/Yefer-Betta/2Arbolitos/issues>.
- El soporte comunitario se ofrece **según disponibilidad y sin garantía de tiempos**. No existe un SLA (acuerdo de nivel de servicio) salvo que se acuerde por escrito aparte.
- No se ofrece soporte para: equipos con el Sistema modificado, instalaciones sobre sistemas operativos sin soporte, problemas de red o hardware ajenos al Sistema, ni para el uso de MySQL/MariaDB/Docker en sí.

## 9. Propiedad intelectual y marca

- **Código:** © 2026 Yefer Betta, bajo licencia MIT.
- **Marca y diseño:** el nombre «2Arbolitos», el logotipo y los íconos están reservados. La MIT no concede derechos de marca. Si redistribuyes o rebautizas el producto, debes retirar la marca y no sugerir afiliación (ver [`NOTICE.md`](./NOTICE.md)).
- **Tus datos y tu contenido:** siguen siendo tuyos. No se reclama ningún derecho sobre ellos.

## 10. Componentes de terceros

El Sistema incluye componentes de terceros con sus propias licencias (React, Express, Prisma, Lucide, entre otros). Esas licencias se respetan y se detallan en [`NOTICE.md`](./NOTICE.md). MySQL, MariaDB, Node.js y Docker **no** forman parte del paquete: los aporta el operador y se rigen por sus propios términos.

## 11. Garantías

El Sistema se entrega **«tal cual»** y **«según disponibilidad»**, sin garantías de ningún tipo, expresas o implícitas, incluidas las de comerciabilidad, idoneidad para un fin particular y no infracción, en la máxima medida permitida por la ley aplicable.

No se garantiza que el Sistema sea ininterrumpido, esté libre de errores o sea compatible con todo hardware, navegador o versión de MySQL/MariaDB.

## 12. Limitación de responsabilidad

En la máxima medida permitida por la ley, el autor no será responsable por daños directos, indirectos, incidentales, especiales, consecuentes o punitivos, ni por lucro cesante, pérdida de datos, pérdida de ingresos, errores de cobro, sanciones fiscales o interrupciones del negocio derivados del uso o de la imposibilidad de usar el Sistema.

Nada en estos términos excluye responsabilidades que no puedan excluirse legalmente (por ejemplo, dolo o culpa grave, o derechos del consumidor cuando apliquen).

## 13. Cambios en los términos

Estos términos pueden actualizarse. La fecha de la última revisión figura al inicio y el historial queda público en el repositorio. El uso del Sistema después de una actualización implica su aceptación.

## 14. Terminación

Puedes dejar de usar el Sistema en cualquier momento desinstalándolo. La licencia MIT sobre el código **no se revoca** por dejar de usar la distribución oficial: sigue vigente en los términos del archivo `LICENSE`.

## 15. Legislación aplicable y conflictos

Estos términos se rigen por las leyes de **[PAÍS / JURISDICCIÓN — completar]**. Cualquier controversia se someterá a los tribunales de **[CIUDAD — completar]**, salvo norma imperativa en contrario.

Antes de acudir a la justicia, las partes se comprometen a intentar una solución directa por escrito durante al menos **30 días**.

## 16. Contacto

- Repositorio y soporte: <https://github.com/Yefer-Betta/2Arbolitos>
- Reportes de seguridad: ver [`SECURITY.md`](./SECURITY.md) (no uses issues públicos).

---

_Consulta también la [Política de privacidad](./PRIVACY.md), los [Avisos de terceros](./NOTICE.md) y la [licencia MIT](./LICENSE)._
