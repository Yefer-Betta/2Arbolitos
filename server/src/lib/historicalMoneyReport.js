// Análisis de solo lectura de pedidos y cierres históricos.
//
// No modifica nada: solo detecta registros viejos que quedaron con reglas
// monetarias anteriores (precio USD crudo o vuelto sumado como venta).
// La lógica vive aquí, separada de Prisma, para poder probarla con fixtures.

const DEFAULT_RATE = 4000;

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function rateOf(order) {
  const rate = num(order?.exchangeRate);
  return rate > 0 ? rate : DEFAULT_RATE;
}

function orderItems(order) {
  return Array.isArray(order?.items) ? order.items : [];
}

function analyzeOrder(order) {
  const rate = rateOf(order);
  const items = orderItems(order);
  let expectedCop = 0;
  let rawUsdCop = 0;
  let usdItems = 0;

  for (const item of items) {
    const quantity = num(item.quantity);
    const product = item.product;
    const price = product ? num(product.price) : num(item.unitPrice);
    if (product?.isUsd) {
      usdItems += 1;
      expectedCop += price * quantity * rate;
      rawUsdCop += price * quantity;
    } else {
      expectedCop += price * quantity;
      rawUsdCop += price * quantity;
    }
  }

  const savedCop = num(order?.totalCop);
  const ratio = expectedCop > 0 ? savedCop / expectedCop : 1;
  const tolerance = Math.max(1, rawUsdCop * 0.05);
  const looksLikeRawUsd = usdItems > 0 && rawUsdCop > 0 && Math.abs(savedCop - rawUsdCop) <= tolerance;
  const looksTooLow = usdItems > 0 && expectedCop > 0 && savedCop < expectedCop * 0.9;
  const suspicious = looksLikeRawUsd || looksTooLow;

  return {
    id: order?.id,
    date: order?.createdAt || order?.date || null,
    orderType: order?.orderType,
    usdItems,
    expectedCop: Math.round(expectedCop),
    savedCop: Math.round(savedCop),
    differenceCop: Math.round(expectedCop - savedCop),
    ratio: Math.round(ratio * 1000) / 1000,
    confidence: looksLikeRawUsd ? 'alta' : (looksTooLow ? 'media' : null),
    suspicious,
  };
}

function cashPaymentsOf(order) {
  return (Array.isArray(order?.payments) ? order.payments : []).filter(
    (payment) => String(payment?.method || '').toUpperCase().startsWith('CASH_')
  );
}

function paymentGrossCop(payment, rate) {
  const currency = String(payment?.currency || 'COP').toUpperCase();
  const amount = num(payment?.amount);
  if (currency === 'USD') return amount * rate;
  if (currency === 'BS' || currency === 'BS.') return amount * 40; // tasa Bs. no queda en el cierre
  return amount;
}

function paymentChangeCop(payment, rate) {
  const currency = String(payment?.currency || 'COP').toUpperCase();
  const change = num(payment?.change);
  if (currency === 'USD') return change * rate;
  if (currency === 'BS' || currency === 'BS.') return change * 40;
  return change;
}

/**
 * @param {{ orders?: Array, closures?: Array }} data
 */
export function analyzeHistoricalMoney({ orders = [], closures = [] } = {}) {
  const orderList = Array.isArray(orders) ? orders : [];
  const closureList = [...(Array.isArray(closures) ? closures : [])]
    .filter((closure) => closure?.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const orderReports = orderList.map(analyzeOrder);
  const withUsd = orderReports.filter((report) => report.usdItems > 0);
  const suspicious = orderReports.filter((report) => report.suspicious);

  let cashCount = 0;
  let cashGrossCop = 0;
  let cashChangeCop = 0;

  for (const order of orderList) {
    const rate = rateOf(order);
    for (const payment of cashPaymentsOf(order)) {
      const change = num(payment.change);
      if (change <= 0) continue;
      cashCount += 1;
      cashGrossCop += paymentGrossCop(payment, rate);
      cashChangeCop += paymentChangeCop(payment, rate);
    }
  }

  // Cada cierre cubre el periodo entre el cierre anterior y su propia fecha.
  const byClosure = [];
  let periodStart = new Date(0);
  for (const closure of closureList) {
    const periodEnd = new Date(closure.date);
    let grossCop = 0;
    let changeCop = 0;
    let paymentsWithChange = 0;

    for (const order of orderList) {
      const createdAt = new Date(order?.createdAt || order?.date);
      if (Number.isNaN(createdAt.getTime())) continue;
      if (createdAt <= periodStart || createdAt > periodEnd) continue;

      const rate = rateOf(order);
      for (const payment of cashPaymentsOf(order)) {
        const change = num(payment.change);
        if (change <= 0) continue;
        paymentsWithChange += 1;
        grossCop += paymentGrossCop(payment, rate);
        changeCop += paymentChangeCop(payment, rate);
      }
    }

    const reported = closure.salesByMethod && typeof closure.salesByMethod === 'object'
      ? closure.salesByMethod
      : {};
    const reportedCashCop = num(reported.cash_cop);

    byClosure.push({
      closureId: closure.id,
      date: closure.date,
      paymentsWithChange,
      cashGrossCop: Math.round(grossCop),
      cashChangeCop: Math.round(changeCop),
      cashNetCop: Math.round(grossCop - changeCop),
      reportedCashCop: Math.round(reportedCashCop),
      reportedVsNetCop: Math.round(reportedCashCop - (grossCop - changeCop)),
    });

    periodStart = periodEnd;
  }

  return {
    generatedAt: new Date().toISOString(),
    orders: {
      total: orderReports.length,
      withUsdItems: withUsd.length,
      suspicious: suspicious.length,
      examples: suspicious
        .sort((a, b) => Math.abs(b.differenceCop) - Math.abs(a.differenceCop))
        .slice(0, 50),
    },
    cashPayments: {
      withChange: cashCount,
      grossCop: Math.round(cashGrossCop),
      changeCop: Math.round(cashChangeCop),
      netCop: Math.round(cashGrossCop - cashChangeCop),
    },
    closures: {
      total: closureList.length,
      periods: byClosure,
    },
  };
}

/** Criterio propuesto para separar registros viejos de nuevos. */
export function proposedCutover({ cutoffIso } = {}) {
  return {
    cutoffIso: cutoffIso || new Date().toISOString(),
    recommendation: [
      'No reescribir pedidos, pagos ni cierres existentes.',
      'Sellar los pedidos nuevos con pricingVersion = 2 (columna aditiva, default 1 para los históricos).',
      'Sellar los cierres nuevos con moneyRulesVersion = 2 (o dejar constancia de la fecha de corte en una tabla Settings).',
      'Usar la fecha de corte solo para reportes: los registros con pricingVersion = 1 quedan como están.',
    ],
  };
}
