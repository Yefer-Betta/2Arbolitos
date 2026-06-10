import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { authorizePermissions } from '../middleware/authorizePermissions.js';

const prisma = new PrismaClient();
const router = Router();

function audit(entity, entityId, action, before, after, userId) {
  prisma.auditLog.create({ data: { entity, entityId, action, before, after, userId } }).catch(() => {});
}

function getUserId(req) {
  return req.user?.id || null;
}

router.get('/inventory', async (req, res) => {
  const lowStock = req.query.low === 'true';
  const where = lowStock
    ? { quantity: { lte: 0 } }
    : {};
  const items = await prisma.inventoryItem.findMany({ where, orderBy: { name: 'asc' } });
  res.json(items);
});

router.get('/inventory/:id', async (req, res) => {
  const item = await prisma.inventoryItem.findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: 'No encontrado' });
  res.json(item);
});

router.post('/inventory', authenticate, authorizePermissions(['MANAGE_INVENTORY']), async (req, res) => {
  const data = req.body;
  const item = await prisma.inventoryItem.create({ data });
  audit('InventoryItem', item.id, 'CREATE', null, item, getUserId(req));
  res.status(201).json(item);
});

router.patch('/inventory/:id', authenticate, authorizePermissions(['MANAGE_INVENTORY']), async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const before = await prisma.inventoryItem.findUnique({ where: { id } });
  const item = await prisma.inventoryItem.update({ where: { id }, data });
  audit('InventoryItem', id, 'UPDATE', before, item, getUserId(req));
  res.json(item);
});

router.delete('/inventory/:id', authenticate, authorizePermissions(['MANAGE_INVENTORY']), async (req, res) => {
  const { id } = req.params;
  const before = await prisma.inventoryItem.findUnique({ where: { id } });
  await prisma.inventoryItem.delete({ where: { id } });
  audit('InventoryItem', id, 'DELETE', before, null, getUserId(req));
  res.status(204).send();
});

export default router;
