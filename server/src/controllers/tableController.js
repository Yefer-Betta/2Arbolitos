import prisma from '../config/database.js';

export const tableController = {
  async getTables(req, res) {
    try {
      const { active } = req.query;

      const where = {};
      if (active !== undefined) {
        where.active = active === 'true';
      }

      const tables = await prisma.table.findMany({
        where,
        include: {
          orders: {
            where: {
              status: {
                in: ['PENDING', 'PREPARING', 'READY'],
              },
            },
            include: {
              items: true,
            },
          },
        },
        orderBy: { number: 'asc' },
      });

      const tablesWithStatus = tables.map(table => ({
        ...table,
        isOccupied: table.orders.length > 0,
        currentOrder: table.orders[0] || null,
      }));

      res.json(tablesWithStatus);
    } catch (error) {
      console.error('Error al obtener mesas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getTable(req, res) {
    try {
      const { id } = req.params;

      const table = await prisma.table.findUnique({
        where: { id },
        include: {
          orders: {
            where: {
              status: {
                in: ['PENDING', 'PREPARING', 'READY'],
              },
            },
            include: {
              items: {
                include: {
                  product: true,
                },
              },
              user: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      if (!table) {
        return res.status(404).json({ error: 'Mesa no encontrada' });
      }

      res.json(table);
    } catch (error) {
      console.error('Error al obtener mesa:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async createTable(req, res) {
    try {
      const { number, name, capacity } = req.body;

      if (!number) {
        return res.status(400).json({ error: 'Número de mesa requerido' });
      }

      const existingTable = await prisma.table.findUnique({
        where: { number },
      });

      if (existingTable) {
        return res.status(400).json({ error: 'Ya existe una mesa con este número' });
      }

      const table = await prisma.table.create({
        data: {
          number,
          name,
          capacity: capacity || 4,
        },
      });

      res.status(201).json(table);
    } catch (error) {
      console.error('Error al crear mesa:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async updateTable(req, res) {
    try {
      const { id } = req.params;
      const { number, name, capacity, active } = req.body;

      const data = {};
      if (number) data.number = number;
      if (name !== undefined) data.name = name;
      if (capacity) data.capacity = capacity;
      if (active !== undefined) data.active = active;

      const table = await prisma.table.update({
        where: { id },
        data,
      });

      res.json(table);
    } catch (error) {
      console.error('Error al actualizar mesa:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async deleteTable(req, res) {
    try {
      const { id } = req.params;

      await prisma.table.update({
        where: { id },
        data: { active: false },
      });

      res.json({ message: 'Mesa desactivada correctamente' });
    } catch (error) {
      console.error('Error al eliminar mesa:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};
