import { describe, expect, it } from 'vitest';
import {
  MoneyError,
  aggregateSalesByMethod,
  amountToCop,
  computeDiscount,
  computeOrderTotals,
  computeTip,
  copToBs,
  copToUsd,
  isPaidInFull,
  round2,
  roundCop,
  summarizePayments,
} from '../shared/money.js';

describe('conversión de moneda', () => {
  it('convierte un ítem isUsd con tasa 4000: USD 10 -> COP 40.000', () => {
    expect(amountToCop(10, 'USD', 4000)).toBe(40000);
  });

  it('convierte Bs. con su propia tasa', () => {
    expect(amountToCop(100, 'Bs.', 4000, 40)).toBe(4000);
  });

  it('redondea el COP a peso entero', () => {
    expect(roundCop(4000.4)).toBe(4000);
    expect(roundCop(4000.5)).toBe(4001);
  });

  it('convierte COP a USD/Bs. con 2 decimales', () => {
    expect(copToUsd(45000, 4000)).toBe(11.25);
    expect(copToBs(45000, 40)).toBe(1125);
  });
});

describe('totales de pedido', () => {
  it('mezcla ítems COP y USD en un pedido', () => {
    const totals = computeOrderTotals({
      items: [
        { quantity: 1, unitPrice: 20000, currency: 'COP' },
        { quantity: 2, unitPrice: 10, isUsd: true },
      ],
      exchangeRate: 4000,
      exchangeRateBs: 40,
    });

    expect(totals.subtotalCop).toBe(100000);
    expect(totals.totalCop).toBe(100000);
    expect(totals.totalUsd).toBe(25);
  });

  it('mantiene el unitPrice en la moneda del producto y el total de línea en COP', () => {
    const totals = computeOrderTotals({
      items: [{ quantity: 2, unitPrice: 10, isUsd: true }],
      exchangeRate: 4000,
    });

    expect(totals.lines[0].unitPrice).toBe(10);
    expect(totals.lines[0].lineTotalCop).toBe(80000);
  });

  it('suma el envío después del descuento', () => {
    const totals = computeOrderTotals({
      items: [{ quantity: 1, unitPrice: 50000, currency: 'COP' }],
      exchangeRate: 4000,
      discountValue: 5000,
      deliveryCost: 3000,
    });

    expect(totals.discountCop).toBe(5000);
    expect(totals.deliveryCostCop).toBe(3000);
    expect(totals.totalCop).toBe(48000);
  });
});

describe('descuentos', () => {
  it('aplica descuento por valor', () => {
    const discount = computeDiscount({ subtotalCop: 50000, discountValue: 5000 });
    expect(discount.discountCop).toBe(5000);
    expect(discount.totalCop).toBe(45000);
    expect(discount.discountPercent).toBe(10);
  });

  it('aplica descuento por porcentaje', () => {
    const discount = computeDiscount({ subtotalCop: 50000, discountPercent: 10 });
    expect(discount.discountCop).toBe(5000);
    expect(discount.totalCop).toBe(45000);
  });

  it('rechaza valor y porcentaje al mismo tiempo', () => {
    expect(() => computeDiscount({ subtotalCop: 50000, discountValue: 5000, discountPercent: 10 }))
      .toThrowError(MoneyError);
  });
});

describe('propina', () => {
  it('calcula la propina sobre el subtotal sin descuento', () => {
    const tip = computeTip({ subtotalCop: 50000, tipPercent: 10 });
    expect(tip.tipCop).toBe(5000);
  });

  it('calcula la propina sobre el subtotal ya descontado (sin envío)', () => {
    const discount = computeDiscount({ subtotalCop: 50000, discountPercent: 10 });
    const tip = computeTip({ subtotalCop: discount.totalCop, tipPercent: 10 });
    expect(tip.tipCop).toBe(4500);
  });

  it('rechaza propina por valor y porcentaje a la vez', () => {
    expect(() => computeTip({ subtotalCop: 50000, tipValue: 5000, tipPercent: 10 }))
      .toThrowError(MoneyError);
  });
});

describe('vuelto y pagos', () => {
  it('efectivo 50.000 sobre total 45.000: venta neta 45.000 y vuelto 5.000', () => {
    const summary = summarizePayments(
      [{ method: 'CASH_COP', currency: 'COP', amount: 50000 }],
      { totalCop: 45000, exchangeRate: 4000, exchangeRateBs: 40 }
    );

    expect(summary.grossCop).toBe(50000);
    expect(summary.paidCop).toBe(45000);
    expect(summary.changeCop).toBe(5000);
    expect(summary.payments[0].change).toBe(5000);
    expect(summary.isFullyPaid).toBe(true);
  });

  it('no cuenta el vuelto como venta en caja', () => {
    const sales = aggregateSalesByMethod([
      {
        payments: [{ method: 'CASH_COP', currency: 'COP', amount: 50000, change: 5000 }],
      },
    ]);

    expect(sales.cash_cop).toBe(45000);
  });

  it('pagos divididos que suman exacto no generan vuelto', () => {
    const summary = summarizePayments(
      [
        { method: 'CASH_COP', currency: 'COP', amount: 30000 },
        { method: 'CARD', currency: 'COP', amount: 15000 },
      ],
      { totalCop: 45000, exchangeRate: 4000 }
    );

    expect(summary.paidCop).toBe(45000);
    expect(summary.changeCop).toBe(0);
    expect(summary.remainingCop).toBe(0);
    expect(summary.isFullyPaid).toBe(true);
  });

  it('solo el efectivo absorbe el vuelto en pagos mixtos', () => {
    const summary = summarizePayments(
      [
        { method: 'CASH_COP', currency: 'COP', amount: 50000 },
        { method: 'CARD', currency: 'COP', amount: 20000 },
      ],
      { totalCop: 45000, exchangeRate: 4000 }
    );

    expect(summary.paidCop).toBe(45000);
    expect(summary.payments[0].change).toBe(25000);
    expect(summary.payments[1].change).toBe(0);
  });

  it('tolera 1 peso al comparar pagos con el total', () => {
    expect(isPaidInFull([{ method: 'CARD', amount: 44999 }], 45000)).toBe(true);
    expect(isPaidInFull([{ method: 'CARD', amount: 44998 }], 45000)).toBe(false);
  });

  it('marca sobrepago por encima de la tolerancia', () => {
    const ok = summarizePayments([{ method: 'CARD', amount: 45001 }], { totalCop: 45000 });
    const over = summarizePayments([{ method: 'CARD', amount: 45002 }], { totalCop: 45000 });

    expect(ok.isOverpaid).toBe(false);
    expect(over.isOverpaid).toBe(true);
  });
});

describe('multi-moneda y redondeo', () => {
  it('suma pagos en USD y Bs. con tasas distintas', () => {
    const summary = summarizePayments(
      [
        { method: 'CASH_USD', currency: 'USD', amount: 10 },
        { method: 'CASH_BS', currency: 'Bs.', amount: 1000 },
      ],
      { totalCop: 80000, exchangeRate: 4000, exchangeRateBs: 40 }
    );

    expect(summary.grossCop).toBe(80000);
    expect(summary.paidCop).toBe(80000);
    expect(summary.changeCop).toBe(0);
  });

  it('redondea 0,1 + 0,2 a 0,3 sin arrastrar flotantes', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });

  it('redondea tasas fraccionarias en COP', () => {
    expect(amountToCop(3, 'USD', 4123.75)).toBe(12371);
    expect(amountToCop(1, 'USD', 4000.5)).toBe(4001);
  });
});
