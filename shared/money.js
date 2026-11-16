// Reglas monetarias de 2Arbolitos POS.
//
// Módulo ESM puro: lo importan el frontend (vía src/lib/money.js) y el backend
// (vía server/src/shared/money.js). No depende de React, Prisma ni del DOM.
//
// Reglas del negocio:
// - La moneda de operación es el COP y los totales en COP son enteros.
// - USD y Bs. se guardan/muestran con 2 decimales.
// - Un producto `isUsd` tiene su precio en USD; se convierte con la tasa del pedido.
// - El descuento se expresa por valor (COP) O por porcentaje, nunca ambos.
// - La propina se calcula sobre el subtotal ya descontado y no incluye el envío.
// - El efectivo neto de caja es `amount - change`; el vuelto solo aplica a efectivo.
// - Al comparar pagos con el total se tolera 1 peso por redondeo.

export const DEFAULT_EXCHANGE_RATE = 4000;
export const DEFAULT_EXCHANGE_RATE_BS = 40;
export const PAYMENT_TOLERANCE_COP = 1;

export class MoneyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'MoneyError';
    this.code = code;
    this.isOperational = true;
  }
}

/** Convierte cualquier entrada numérica en un número finito. */
export function toNumber(value, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Tasa válida o el valor por defecto (nunca 0/NaN). */
export function positiveRate(value, fallback) {
  const n = toNumber(value, 0);
  return n > 0 ? n : fallback;
}

/** Redondeo a peso entero (COP). */
export function roundCop(value) {
  const n = toNumber(value);
  return Math.round(n);
}

/** Redondeo a 2 decimales sin acumular flotantes (USD/Bs.). */
export function round2(value) {
  const n = toNumber(value);
  const sign = n < 0 ? -1 : 1;
  return (sign * Math.round((Math.abs(n) + Number.EPSILON) * 100)) / 100;
}

/** Normaliza la moneda a 'COP' | 'USD' | 'Bs.'. */
export function normalizeCurrency(currency) {
  const value = String(currency || 'COP').trim().toUpperCase();
  if (value === 'USD') return 'USD';
  if (value === 'BS' || value === 'BS.' || value === 'VES') return 'Bs.';
  return 'COP';
}

/** Redondeo según la moneda: COP entero, USD/Bs. 2 decimales. */
export function roundMoney(value, currency = 'COP') {
  return normalizeCurrency(currency) === 'COP' ? roundCop(value) : round2(value);
}

/** Moneda implícita del método de pago (el método manda sobre lo que envíe el cliente). */
export function currencyForMethod(method) {
  const value = String(method || '').trim().toUpperCase();
  if (value === 'CASH_USD') return 'USD';
  if (value === 'CASH_BS') return 'Bs.';
  return 'COP';
}

export function isCashMethod(method) {
  return String(method || '').trim().toUpperCase().startsWith('CASH_');
}

/** Clave de agrupación usada por caja/cierres (minúsculas). */
export function methodKey(method) {
  const value = String(method || '').trim().toUpperCase();
  if (value === 'CASH_USD') return 'cash_usd';
  if (value === 'CASH_BS') return 'cash_bs';
  if (value === 'CASH_COP') return 'cash_cop';
  if (value === 'NEQUI') return 'nequi';
  return 'debit';
}

export function usdToCop(usd, exchangeRate = DEFAULT_EXCHANGE_RATE) {
  return roundCop(toNumber(usd) * positiveRate(exchangeRate, DEFAULT_EXCHANGE_RATE));
}

export function bsToCop(bs, exchangeRateBs = DEFAULT_EXCHANGE_RATE_BS) {
  return roundCop(toNumber(bs) * positiveRate(exchangeRateBs, DEFAULT_EXCHANGE_RATE_BS));
}

export function copToUsd(cop, exchangeRate = DEFAULT_EXCHANGE_RATE) {
  return round2(toNumber(cop) / positiveRate(exchangeRate, DEFAULT_EXCHANGE_RATE));
}

export function copToBs(cop, exchangeRateBs = DEFAULT_EXCHANGE_RATE_BS) {
  return round2(toNumber(cop) / positiveRate(exchangeRateBs, DEFAULT_EXCHANGE_RATE_BS));
}

/** Convierte un monto en su moneda a COP (siempre entero). */
export function amountToCop(amount, currency = 'COP', exchangeRate = DEFAULT_EXCHANGE_RATE, exchangeRateBs = DEFAULT_EXCHANGE_RATE_BS) {
  const value = toNumber(amount);
  switch (normalizeCurrency(currency)) {
    case 'USD':
      return usdToCop(value, exchangeRate);
    case 'Bs.':
      return bsToCop(value, exchangeRateBs);
    default:
      return roundCop(value);
  }
}

/** Convierte un monto en COP a la moneda indicada. */
export function copToCurrency(cop, currency = 'COP', exchangeRate = DEFAULT_EXCHANGE_RATE, exchangeRateBs = DEFAULT_EXCHANGE_RATE_BS) {
  switch (normalizeCurrency(currency)) {
    case 'USD':
      return copToUsd(cop, exchangeRate);
    case 'Bs.':
      return copToBs(cop, exchangeRateBs);
    default:
      return roundCop(cop);
  }
}

/**
 * Resuelve un ajuste (descuento o propina) expresado por valor o porcentaje.
 * Si llegan ambos con valor > 0 se rechaza: una sola fuente de verdad.
 */
function resolveAdjustment({ baseCop, value, percent, kind, code }) {
  const base = Math.max(0, roundCop(baseCop));
  const rawValue = toNumber(value);
  const rawPercent = toNumber(percent);

  if (rawValue > 0 && rawPercent > 0) {
    throw new MoneyError(code, `El ${kind} debe ser por valor o por porcentaje, no ambos`);
  }
  if (rawPercent < 0 || rawPercent > 100) {
    throw new MoneyError(code, `El porcentaje de ${kind} debe estar entre 0 y 100`);
  }

  if (rawPercent > 0) {
    const appliedPercent = round2(rawPercent);
    const appliedCop = Math.min(base, roundCop((base * rawPercent) / 100));
    return { cop: appliedCop, percent: appliedPercent, mode: 'percent' };
  }

  if (rawValue > 0) {
    const appliedCop = Math.min(base, roundCop(rawValue));
    return {
      cop: appliedCop,
      percent: base > 0 ? round2((appliedCop / base) * 100) : 0,
      mode: 'value',
    };
  }

  return { cop: 0, percent: 0, mode: null };
}

/**
 * Descuento sobre el subtotal de ítems.
 * Devuelve el valor efectivo en COP y el porcentaje equivalente (para mostrar).
 */
export function computeDiscount({ subtotalCop, discountValue = 0, discountPercent = 0 }) {
  const adjusted = resolveAdjustment({
    baseCop: subtotalCop,
    value: discountValue,
    percent: discountPercent,
    kind: 'descuento',
    code: 'DISCOUNT_BOTH',
  });

  const subtotal = Math.max(0, roundCop(subtotalCop));
  return {
    subtotalCop: subtotal,
    discountCop: adjusted.cop,
    discountValue: adjusted.cop,
    discountPercent: adjusted.percent,
    discountMode: adjusted.mode,
    totalCop: subtotal - adjusted.cop,
  };
}

/**
 * Propina sobre el subtotal ya descontado (sin envío).
 * Se acepta por valor (COP) o por porcentaje, nunca ambos.
 */
export function computeTip({ subtotalCop, tipValue = 0, tipPercent = 0 }) {
  const adjusted = resolveAdjustment({
    baseCop: subtotalCop,
    value: tipValue,
    percent: tipPercent,
    kind: 'propina',
    code: 'TIP_BOTH',
  });

  return {
    tipCop: adjusted.cop,
    tipPercent: adjusted.percent,
    tipMode: adjusted.mode,
  };
}

/**
 * Totales de un pedido.
 *
 * `items[].unitPrice` ya incluye los modificadores y está en la moneda del
 * producto (`currency` o `isUsd`). `totalCop` es entero; `totalUsd`/`totalBs`
 * llevan 2 decimales.
 */
export function computeOrderTotals({
  items = [],
  exchangeRate,
  exchangeRateBs,
  discountValue = 0,
  discountPercent = 0,
  deliveryCost = 0,
  tipValue = 0,
  tipPercent = 0,
} = {}) {
  const rate = positiveRate(exchangeRate, DEFAULT_EXCHANGE_RATE);
  const rateBs = positiveRate(exchangeRateBs, DEFAULT_EXCHANGE_RATE_BS);

  const lines = (Array.isArray(items) ? items : []).map((item) => {
    const quantity = Math.max(0, Math.trunc(toNumber(item.quantity)));
    const currency = normalizeCurrency(item.currency || (item.isUsd ? 'USD' : 'COP'));
    const unitPrice = roundMoney(toNumber(item.unitPrice), currency);
    const lineTotalCop = roundCop(amountToCop(unitPrice, currency, rate, rateBs) * quantity);
    return { ...item, quantity, currency, unitPrice, lineTotalCop };
  });

  const subtotalCop = lines.reduce((sum, line) => sum + line.lineTotalCop, 0);
  const discount = computeDiscount({ subtotalCop, discountValue, discountPercent });
  const tip = computeTip({ subtotalCop: discount.totalCop, tipValue, tipPercent });
  const deliveryCostCop = Math.max(0, roundCop(deliveryCost));
  const totalCop = discount.totalCop + tip.tipCop + deliveryCostCop;

  return {
    lines,
    subtotalCop,
    discountCop: discount.discountCop,
    discountPercent: discount.discountPercent,
    discountMode: discount.discountMode,
    tipCop: tip.tipCop,
    tipPercent: tip.tipPercent,
    tipMode: tip.tipMode,
    deliveryCostCop,
    totalCop,
    totalUsd: copToUsd(totalCop, rate),
    totalBs: copToBs(totalCop, rateBs),
    exchangeRate: rate,
    exchangeRateBs: rateBs,
  };
}

/** COP bruto de un pago (sin descontar el vuelto). */
export function paymentGrossCop(payment, { exchangeRate, exchangeRateBs } = {}) {
  const method = payment?.method;
  const currency = normalizeCurrency(payment?.currency || currencyForMethod(method));
  return amountToCop(payment?.amount, currency, exchangeRate, exchangeRateBs);
}

/** COP neto de un pago: efectivo = amount - change; otros métodos = amount. */
export function paymentNetCop(payment, { exchangeRate, exchangeRateBs } = {}) {
  const method = payment?.method;
  const currency = normalizeCurrency(payment?.currency || currencyForMethod(method));
  const amount = toNumber(payment?.amount);
  const change = isCashMethod(method) ? Math.max(0, toNumber(payment?.change)) : 0;
  const gross = amountToCop(amount, currency, exchangeRate, exchangeRateBs);
  const changeCop = amountToCop(change, currency, exchangeRate, exchangeRateBs);
  return Math.max(0, gross - changeCop);
}

/**
 * Resume pagos para cobrar: calcula el vuelto por pago (solo efectivo),
 * el total neto aplicado y cuánto falta.
 */
export function summarizePayments(payments = [], {
  totalCop = 0,
  exchangeRate,
  exchangeRateBs,
  tolerance = PAYMENT_TOLERANCE_COP,
} = {}) {
  const rate = positiveRate(exchangeRate, DEFAULT_EXCHANGE_RATE);
  const rateBs = positiveRate(exchangeRateBs, DEFAULT_EXCHANGE_RATE_BS);
  const total = Math.max(0, roundCop(totalCop));

  const prepared = (Array.isArray(payments) ? payments : []).map((payment) => {
    const method = String(payment?.method || 'CASH_COP').trim().toUpperCase();
    const currency = normalizeCurrency(payment?.currency || currencyForMethod(method));
    const amount = roundMoney(toNumber(payment?.amount), currency);
    const grossCop = amountToCop(amount, currency, rate, rateBs);
    return {
      ...payment,
      method,
      currency,
      amount,
      change: 0,
      changeCop: 0,
      grossCop,
      netCop: grossCop,
      isCash: isCashMethod(method),
    };
  });

  const grossCop = prepared.reduce((sum, p) => sum + p.grossCop, 0);
  const changeCop = Math.max(0, grossCop - total);
  const cashPayments = prepared.filter((p) => p.isCash);
  const cashGrossCop = cashPayments.reduce((sum, p) => sum + p.grossCop, 0);

  if (changeCop > 0 && cashPayments.length > 0 && cashGrossCop > 0) {
    let remainingChange = changeCop;
    cashPayments.forEach((payment, index) => {
      const isLast = index === cashPayments.length - 1;
      const proportional = Math.round((changeCop * payment.grossCop) / cashGrossCop);
      const share = isLast
        ? Math.min(payment.grossCop, remainingChange)
        : Math.min(payment.grossCop, remainingChange, proportional);
      remainingChange -= share;
      payment.changeCop = share;
      payment.change = roundMoney(copToCurrency(share, payment.currency, rate, rateBs), payment.currency);
      payment.netCop = Math.max(0, payment.grossCop - share);
    });
  }

  const paidCop = prepared.reduce((sum, p) => sum + p.netCop, 0);
  const effectiveChangeCop = prepared.reduce((sum, p) => sum + p.changeCop, 0);

  return {
    payments: prepared.map((payment) => {
      const clean = { ...payment };
      delete clean.grossCop;
      delete clean.isCash;
      return clean;
    }),
    grossCop,
    paidCop,
    changeCop: effectiveChangeCop,
    remainingCop: Math.max(0, total - paidCop),
    isFullyPaid: paidCop + tolerance >= total,
    isOverpaid: paidCop > total + tolerance,
    totalCop: total,
  };
}

/** Suma neta de pagos en COP (tolera 1 peso en las comparaciones). */
export function sumPaymentsCop(payments = [], { exchangeRate, exchangeRateBs } = {}) {
  return (Array.isArray(payments) ? payments : []).reduce(
    (sum, payment) => sum + paymentNetCop(payment, { exchangeRate, exchangeRateBs }),
    0
  );
}

/** ¿Los pagos cubren el total? Tolerancia de 1 peso. */
export function isPaidInFull(payments, totalCop, { exchangeRate, exchangeRateBs, tolerance = PAYMENT_TOLERANCE_COP } = {}) {
  return sumPaymentsCop(payments, { exchangeRate, exchangeRateBs }) + tolerance >= roundCop(totalCop);
}

/**
 * Agrupa ventas por método usando el neto (efectivo sin vuelto).
 * Cada método se redondea en su propia moneda: COP entero, USD/Bs. 2 decimales.
 */
export function aggregateSalesByMethod(orders = []) {
  const totals = { cash_cop: 0, cash_usd: 0, cash_bs: 0, nequi: 0, debit: 0 };

  for (const order of Array.isArray(orders) ? orders : []) {
    const payments = order?.payments?.length > 0
      ? order.payments
      : (order?.payment ? [order.payment] : []);

    for (const payment of payments) {
      const key = methodKey(payment?.method);
      const currency = normalizeCurrency(payment?.currency || currencyForMethod(payment?.method));
      const amount = roundMoney(toNumber(payment?.amount), currency);
      const change = isCashMethod(payment?.method)
        ? Math.min(amount, Math.max(0, roundMoney(toNumber(payment?.change), currency)))
        : 0;
      const net = roundMoney(Math.max(0, amount - change), currency);
      totals[key] = roundMoney(totals[key] + net, currency);
    }
  }

  return totals;
}
