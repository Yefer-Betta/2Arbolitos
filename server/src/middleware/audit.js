import prisma from '../config/database.js';

const ALLOWED_AUDIT_ENTITIES = new Set([
  'product', 'category', 'order', 'user', 'table', 'expense',
  'inventoryItem', 'inventoryMovement', 'customer', 'supplier',
  'reservation', 'modifier', 'modifierGroup', 'purchaseOrder', 'attendance',
]);

const MODEL_MAP = {
  product: 'product',
  category: 'category',
  order: 'order',
  user: 'user',
  table: 'table',
  expense: 'expense',
  inventoryItem: 'inventoryItem',
  inventoryMovement: 'inventoryMovement',
  customer: 'customer',
  supplier: 'supplier',
  reservation: 'reservation',
  modifier: 'modifier',
  modifierGroup: 'modifierGroup',
  purchaseOrder: 'purchaseOrder',
  attendance: 'attendance',
};

const ACTION_MAP = { POST: 'CREATE', PUT: 'UPDATE', PATCH: 'UPDATE', DELETE: 'DELETE' };

export async function auditLog(entity, entityId, action, before, after, userId) {
  const model = MODEL_MAP[entity];
  if (!model) return;
  try {
    await prisma.auditLog.create({
      data: { entity, entityId, action, before: before || undefined, after: after || undefined, userId },
    });
  } catch (_) {}
}

export function auditAction(req, res, next) {
  const userId = req.user?.id || null;
  const method = req.method;
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return next();

  const entity = req.baseUrl.replace('/api/', '').split('/')[0];
  const entityId = req.params.id || req.body?.id;

  if (!entity || !entityId || !ALLOWED_AUDIT_ENTITIES.has(entity)) return next();

  let before = null;
  const modelName = MODEL_MAP[entity];
  if (modelName) {
    prisma[modelName].findUnique({ where: { id: entityId } })
      .then(r => (before = r)).catch(() => {});
  }

  res.on('finish', async () => {
    let after = null;
    if (modelName) {
      try {
        after = await prisma[modelName].findUnique({ where: { id: entityId } });
      } catch (_) {}
    }
    const action = ACTION_MAP[method] || method;
    await auditLog(entity, entityId, action, before, after, userId);
  });
  next();
}
