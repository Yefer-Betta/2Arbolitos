import prisma from '../config/database.js';

export const closureController = {
  async getClosures(req, res) {
    try {
      const closures = await prisma.closure.findMany({
        orderBy: { date: 'desc' },
      });
      res.json(closures);
    } catch (error) {
      console.error('Error al obtener cierres:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async createClosure(req, res) {
    try {
      const { orderCount, totalSalesCOP, totalSalesUSD, totalExpenses, exchangeRate, notes } = req.body;

      const closure = await prisma.closure.create({
        data: {
          orderCount: orderCount || 0,
          totalSalesCOP: totalSalesCOP || 0,
          totalSalesUSD: totalSalesUSD || 0,
          totalExpenses: totalExpenses || 0,
          exchangeRate: exchangeRate || 4000,
          notes: notes || null,
        },
      });

      res.status(201).json(closure);
    } catch (error) {
      console.error('Error al crear cierre:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async deleteClosure(req, res) {
    try {
      const { id } = req.params;
      await prisma.closure.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      console.error('Error al eliminar cierre:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};