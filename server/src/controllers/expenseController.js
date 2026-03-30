import prisma from '../config/database.js';

export const expenseController = {
  async getExpenses(req, res) {
    try {
      const expenses = await prisma.settings.findMany({
        where: { key: { startsWith: 'expense_' } },
        orderBy: { updatedAt: 'desc' },
      });

      const parsedExpenses = expenses.map(e => {
        try {
          return JSON.parse(e.value);
        } catch {
          return { id: e.id, description: e.value, amount: 0, date: e.updatedAt };
        }
      });

      res.json(parsedExpenses);
    } catch (error) {
      console.error('Error al obtener gastos:', error);
      res.json([]);
    }
  },

  async createExpense(req, res) {
    try {
      const { description, amount, category, date } = req.body;
      
      const expenseData = {
        description,
        amount: parseFloat(amount),
        category,
        date: date || new Date().toISOString(),
      };

      await prisma.settings.create({
        data: {
          key: `expense_${Date.now()}`,
          value: JSON.stringify(expenseData),
          type: 'object',
        },
      });

      res.status(201).json(expenseData);
    } catch (error) {
      console.error('Error al crear gasto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};
