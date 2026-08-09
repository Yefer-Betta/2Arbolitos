import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

export const closureController = {
  getClosures: asyncHandler(async (req, res) => {
    const closures = await prisma.closure.findMany({
      orderBy: { date: 'desc' },
    });
    res.json(closures);
  }),

  createClosure: asyncHandler(async (req, res) => {
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
  }),

  deleteClosure: asyncHandler(async (req, res) => {
    const { id } = req.params;
    await prisma.closure.delete({ where: { id } });
    res.status(204).send();
  }),
};