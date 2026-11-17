import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const expenseController = {
  getExpenses: asyncHandler(async (req, res) => {
    const expenses = await prisma.expense.findMany({
      orderBy: { date: 'desc' },
    });

    res.json(expenses);
  }),

  createExpense: asyncHandler(async (req, res) => {
    const { id, description, amount, category, date } = req.body;

    const expenseDate = date ? new Date(date) : new Date();

    if (id) {
      // El cliente envía un id; el servidor hace upsert así un doble envío no
      // crea dos registros con el mismo id.
      const expense = await prisma.expense.upsert({
        where: { id },
        update: {
          description,
          amount: parseFloat(amount),
          category,
          date: expenseDate,
        },
        create: {
          id,
          description,
          amount: parseFloat(amount),
          category,
          date: expenseDate,
        },
      });

      res.status(201).json(expense);
      return;
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        amount: parseFloat(amount),
        category,
        date: expenseDate,
      },
    });

    res.status(201).json(expense);
  }),

  deleteExpense: asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.expense.delete({ where: { id } });
    res.status(204).send();
  }),
};
