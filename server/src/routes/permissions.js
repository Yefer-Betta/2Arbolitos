import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import { authorizePermissions } from '../middleware/authorizePermissions.js';

const prisma = new PrismaClient();
const router = Router();

// Listar todos los permisos disponibles
router.get('/permissions', authenticate, authorizePermissions(['MANAGE_PERMISSIONS']), async (req, res) => {
  const permissions = await prisma.permission.findMany({ orderBy: { name: 'asc' } });
  res.json(permissions);
});

// Crear un permiso nuevo
router.post('/permissions', authenticate, authorizePermissions(['MANAGE_PERMISSIONS']), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name requerido' });
  const perm = await prisma.permission.create({ data: { name } });
  res.status(201).json(perm);
});

// Eliminar permiso
router.delete('/permissions/:id', authenticate, authorizePermissions(['MANAGE_PERMISSIONS']), async (req, res) => {
  await prisma.permission.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Obtener los permisos asignados a un rol
router.get('/roles/:role/permissions', authenticate, authorizePermissions(['MANAGE_PERMISSIONS']), async (req, res) => {
  const { role } = req.params;
  const rps = await prisma.rolePermission.findMany({
    where: { roleName: role },
    include: { permission: true },
  });
  res.json(rps.map(rp => rp.permission));
});

// Asignar permiso a un rol
router.post('/roles/:role/permissions', authenticate, authorizePermissions(['MANAGE_PERMISSIONS']), async (req, res) => {
  const { role } = req.params;
  const { permissionId } = req.body;
  if (!permissionId) return res.status(400).json({ error: 'permissionId requerido' });
  const rp = await prisma.rolePermission.create({
    data: { roleName: role, permissionId },
    include: { permission: true },
  });
  res.status(201).json(rp);
});

// Quitar permiso de un rol
router.delete('/roles/:role/permissions/:permissionId', authenticate, authorizePermissions(['MANAGE_PERMISSIONS']), async (req, res) => {
  const { role, permissionId } = req.params;
  await prisma.rolePermission.delete({
    where: { roleName_permissionId: { roleName: role, permissionId } },
  });
  res.status(204).send();
});

export default router;
