# Política de seguridad

## Versiones soportadas

| Versión | Soporte de seguridad |
|---------|----------------------|
| **1.1.x** (última release) | ✅ Sí |
| 1.0.x y anteriores | ❌ No — actualiza con el panel o desde [Releases](https://github.com/Yefer-Betta/2Arbolitos/releases) |

El sistema está pensado para operar en una **red local (LAN)**. Exponerlo directamente a internet cambia por completo el modelo de amenaza y queda fuera del alcance del soporte.

## Cómo reportar una vulnerabilidad

**No abras un issue público.** Usa el reporte privado de GitHub:

👉 <https://github.com/Yefer-Betta/2Arbolitos/security/advisories/new>

Incluye, si puedes:

1. Versión afectada (`version.txt` o la que muestra el panel).
2. Modo de despliegue (Docker o portable) y sistema operativo.
3. Pasos para reproducir el problema.
4. Impacto que estimas (confidencialidad, integridad, disponibilidad).
5. Prueba de concepto, capturas o registros (sin datos reales de clientes).

**Plazos orientativos:** acuse de recibo en un máximo de **5 días hábiles** y una primera evaluación en **10 días hábiles**. Es un proyecto mantenido por una persona: los plazos son de buena fe y no constituyen un SLA.

Si el reporte es válido, se publicará un aviso (GitHub Security Advisory) y la corrección en una versión nueva, acreditando al reportante salvo que prefiera el anonimato.

## Alcance

**Dentro del alcance**

- Ejecución de código o acceso no autorizado a través de la API.
- Escalada de privilegios entre roles (ADMIN, MANAGER, CASHIER, WAITER, COOK).
- Bypass de autenticación o de la cookie de sesión.
- Inyección SQL, XSS almacenado o reflejado, CSRF sobre endpoints autenticados.
- Fuga de datos entre usuarios o exposición de datos personales en endpoints públicos.
- Vulnerabilidades en el panel o el instalador de Windows (por ejemplo, escritura arbitraria de archivos o elevación de privilegios).
- Debilidades en el proceso de actualización que permitan instalar código no oficial.

**Fuera del alcance**

- Ataques que requieren acceso físico al servidor o a la sesión ya iniciada de un administrador.
- Denegación de servicio desde la propia LAN o fuerza bruta por encima de los límites ya configurados.
- Instalaciones con las contraseñas de ejemplo sin cambiar, o con el puerto 80 publicado a internet.
- Ingeniería social, phishing o malware en el equipo del restaurante.
- Versiones modificadas, forks o paquetes redistribuidos por terceros.
- Vulnerabilidades en MySQL/MariaDB, Docker, Node.js o el sistema operativo (repórtalas a sus proyectos).
- Falta de 2FA (mejora planificada, no vulnerabilidad).

## Medidas de seguridad incluidas

- Contraseñas con hash **bcrypt** (coste 10); nunca se almacenan en texto plano.
- Sesión **JWT en cookie `httpOnly` + `SameSite=Lax`**, duración 7 días, con `Secure` activable por variable de entorno.
- **Rate limiting:** 10 intentos de login cada 15 minutos por IP y 3.000 peticiones API cada 15 minutos (el stream SSE queda excluido).
- **CORS** limitado a `localhost`, `127.0.0.1` y rangos privados `192.168.x.x` / `10.x.x.x`.
- **Helmet** para cabeceras de seguridad; en Docker, Nginx como proxy frontal.
- **MySQL no publicado**: en `docker-compose.yml` la base no expone puertos al host.
- **Autorización por rol** con `authenticate` / `authorize` en las rutas sensibles.
- Seed de datos solo cuando la base está vacía, para no sobrescribir información existente.

## Limitaciones conocidas

- **HTTP en LAN por defecto.** Sin HTTPS, el tráfico viaja sin cifrar dentro de la red. Para acceso remoto usa VPN o un proxy con TLS y define `COOKIE_SECURE=true`.
- **Sin doble factor (2FA).** La protección depende de la contraseña y del control de acceso a la red.
- **CSP desactivada** en Helmet (`contentSecurityPolicy: false`) para no romper la PWA; es una capa de defensa en profundidad pendiente.
- **Actualizaciones desde GitHub.** El panel descarga el ZIP de la release oficial por HTTPS; no hay firma criptográfica del paquete. Verifica que la release venga del repositorio oficial.
- **Sin cifrado de la base de datos.** Quien tenga acceso al archivo o al servidor puede leerla; protege el disco (BitLocker/LUKS) y los respaldos.

## Lista de verificación para el restaurante

- [ ] Cambiar todas las contraseñas de ejemplo el primer día.
- [ ] Un usuario por empleado, con el rol mínimo necesario; desactivar al que salga.
- [ ] No publicar el puerto 80 en el router ni en el firewall perimetral.
- [ ] WiFi del personal con contraseña propia; red separada para invitados.
- [ ] Servidor con inicio de sesión protegido y disco cifrado.
- [ ] Respaldos automáticos fuera del equipo, cifrados y con prueba de restauración.
- [ ] Mantener Docker, Node.js y el sistema operativo actualizados.
- [ ] Revisar el registro de auditoría ante cualquier anomalía de caja.
- [ ] Definir `COOKIE_SECURE=true` si se sirve detrás de HTTPS.

---

_Consulta también los [Términos de uso](./TERMS.md), la [Política de privacidad](./PRIVACY.md) y los [Avisos de terceros](./NOTICE.md)._
