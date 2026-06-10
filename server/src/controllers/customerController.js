import prisma from '../config/database.js';
import { auditAction } from '../middleware/audit.js';

export const customerController = {
  async list(req, res) {
    try {
      const { search } = req.query;
      const where = search ? {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } },
          { email: { contains: search } },
        ],
      } : {};
      const customers = await prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.json(customers);
    } catch (error) {
      console.error('Error al listar clientes:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getById(req, res) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: req.params.id },
      });
      if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
      res.json(customer);
    } catch (error) {
      console.error('Error al obtener cliente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async create(req, res) {
    try {
      const { name, phone, email, address } = req.body;
      if (!name) return res.status(400).json({ error: 'Nombre requerido' });

      const customer = await prisma.customer.create({
        data: { name, phone, email, address },
      });

      await auditAction('Customer', customer.id, 'CREATE', null, customer, req.user?.id);
      res.status(201).json(customer);
    } catch (error) {
      console.error('Error al crear cliente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async update(req, res) {
    try {
      const { name, phone, email, address } = req.body;
      const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' });

      const customer = await prisma.customer.update({
        where: { id: req.params.id },
        data: { name, phone, email, address },
      });

      await auditAction('Customer', customer.id, 'UPDATE', existing, customer, req.user?.id);
      res.json(customer);
    } catch (error) {
      console.error('Error al actualizar cliente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getOrders(req, res) {
    try {
      const orders = await prisma.order.findMany({
        where: { customerId: req.params.id },
        include: {
          items: { include: { product: { select: { name: true } } } },
          payment: true,
          table: { select: { number: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      res.json(orders);
    } catch (error) {
      console.error('Error al obtener órdenes del cliente:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};
