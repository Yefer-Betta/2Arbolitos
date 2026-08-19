import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

function parseLocalDate(value) {
  const parts = String(value).split('-').map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(value);
}

export const attendanceController = {
  list: asyncHandler(async (req, res) => {
    const { startDate, endDate, userId } = req.query;
    const where = {};
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = parseLocalDate(startDate);
      if (endDate) {
        const end = parseLocalDate(endDate);
        end.setDate(end.getDate() + 1);
        where.date.lt = end;
      }
    }
    if (userId) where.userId = userId;

    const records = await prisma.attendance.findMany({
      where,
      include: { user: { select: { id: true, name: true, username: true, role: true } } },
      orderBy: { date: 'desc' },
      take: 200,
    });
    res.json(records);
  }),

  checkIn: asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Usuario no autenticado', 401);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const active = await prisma.attendance.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow }, checkOut: null },
    });
    if (active) throw new AppError('Ya tiene un registro de entrada activo hoy', 400);

    const record = await prisma.attendance.create({
      data: { userId, date: new Date(), checkIn: new Date() },
      include: { user: { select: { id: true, name: true } } },
    });
    res.status(201).json(record);
  }),

  checkOut: asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new AppError('Usuario no autenticado', 401);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const record = await prisma.attendance.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow }, checkOut: null },
    });
    if (!record) throw new AppError('No hay registro de entrada activo hoy', 400);

    const checkOut = new Date();
    const hours = (checkOut - record.checkIn) / (1000 * 60 * 60);

    const updated = await prisma.attendance.update({
      where: { id: record.id },
      data: { checkOut, hours: Math.round(hours * 100) / 100 },
      include: { user: { select: { id: true, name: true } } },
    });
    res.json(updated);
  }),

  getTodayStatus: asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.json({ checkedIn: false });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const record = await prisma.attendance.findFirst({
      where: { userId, date: { gte: today, lt: tomorrow }, checkOut: null },
    });
    res.json({
      checkedIn: !!record,
      checkedOut: false,
      record,
    });
  }),
};
