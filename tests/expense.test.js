import { describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    expense: { create: vi.fn(), upsert: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock('../server/src/config/database.js', () => ({ default: prismaMock }));

const { expenseController } = await import('../server/src/controllers/expenseController.js');

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('gasto idempotente (C6)', () => {
  it('usa upsert con el id del cliente para doble envío', async () => {
    const expenseId = 'exp-1';
    prismaMock.expense.upsert.mockResolvedValue({
      id: expenseId,
      description: 'Compra de salsas',
      amount: 12000,
      category: 'insumos',
      date: new Date(),
    });

    const res = response();
    const next = vi.fn();

    await expenseController.createExpense({
      body: {
        id: expenseId,
        description: 'Compra de salsas',
        amount: 12000,
        category: 'insumos',
        date: new Date().toISOString(),
      },
    }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(prismaMock.expense.upsert).toHaveBeenCalledWith({
      where: { id: expenseId },
      update: {
        description: 'Compra de salsas',
        amount: 12000,
        category: 'insumos',
        date: expect.any(Date),
      },
      create: {
        id: expenseId,
        description: 'Compra de salsas',
        amount: 12000,
        category: 'insumos',
        date: expect.any(Date),
      },
    });
  });

  it('crea sin id si el cliente no envía uno', async () => {
    prismaMock.expense.create.mockResolvedValue({
      id: 'exp-2',
      description: 'Gasolina',
      amount: 30000,
      category: 'transporte',
      date: new Date(),
    });

    const res = response();
    const next = vi.fn();

    await expenseController.createExpense({
      body: {
        description: 'Gasolina',
        amount: 30000,
        category: 'transporte',
      },
    }, res, next);

    expect(prismaMock.expense.create).toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
  });
});
