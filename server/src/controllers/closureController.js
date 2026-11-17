import prisma from '../config/database.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { aggregateSalesByMethod } from '../shared/money.js';

export const closureController = {
  getClosures: asyncHandler(async (req, res) => {
    const closures = await prisma.closure.findMany({
      orderBy: { date: 'desc' },
    });
    res.json(closures);
  }),

  createClosure: asyncHandler(async (req, res) => {
    const {
      id,
      orderCount,
      totalSalesUSD,
      totalExpenses,
      exchangeRate,
      countedCash,
      countedUsd,
      countedBs,
      countedNequi,
      countedDebit,
      differences,
      totalDifference,
      notes,
    } = req.body;

    const closureDate = req.body.date ? new Date(req.body.date) : new Date();
    const previousClosure = await prisma.closure.findFirst({ orderBy: { date: 'desc' } });
    const cutoff = previousClosure ? new Date(previousClosure.date) : new Date(0);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gt: cutoff, lte: closureDate } },
      include: { payments: true },
    });

    const recalculatedSalesByMethod = aggregateSalesByMethod(orders);
    const recalculatedTotalSalesCOP = orders.reduce((sum, order) => sum + (order.totalCop || 0), 0);

    const closure = await prisma.closure.create({
      data: {
        ...(id ? { id } : {}),
        date: closureDate,
        orderCount: orderCount || 0,
        totalSalesCOP: recalculatedTotalSalesCOP,
        totalSalesUSD: totalSalesUSD || 0,
        totalExpenses: totalExpenses || 0,
        exchangeRate: exchangeRate || 4000,
        salesByMethod: recalculatedSalesByMethod,
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