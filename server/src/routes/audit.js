import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { authorizePermissions } from '../middleware/authorizePermissions.js';

const prisma = new PrismaClient();
const router = Router();

// Listar log de auditoría con filtros opcionales
router.get('/audit', authenticate, authorizePermissions(['VIEW_AUDIT']), async (req, res) => {
  const { entity, userId, days, limit } = req.query;

  const where = {};
  if (entity) where.entity = entity;
  if (userId) where.userId = userId;
  if (days) {
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));
    where.timestamp = { gte: since };
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: parseInt(limit) || 100,
  });
  res.json(logs);
});

// Obtener detalle de un log
router.get('/audit/:id', authenticate, authorizePermissions(['VIEW_AUDIT']), async (req, res) => {
  const log = await prisma.auditLog.findUnique({ where: { id: req.params.id } });
  if (!log) return res.status(404).json({ error: 'No encontrado' });
  res.json(log);
});

export default router;
