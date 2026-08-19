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
    const { id, orderCount, totalSalesCOP, totalSalesUSD, totalExpenses, exchangeRate, salesByMethod, countedCash, countedUsd, countedBs, countedNequi, countedDebit, differences, totalDifference, notes } = req.body;

    const closure = await prisma.closure.create({
      data: {
        ...(id ? { id } : {}),
        orderCount: orderCount || 0,
        totalSalesCOP: totalSalesCOP || 0,
        totalSalesUSD: totalSalesUSD || 0,
        totalExpenses: totalExpenses || 0,
        exchangeRate: exchangeRate || 4000,
        salesByMethod: salesByMethod || undefined,
        countedCash: countedCash ?? undefined,
        countedUsd: countedUsd ?? undefined,
        countedBs: countedBs ?? undefined,
        countedNequi: countedNequi ?? undefined,
        countedDebit: countedDebit ?? undefined,
        differences: differences || undefined,
        totalDifference: totalDifference ?? undefined,
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