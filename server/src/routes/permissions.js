import { Router } from 'express';
import prisma from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { authorizePermissions } from '../middleware/authorizePermissions.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
const router = Router();

router.get('/permissions', authenticate, authorizePermissions(['MANAGE_PERMISSIONS']), asyncHandler(async (req, res) => {
  const permissions = await prisma.permission.findMany({ orderBy: { name: 'asc' } });
  res.json(permissions);
}));

router.post('/permissions', authenticate, authorizePermissions(['MANAGE_PERMISSIONS']), asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) throw new AppError('name requerido', 400);
  const perm = await prisma.permission.create({ data: { name } });
  res.status(201).json(perm);
}));

router.delete('/permissions/:id', authenticate, authorizePermissions(['MANAGE_PERMISSIONS']), asyncHandler(async (req, res) => {
  await prisma.permission.delete({ where: { id: req.params.id } });
  res.status(204).send();
}));

router.get('/roles/:role/permissions', authenticate, authorizePermissions(['MANAGE_PERMISSIONS']), asyncHandler(async (req, res) => {
  const { role } = req.params;
  const rps = await prisma.rolePermission.findMany({
    where: { roleName: role },
    include: { permission: true },
  });
  res.json(rps.map(rp => rp.permission));
}));

router.post('/roles/:role/permissions', authenticate, authorizePermissions(['MANAGE_PERMISSIONS']), asyncHandler(async (req, res) => {
  const { role } = req.params;
  const { permissionId } = req.body;
  if (!permissionId) throw new AppError('permissionId requerido', 400);
  const rp = await prisma.rolePermission.create({
    data: { roleName: role, permissionId },
    include: { permission: true },
  });
  res.status(201).json(rp);
}));

router.delete('/roles/:role/permissions/:permissionId', authenticate, authorizePermissions(['MANAGE_PERMISSIONS']), asyncHandler(async (req, res) => {
  const { role, permissionId } = req.params;
  await prisma.rolePermission.delete({
    where: { roleName_permissionId: { roleName: role, permissionId } },
  });
  res.status(204).send();
}));

export default router;
