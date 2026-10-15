export const TOKEN_COOKIE = 'token';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Opciones de la cookie de sesión (JWT).
 * En LAN el frontend y la API se sirven por HTTP, así que `secure` debe quedar
 * en false; si algún día se despliega detrás de HTTPS, definir COOKIE_SECURE=true.
 */
export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: SEVEN_DAYS_MS,
  };
}

/**
 * Parser mínimo de `Cookie` header. Evita depender de cookie-parser para leer
 * una sola cookie (`token`).
 */
export function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;

    const key = part.slice(0, index).trim();
    if (!key) continue;

    const value = part.slice(index + 1).trim();
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }

  return cookies;
}
