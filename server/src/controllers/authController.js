import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const authController = {
  login: asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      throw new AppError('Usuario y contraseña requeridos', 400);
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || !user.active) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new AppError('Credenciales inválidas', 401);
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const permissions = await getUserPermissions(user.role);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions,
      },
    });
  }),

  register: asyncHandler(async (req, res) => {
    console.log(' register - User:', req.user?.username);
    
    const { username, password, name, role } = req.body;

    if (!username || !password || !name) {
      throw new AppError('Datos incompletos', 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new AppError('El usuario ya existe', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name,
        role: role || 'WAITER',
      },
    });

    res.status(201).json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });
  }),

  verifyToken: asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, name: true, role: true },
    });

    if (!user) {
      throw new AppError('Usuario no encontrado', 404);
    }

    const permissions = await getUserPermissions(user.role);

    res.json({ user: { ...user, permissions } });
  }),

  getUsers: asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(users);
  }),

  updateUser: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, role, active, password } = req.body;

    const data = { name, role, active };

    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        active: true,
      },
    });

    res.json(user);
  }),

  deleteUser: asyncHandler(async (req, res) => {
    const { id } = req.params;

    await prisma.user.update({
      where: { id },
      data: { active: false },
    });

    res.json({ message: 'Usuario desactivado correctamente' });
  }),
};

async function getUserPermissions(roleName) {
  try {
    const rps = await prisma.rolePermission.findMany({
      where: { roleName },
      include: { permission: { select: { name: true } } },
    });
    return rps.map(rp => rp.permission.name);
  } catch {
    return [];
  }
}
