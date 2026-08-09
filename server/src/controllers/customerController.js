import prisma from '../config/database.js';
import { auditAction } from '../middleware/audit.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const customerController = {
  list: asyncHandler(async (req, res) => {
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
  }),

  getById: asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
    });
    if (!customer) throw new AppError('Cliente no encontrado', 404);
    res.json(customer);
  }),

  create: asyncHandler(async (req, res) => {
    const { name, phone, email, address } = req.body;
    if (!name) throw new AppError('Nombre requerido', 400);

    const customer = await prisma.customer.create({
      data: { name, phone, email, address },
    });

    await auditAction('Customer', customer.id, 'CREATE', null, customer, req.user?.id);
    res.status(201).json(customer);
  }),

  update: asyncHandler(async (req, res) => {
    const { name, phone, email, address } = req.body;
    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Cliente no encontrado', 404);

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { name, phone, email, address },
    });

    await auditAction('Customer', customer.id, 'UPDATE', existing, customer, req.user?.id);
    res.json(customer);
  }),

  getOrders: asyncHandler(async (req, res) => {
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
  }),
};
