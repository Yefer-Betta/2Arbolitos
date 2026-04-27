import prisma from '../config/database.js';

export const expenseController = {
  async getExpenses(req, res) {
    try {
      const expenses = await prisma.expense.findMany({
        orderBy: { date: 'desc' },
      });

      res.json(expenses);
    } catch (error) {
      console.error('Error al obtener gastos:', error);
      res.json([]);
    }
  },

  async createExpense(req, res) {
    try {
      const { description, amount, category, date } = req.body;
      
      const expense = await prisma.expense.create({
        data: {
          description,
          amount: parseFloat(amount),
          category,
          date: date ? new Date(date) : new Date(),
        },
      });

      res.status(201).json(expense);
    } catch (error) {
      console.error('Error al crear gasto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async deleteExpense(req, res) {
    try {
      const { id } = req.params;
      await prisma.expense.delete({ where: { id } });
      res.status(204).send();
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};
