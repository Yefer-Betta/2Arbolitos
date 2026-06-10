import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware que registra auditoría para operaciones CREATE/UPDATE/DELETE.
 * Lee el estado anterior, pasa al controlador y guarda el estado posterior.
 */
export function auditAction(req, res, next) {
  const userId = req.user?.id || null;
  const method = req.method;
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next();

  const entity = req.baseUrl.replace('/api/', '').split('/')[0];
  const entityId = req.params.id || req.body?.id;

  if (!entity || !entityId) return next();

  // Obtener estado anterior
  let before = null;
  prisma[entity]
    ? prisma[entity].findUnique({ where: { id: entityId } }).then(r => (before = r)).catch(() => {})
    : null;

  res.on('finish', async () => {
    let after = null;
    if (prisma[entity]) {
      try {
        after = await prisma[entity].findUnique({ where: { id: entityId } });
      } catch (_) {}
    }
    const actionMap = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };
    const action = actionMap[method] || method;
    await prisma.auditLog.create({
      data: {
        entity,
        entityId,
        action,
        before: before || undefined,
        after: after || undefined,
        userId,
      },
    });
  });
  next();
}
