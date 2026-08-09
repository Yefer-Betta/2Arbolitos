import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorizePermissions } from '../middleware/authorizePermissions.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
const router = Router();

router.get('/audit', authenticate, authorizePermissions(['VIEW_AUDIT']), asyncHandler(async (req, res) => {
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
}));

router.get('/audit/:id', authenticate, authorizePermissions(['VIEW_AUDIT']), asyncHandler(async (req, res) => {
  const log = await prisma.auditLog.findUnique({ where: { id: req.params.id } });
  if (!log) throw new AppError('No encontrado', 404);
  res.json(log);
}));

export default router;
