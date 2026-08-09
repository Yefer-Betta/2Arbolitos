import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const reservationController = {
  list: asyncHandler(async (req, res) => {
    const { date, status } = req.query;
    const where = {};
    if (date) {
      const start = new Date(date);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      where.dateTime = { gte: start, lt: end };
    }
    if (status) where.status = status;
    const reservations = await prisma.reservation.findMany({
      where,
      include: { table: { select: { number: true, name: true } } },
      orderBy: { dateTime: 'asc' },
    });
    res.json(reservations);
  }),

  getById: asyncHandler(async (req, res) => {
    const reservation = await prisma.reservation.findUnique({
      where: { id: req.params.id },
      include: { table: { select: { number: true, name: true } } },
    });
    if (!reservation) throw new AppError('Reserva no encontrada', 404);
    res.json(reservation);
  }),

  create: asyncHandler(async (req, res) => {
    const { customerName, phone, email, guests, dateTime, tableId, notes, status } = req.body;
    if (!customerName || !dateTime) {
      throw new AppError('Nombre y fecha/hora requeridos', 400);
    }
    const reservation = await prisma.reservation.create({
      data: {
        customerName,
        phone,
        email,
        guests: guests || 1,
        dateTime: new Date(dateTime),
        tableId: tableId || null,
        notes,
        status: status || 'PENDING',
      },
      include: { table: { select: { number: true, name: true } } },
    });
    res.status(201).json(reservation);
  }),

  update: asyncHandler(async (req, res) => {
    const { customerName, phone, email, guests, dateTime, tableId, notes, status } = req.body;
    const existing = await prisma.reservation.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Reserva no encontrada', 404);

    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: {
        customerName,
        phone,
        email,
        guests,
        dateTime: dateTime ? new Date(dateTime) : undefined,
        tableId: tableId !== undefined ? tableId : undefined,
        notes,
        status,
      },
      include: { table: { select: { number: true, name: true } } },
    });
    res.json(reservation);
  }),

  delete: asyncHandler(async (req, res) => {
    const existing = await prisma.reservation.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new AppError('Reserva no encontrada', 404);
    await prisma.reservation.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }),
};
