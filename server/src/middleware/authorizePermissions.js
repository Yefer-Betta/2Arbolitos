import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware que verifica si el rol del usuario tiene los permisos solicitados.
 * Uso: authorizePermissions(['MANAGE_INVENTORY', 'VIEW_REPORTS'])
 */
export function authorizePermissions(requiredPermissions) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    const roleName = req.user.role; // ej. 'ADMIN'

    // ADMIN tiene acceso total sin consultar la tabla
    if (roleName === 'ADMIN') {
      return next();
    }

    // Obtener los permisos asociados al rol desde la BD
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleName },
      include: { permission: true },
    });
    const granted = rolePermissions.map(rp => rp.permission.name);

    const missing = requiredPermissions.filter(p => !granted.includes(p));
    if (missing.length > 0) {
      return res.status(403).json({ error: 'Permiso insuficiente', missing });
    }
    next();
  };
}
