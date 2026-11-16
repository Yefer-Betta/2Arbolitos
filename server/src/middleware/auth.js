import jwt from 'jsonwebtoken';
import { parseCookies, TOKEN_COOKIE } from '../config/cookies.js';

/**
 * Obtiene el JWT desde la cookie httpOnly (navegador) o, como respaldo,
 * desde el header `Authorization: Bearer` (clientes no-navegador/scripts).
 */
function getToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies[TOKEN_COOKIE] || null;
}

const PASSWORD_CHANGE_ALLOWED_PATHS = new Set([
  '/api/auth/password',
  '/api/auth/logout',
  '/api/auth/verify',
]);

export const authenticate = (req, res, next) => {
  try {
    const token = getToken(req);

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;

    const path = req.originalUrl.split('?')[0];
    if (decoded.mustChangePassword && !PASSWORD_CHANGE_ALLOWED_PATHS.has(path)) {
      return res.status(403).json({
        error: 'Debes cambiar la contraseña antes de continuar',
        code: 'MUST_CHANGE_PASSWORD',
      });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    next();
  };
};
