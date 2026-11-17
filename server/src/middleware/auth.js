import jwt from 'jsonwebtoken';
import { parseCookies, TOKEN_COOKIE } from '../config/cookies.js';
import prisma from '../config/database.js';

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

/**
 * Verifica que el tokenVersion del JWT coincida con el de la BD.
 * Si el usuario cambió contraseña, el tokenVersion se incrementó y el JWT anterior es inválido.
 */
export async function verifyTokenVersion(decoded) {
  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { tokenVersion: true },
  });

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  if (user.tokenVersion !== decoded.tokenVersion) {
    throw new Error('Token inválido - la contraseña ha sido cambiada');
  }
}

export const authenticate = async (req, res, next) => {
  try {
    const token = getToken(req);

    if (!token) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificar tokenVersion para detectar cambios de contraseña
    await verifyTokenVersion(decoded);

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
    if (error.message === 'Token inválido - la contraseña ha sido cambiada') {
      return res.status(401).json({ error: 'Token inválido - la contraseña ha sido cambiada', code: 'TOKEN_VERSION_MISMATCH' });
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
