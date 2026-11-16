import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(),
    product: { findMany: vi.fn(), findUnique: vi.fn() },
    modifier: { findMany: vi.fn() },
    productModifierGroup: { findMany: vi.fn() },
    order: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    payment: { create: vi.fn() },
    inventoryItem: { findMany: vi.fn() },
    table: { findFirst: vi.fn(), findUnique: vi.fn() },
    tableState: { deleteMany: vi.fn() },
  },
}));

vi.mock('../server/src/config/database.js', () => ({ default: prismaMock }));

const { orderController } = await import('../server/src/controllers/orderController.js');
const { priceOrderItems, resolveOrderType } = await import('../server/src/lib/orderPricing.js');

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function request(body) {
  return {
    body,
    user: { id: 'user-1', role: 'CASHIER' },
    originalUrl: '/api/orders',
    headers: {},
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (fn) => fn(prismaMock));
  prismaMock.table.findFirst.mockResolvedValue(null);
  prismaMock.table.findUnique.mockResolvedValue(null);
  prismaMock.tableState.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.inventoryItem.findMany.mockResolvedValue([]);
  prismaMock.modifier.findMany.mockResolvedValue([]);
  prismaMock.productModifierGroup.findMany.mockResolvedValue([]);
  prismaMock.order.findUnique.mockResolvedValue(null);
  prismaMock.payment.create.mockImplementation(async ({ data }) => ({ id: `pay-${data.amount}`, ...data }));
  prismaMock.order.create.mockImplementation(async ({ data }) => {
    const { items, ...rest } = data;
    return {
      id: 'order-1',
      createdAt: new Date(),
      ...rest,
      items: (items?.create || []).map((item, index) => ({ id: `item-${index}`, ...item })),
      payments: [],
    };
  });
  prismaMock.order.update.mockImplementation(async ({ data }) => ({
    id: 'order-1',
    ...data,
    items: [],
    payments: [],
  }));
});

describe('precio del pedido en el servidor', () => {
  it('convierte un producto USD 10 x2 con tasa 4000 a 80.000 COP', () => {
    const totals = priceOrderItems({
      items: [{ productId: 'p-usd', quantity: 2, unitPrice: 1 }],
      productsById: new Map([['p-usd', { id: 'p-usd', price: 10, isUsd: true }]]),
      modifiersById: new Map(),
      allowedGroupsByProduct: new Map(),
      exchangeRate: 4000,
      exchangeRateBs: 40,
    });

    expect(totals.subtotalCop).toBe(80000);
    expect(totals.lines[0].unitPrice).toBe(10);
    expect(totals.lines[0].lineTotalCop).toBe(80000);
  });

  it('suma los modificadores validados en la moneda del producto', () => {
    const totals = priceOrderItems({
      items: [{ productId: 'p-usd', quantity: 1, modifiers: [{ id: 'm1' }] }],
      productsById: new Map([['p-usd', { id: 'p-usd', price: 10, isUsd: true }]]),
      modifiersById: new Map([['m1', { id: 'm1', groupId: 'g1', name: 'Queso', price: 2, active: true }]]),
      allowedGroupsByProduct: new Map([['p-usd', new Set(['g1'])]]),
      exchangeRate: 4000,
      exchangeRateBs: 40,
    });

    expect(totals.lines[0].unitPrice).toBe(12);
    expect(totals.lines[0].lineTotalCop).toBe(48000);
  });

  it('rechaza un modificador que no pertenece al producto', () => {
    expect(() => priceOrderItems({
      items: [{ productId: 'p1', quantity: 1, modifiers: [{ id: 'm1' }] }],
      productsById: new Map([['p1', { id: 'p1', price: 10000, isUsd: false }]]),
      modifiersById: new Map([['m1', { id: 'm1', groupId: 'g-otro', name: 'Extra', price: 500, active: true }]]),
      allowedGroupsByProduct: new Map([['p1', new Set(['g1'])]]),
      exchangeRate: 4000,
    })).toThrow();
  });

  it('normaliza el tipo de pedido que envía la PWA', () => {
    expect(resolveOrderType('mesa')).toBe('MESA');
    expect(resolveOrderType('para-llevar')).toBe('PARA_LLEVAR');
    expect(resolveOrderType('domicilio')).toBe('DOMICILIO');
  });
});

describe('createOrder usa la base de datos como autoridad', () => {
  it('acepta el orderType que envía la PWA (slug en minúscula)', async () => {
    const { createOrderSchema } = await import('../server/src/validations/order.js');
    const parsed = createOrderSchema.parse({
      orderType: 'para-llevar',
      items: [{ productId: 'p1', quantity: 1 }],
    });

    expect(parsed.orderType).toBe('PARA_LLEVAR');
  });
  it('ignora el unitPrice del cliente y responde los totales calculados', async () => {
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'p-usd', price: 10, isUsd: true, active: true },
    ]);

    const res = response();
    const next = vi.fn();

    await orderController.createOrder(request({
      tableId: 'mesa-1',
      orderType: 'mesa',
      clientOrderId: 'client-1',
      items: [{ productId: 'p-usd', quantity: 2, unitPrice: 1 }],
      exchangeRate: 4000,
      exchangeRateBsSnapshot: 40,
      payments: [{ method: 'CASH_COP', currency: 'COP', amount: 80000 }],
    }), res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    const data = prismaMock.order.create.mock.calls[0][0].data;
    expect(data.totalCop).toBe(80000);
    expect(data.items.create[0].unitPrice).toBe(10);
    expect(data.items.create[0].totalPrice).toBe(80000);
    expect(res.body.subtotalCop).toBe(80000);
    expect(res.body.totalCop).toBe(80000);
    expect(res.body.status).toBe('SERVED');
  });
});
