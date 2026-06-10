import prisma from '../config/database.js';

export const reservationController = {
  async list(req, res) {
    try {
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
    } catch (error) {
      console.error('Error al listar reservas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getById(req, res) {
    try {
      const reservation = await prisma.reservation.findUnique({
        where: { id: req.params.id },
        include: { table: { select: { number: true, name: true } } },
      });
      if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' });
      res.json(reservation);
    } catch (error) {
      console.error('Error al obtener reserva:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async create(req, res) {
    try {
      const { customerName, phone, email, guests, dateTime, tableId, notes, status } = req.body;
      if (!customerName || !dateTime) {
        return res.status(400).json({ error: 'Nombre y fecha/hora requeridos' });
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
    } catch (error) {
      console.error('Error al crear reserva:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async update(req, res) {
    try {
      const { customerName, phone, email, guests, dateTime, tableId, notes, status } = req.body;
      const existing = await prisma.reservation.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: 'Reserva no encontrada' });

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
    } catch (error) {
      console.error('Error al actualizar reserva:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async delete(req, res) {
    try {
      const existing = await prisma.reservation.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: 'Reserva no encontrada' });
      await prisma.reservation.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      console.error('Error al eliminar reserva:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};
