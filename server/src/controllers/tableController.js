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

  // TableState for active table synchronization
  async getTableStates(req, res) {
    try {
      const states = await prisma.tableState.findMany();
      const result = {};
      states.forEach(state => {
        result[state.tableId] = JSON.parse(state.items || '[]');
      });
      res.json(result);
    } catch (error) {
      console.error('Error al obtener estados de mesas:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getTableState(req, res) {
    try {
      const { tableId } = req.params;
      const state = await prisma.tableState.findUnique({
        where: { tableId },
      });
      if (!state) {
        return res.json([]);
      }
      res.json(JSON.parse(state.items || '[]'));
    } catch (error) {
      console.error('Error al obtener estado de mesa:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async updateTableState(req, res) {
    try {
      const { tableId, items } = req.body;
      if (!tableId) {
        return res.status(400).json({ error: 'tableId requerido' });
      }

      const itemsJson = JSON.stringify(items || []);
      
      const state = await prisma.tableState.upsert({
        where: { tableId },
        update: { items: itemsJson },
        create: { tableId, items: itemsJson },
      });

      res.json({ success: true, tableId, items: JSON.parse(state.items) });
    } catch (error) {
      console.error('Error al actualizar estado de mesa:', error, error.stack);
      res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
  },

  async deleteTableState(req, res) {
    try {
      const { tableId } = req.params;
      await prisma.tableState.delete({
        where: { tableId },
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error al eliminar estado de mesa:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};
