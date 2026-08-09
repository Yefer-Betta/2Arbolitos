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
  }),

  deleteExpense: asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.expense.delete({ where: { id } });
    res.status(204).send();
  }),
};
