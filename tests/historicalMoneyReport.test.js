import { describe, expect, it } from 'vitest';
import { analyzeHistoricalMoney } from '../server/src/lib/historicalMoneyReport.js';

function order({ id, date, totalCop, price, isUsd, quantity = 1, rate = 4000, payment, createdAt }) {
  return {
    id,
    createdAt: createdAt || date,
    date,
    exchangeRate: rate,
    totalCop,
    items: [
      {
        quantity,
        unitPrice: price,
        totalPrice: totalCop,
        product: { id: `${id}-p`, price, isUsd },
      },
    ],
    payments: payment ? [payment] : [],
  };
}

describe('informe histórico de dinero', () => {
  it('marca un pedido USD cuyo total quedó en dólares crudos', () => {
    const report = analyzeHistoricalMoney({
      orders: [order({ id: 'viejo', date: '2026-01-01T10:00:00Z', price: 10, isUsd: true, quantity: 2, totalCop: 20 })],
      closures: [],
    });

    expect(report.orders.withUsdItems).toBe(1);
    expect(report.orders.suspicious).toBe(1);
    expect(report.orders.examples[0].expectedCop).toBe(80000);
    expect(report.orders.examples[0].savedCop).toBe(20);
    expect(report.orders.examples[0].confidence).toBe('alta');
  });

  it('no marca un pedido USD ya convertido a COP', () => {
    const report = analyzeHistoricalMoney({
      orders: [order({ id: 'bueno', date: '2026-01-01T10:00:00Z', price: 10, isUsd: true, quantity: 2, totalCop: 80000 })],
      closures: [],
    });

    expect(report.orders.suspicious).toBe(0);
  });

  it('calcula el vuelto neto dentro del periodo de cada cierre', () => {
    const report = analyzeHistoricalMoney({
      orders: [
        order({
          id: 'o1',
          date: '2026-01-01T10:00:00Z',
          price: 45000,
          totalCop: 45000,
          payment: { method: 'CASH_COP', currency: 'COP', amount: 50000, change: 5000 },
        }),
      ],
      closures: [
        {
          id: 'c1',
          date: '2026-01-01T12:00:00Z',
          exchangeRate: 4000,
          salesByMethod: { cash_cop: 50000 },
        },
      ],
    });

    expect(report.cashPayments.withChange).toBe(1);
    expect(report.cashPayments.changeCop).toBe(5000);
    expect(report.closures.periods[0].cashGrossCop).toBe(50000);
    expect(report.closures.periods[0].cashNetCop).toBe(45000);
    expect(report.closures.periods[0].reportedVsNetCop).toBe(5000);
  });
});
