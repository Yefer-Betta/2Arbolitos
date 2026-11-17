import { describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    order: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    payment: { create: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock('../server/src/config/database.js', () => ({ default: prismaMock }));

const { orderController } = await import('../server/src/controllers/orderController.js');
const { addPayment } = orderController;

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('addPayment idempotency y validación de suma ≤ total (C5)', () => {
  it('rechaza una suma de pagos > total del pedido', async () => {
    const orderId = 'order-1';
    const order = {
      id: orderId,
      totalCop: 10000,
      exchangeRate: 4000,
      exchangeRateBs: 40,
    };
    const existingPayments = [
      { amount: 6000, currency: 'COP' },
      { amount: 5000, currency: 'COP' },
    ];
    const newPayment = {
      method: 'CASH_COP',
      currency: 'COP',
      amount: 1000,
    };

    prismaMock.order.findUnique.mockResolvedValue(order);
    prismaMock.payment.findMany.mockResolvedValue(existingPayments);

    const res = response();
    const next = vi.fn();

    await addPayment({ params: { id: orderId }, body: { payments: [newPayment] } }, res, next);

    expect(prismaMock.order.findUnique).toHaveBeenCalledWith({
      where: { id: orderId },
      select: { totalCop: true, exchangeRate: true, exchangeRateBs: true },
    });
    expect(prismaMock.payment.findMany).toHaveBeenCalledWith({
      where: { orderId: orderId },
      select: { amount: true, currency: true },
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].statusCode).toBe(400);
    expect(next.mock.calls[0][0].message).toBe('La suma de pagos supera el total del pedido');
  });

  it('permite sumas exactas o dentro del límite de 1 peso', async () => {
    const orderId = 'order-2';
    const order = {
      id: orderId,
      totalCop: 10000,
      exchangeRate: 4000,
      exchangeRateBs: 40,
    };
    const existingPayments = [
      { amount: 5000, currency: 'COP' },
    ];
    const newPayment = {
      method: 'CASH_COP',
      currency: 'COP',
      amount: 5000,
    };

    prismaMock.order.findUnique.mockResolvedValue(order);
    prismaMock.payment.findMany.mockResolvedValue(existingPayments);

    const res = response();
    const next = vi.fn();

    await addPayment({ params: { id: orderId }, body: { payments: [newPayment] } }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(prismaMock.payment.create).toHaveBeenCalled();
  });

  it('normaliza métodos de pago a mayúsculas y aplica tipos de moneda por defecto', async () => {
    const orderId = 'order-3';
    const order = {
      id: orderId,
      totalCop: 10000,
      exchangeRate: 4000,
      exchangeRateBs: 40,
    };
    const existingPayments = [];
    const newPayment = {
      method: 'cash_cop',
      amount: 10000,
    };

    prismaMock.order.findUnique.mockResolvedValue(order);
    prismaMock.payment.findMany.mockResolvedValue(existingPayments);
    prismaMock.payment.create.mockResolvedValue({ id: 'pay-1', ...newPayment });

    const res = response();
    const next = vi.fn();

    await addPayment({ params: { id: orderId }, body: { payments: [newPayment] } }, res, next);

    expect(prismaMock.payment.create).toHaveBeenCalledWith({
      data: {
        orderId: orderId,
        method: 'CASH_COP',
        currency: 'COP',
        amount: 10000,
        change: 0,
        reference: undefined,
      },
    });
  });
});
