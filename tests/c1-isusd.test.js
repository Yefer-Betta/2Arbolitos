import { describe, expect, it, vi, beforeEach } from 'vitest';

const prismaMock = {
  $transaction: vi.fn(async (callback) => callback(prismaMock)),
  product: { findMany: vi.fn() },
  modifier: { findMany: vi.fn() },
  productModifierGroup: { findMany: vi.fn() },
  order: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  payment: { create: vi.fn(), findMany: vi.fn() },
  inventoryItem: { findMany: vi.fn() },
  inventoryMovement: { create: vi.fn() },
  table: { findFirst: vi.fn(), findUnique: vi.fn() },
  tableState: { deleteMany: vi.fn() },
};

vi.mock('../server/src/config/database.js', () => ({ default: prismaMock }));

const { orderController } = await import('../server/src/controllers/orderController.js');

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.order.findUnique.mockResolvedValue(null);
});

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function makeReq(overrides = {}) {
  return {
    tableId: 'mesa-1',
    orderType: 'mesa',
    exchangeRate: 4000,
    exchangeRateBsSnapshot: 40,
    items: [
      {
        productId: 'prod-usd-1',
        quantity: 1,
        unitPrice: 10, // cliente viejo en caché envía USD crudo (10, no 40.000)
        modifiers: [],
      },
    ],
    ...overrides,
  };
}

describe('C1 extremo a extremo: producto isUsd se convierte a COP en el servidor', () => {
  it('guarda totalCop=40000 aunque el cliente envíe unitPrice=10 (USD crudo)', async () => {
    // El servidor lee el producto desde BD: isUsd=true, price=10 (USD)
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'prod-usd-1', name: 'Plato USD', price: 10, isUsd: true, active: true },
    ]);
    prismaMock.modifier.findMany.mockResolvedValue([]);
    prismaMock.productModifierGroup.findMany.mockResolvedValue([]);
    prismaMock.table.findFirst.mockResolvedValue({ id: 'table-1', number: 1 });
    prismaMock.table.findUnique.mockResolvedValue({ id: 'table-1' });
    prismaMock.inventoryItem.findMany.mockResolvedValue([]);

    const createdOrder = {
      id: 'order-1',
      tableId: 'table-1',
      userId: 'user-1',
      orderType: 'MESA',
      totalCop: 40000, // 10 USD * 4000 = 40.000 COP (servidor ignora unitPrice=10 del cliente)
      totalUsd: 10,
      exchangeRate: 4000,
      exchangeRateBs: 40,
      items: [
        {
          productId: 'prod-usd-1',
          quantity: 1,
          unitPrice: 10, // unitPrice guardado en USD (2 decimales)
          totalPrice: 40000, // totalPrice en COP
          currency: 'USD',
          isUsd: true,
          modifiers: [],
        },
      ],
      payments: [],
    };
    prismaMock.order.create.mockResolvedValue(createdOrder);
    prismaMock.payment.findMany.mockResolvedValue([]);

    const req = {
      user: { id: 'user-1', role: 'WAITER' },
      body: makeReq(),
    };
    const res = response();
    const next = vi.fn();

    await orderController.createOrder(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(res.body.totalCop).toBe(40000);
    expect(res.body.totalUsd).toBe(10);
    // El ítem guardado usa unitPrice del producto de BD (10 USD), no el unitPrice=10 del cliente interpretado como COP
    const item = res.body.items[0];
    expect(item.unitPrice).toBe(10); // USD
    expect(item.totalPrice).toBe(40000); // COP convertido
    expect(item.currency).toBe('USD');
    expect(item.isUsd).toBe(true);
  });

  it('total devuelto por la API coincide con el ticket (pricing.totalCop === totalCop)', async () => {
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'prod-usd-1', name: 'Plato USD', price: 10, isUsd: true, active: true },
    ]);
    prismaMock.modifier.findMany.mockResolvedValue([]);
    prismaMock.productModifierGroup.findMany.mockResolvedValue([]);
    prismaMock.table.findFirst.mockResolvedValue({ id: 'table-1', number: 1 });
    prismaMock.table.findUnique.mockResolvedValue({ id: 'table-1' });
    prismaMock.inventoryItem.findMany.mockResolvedValue([]);

    const createdOrder = {
      id: 'order-1',
      tableId: 'table-1',
      userId: 'user-1',
      orderType: 'MESA',
      totalCop: 40000,
      totalUsd: 10,
      exchangeRate: 4000,
      exchangeRateBs: 40,
      items: [
        {
          productId: 'prod-usd-1',
          quantity: 1,
          unitPrice: 10,
          totalPrice: 40000,
          currency: 'USD',
          isUsd: true,
          modifiers: [],
        },
      ],
      payments: [],
    };
    prismaMock.order.create.mockResolvedValue(createdOrder);
    prismaMock.payment.findMany.mockResolvedValue([]);

    const req = {
      user: { id: 'user-1', role: 'WAITER' },
      body: makeReq(),
    };
    const res = response();
    const next = vi.fn();

    await orderController.createOrder(req, res, next);

    expect(res.statusCode).toBe(201);
    // pricing es la única fuente de verdad para el ticket impreso
    expect(res.body.pricing.totalCop).toBe(40000);
    expect(res.body.pricing.totalCop).toBe(res.body.totalCop);
    expect(res.body.pricing.totalUsd).toBe(10);
    expect(res.body.changeCop).toBe(0);
  });
});
