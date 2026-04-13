import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

export const authController = {
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
      }

      const user = await prisma.user.findUnique({
        where: { username },
      });

      if (!user || !user.active) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async register(req, res) {
    try {
      console.log(' register - Body:', req.body);
      console.log(' register - User:', req.user);
      
      const { username, password, name, role } = req.body;

      if (!username || !password || !name) {
        return res.status(400).json({ error: 'Datos incompletos' });
      }

      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'El usuario ya existe' });
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
    } catch (error) {
      console.error('Error en registro:', error);
      console.error('Stack:', error.stack);
      res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
    }
  },

  async verifyToken(req, res) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, username: true, name: true, role: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Error en verifyToken:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getUsers(req, res) {
    try {
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
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async updateUser(req, res) {
    try {
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
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      await prisma.user.update({
        where: { id },
        data: { active: false },
      });

      res.json({ message: 'Usuario desactivado correctamente' });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};
