import prisma from '../config/database.js';

export const attendanceController = {
  async list(req, res) {
    try {
      const { startDate, endDate, userId } = req.query;
      const where = {};
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
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
    } catch (error) {
      console.error('Error al listar asistencias:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async checkIn(req, res) {
    try {
      const userId = req.body.userId || req.user?.id;
      if (!userId) return res.status(400).json({ error: 'Usuario requerido' });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existing = await prisma.attendance.findFirst({
        where: { userId, date: { gte: today, lt: tomorrow } },
      });
      if (existing) return res.status(400).json({ error: 'Ya tiene un registro de entrada hoy' });

      const record = await prisma.attendance.create({
        data: { userId, date: new Date(), checkIn: new Date() },
        include: { user: { select: { id: true, name: true } } },
      });
      res.status(201).json(record);
    } catch (error) {
      console.error('Error al registrar entrada:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async checkOut(req, res) {
    try {
      const userId = req.body.userId || req.user?.id;
      if (!userId) return res.status(400).json({ error: 'Usuario requerido' });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const record = await prisma.attendance.findFirst({
        where: { userId, date: { gte: today, lt: tomorrow }, checkOut: null },
      });
      if (!record) return res.status(400).json({ error: 'No hay registro de entrada activo hoy' });

      const checkOut = new Date();
      const hours = (checkOut - record.checkIn) / (1000 * 60 * 60);

      const updated = await prisma.attendance.update({
        where: { id: record.id },
        data: { checkOut, hours: Math.round(hours * 100) / 100 },
        include: { user: { select: { id: true, name: true } } },
      });
      res.json(updated);
    } catch (error) {
      console.error('Error al registrar salida:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getTodayStatus(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.json({ checkedIn: false });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const record = await prisma.attendance.findFirst({
        where: { userId, date: { gte: today, lt: tomorrow } },
      });
      res.json({
        checkedIn: !!record,
        checkedOut: !!record?.checkOut,
        record,
      });
    } catch (error) {
      console.error('Error al obtener estado:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};
