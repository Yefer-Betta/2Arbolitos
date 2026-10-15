// Agregación de ventas y tipos de pedido (compartido entre POS y Finanzas).

export const EMPTY_METHOD_TOTALS = {
  cash_cop: 0,
  cash_usd: 0,
  cash_bs: 0,
  nequi: 0,
  debit: 0,
};

/** Etiqueta legible para un `orderType`. */
export function getOrderTypeLabel(orderType) {
  if (orderType?.startsWith('mesa-')) return 'Mesa';
  if (orderType === 'para-llevar') return 'Para Llevar';
  if (orderType === 'domicilio') return 'Domicilio';
  return 'General';
}

/** Suma los pagos de una lista de órdenes agrupados por método. */
export function aggregateSalesByMethod(orders) {
  return orders.reduce((acc, order) => {
    const payments = order.payments?.length > 0 ? order.payments : (order.payment ? [order.payment] : []);
    for (const p of payments) {
      const method = (p.method || 'cash_cop').toLowerCase();
      const amount = p.amount || 0;
      if (method === 'cash_cop') acc.cash_cop += amount;
      else if (method === 'cash_usd') acc.cash_usd += amount;
      else if (method === 'cash_bs') acc.cash_bs += amount;
      else if (method === 'nequi') acc.nequi += amount;
      else acc.debit += amount;
    }
    return acc;
  }, { ...EMPTY_METHOD_TOTALS });
}
