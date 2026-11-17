import { describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    closure: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    order: { findMany: vi.fn() },
  },
}));

vi.mock('../server/src/config/database.js', () => ({ default: prismaMock }));

const { closureController } = await import('../server/src/controllers/closureController.js');

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('cierre de caja (C3)', () => {
  it('no suma el vuelto del efectivo como venta', async () => {
    prismaMock.closure.findFirst.mockResolvedValue(null);
    prismaMock.order.findMany.mockResolvedValue([
      {
        id: 'o1',
        totalCop: 45000,
        payments: [
          { method: 'CASH_COP', currency: 'COP', amount: 50000, change: 5000 },
        ],
      },
    ]);

    const res = response();
    const next = vi.fn();

    await closureController.createClosure({
      body: {
        salesByMethod: { cash_cop: 50000 },
        totalSalesCOP: 50000,
        lastClosureDate: new Date(0).toISOString(),
      },
    }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    const data = prismaMock.closure.create.mock.calls[0][0].data;
    expect(data.totalSalesCOP).toBe(45000);
    expect(data.salesByMethod.cash_cop).toBe(45000);
  });

  it('usa el periodo desde el último cierre previo', async () => {
    prismaMock.closure.findFirst.mockResolvedValue({ id: 'c-prev', date: new Date('2026-01-01T10:00:00Z') });
    prismaMock.order.findMany.mockResolvedValue([]);

    const res = response();
    const next = vi.fn();

    await closureController.createClosure({
      body: { lastClosureDate: new Date('2026-01-01T09:00:00Z').toISOString() },
    }, res, next);

    expect(prismaMock.order.findMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gt: new Date('2026-01-01T10:00:00Z'),
          lte: expect.any(Date),
        },
      },
      include: { payments: true },
    });
  });
});