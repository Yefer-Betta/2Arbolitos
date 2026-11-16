import { AppError } from '../middleware/errorHandler.js';
import {
  DEFAULT_EXCHANGE_RATE,
  DEFAULT_EXCHANGE_RATE_BS,
  computeOrderTotals,
  positiveRate,
  roundCop,
  roundMoney,
  summarizePayments,
  toNumber,
} from '../shared/money.js';

const ORDER_TYPES = new Set(['MESA', 'PARA_LLEVAR', 'DOMICILIO']);
const PAYMENT_METHODS = new Set(['CASH_COP', 'CASH_USD', 'CASH_BS', 'NEQUI', 'CARD']);

/** Acepta 'mesa', 'MESA', 'para-llevar' o 'PARA_LLEVAR'. */
export function resolveOrderType(value) {
  const normalized = String(value || 'MESA').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!ORDER_TYPES.has(normalized)) {
    throw new AppError('Tipo de pedido inválido', 400);
  }
  return normalized;
}

function modifierIdsOf(item) {
  if (!Array.isArray(item?.modifiers)) return [];
  return item.modifiers
    .map((modifier) => (typeof modifier === 'string' ? modifier : modifier?.id))
    .filter(Boolean);
}

/**
 * Precios calculados con datos de la base: el cliente solo aporta productos,
 * cantidades y modificadores. `unitPrice` del cliente se ignora.
 */
export function priceOrderItems({
  items = [],
  productsById = new Map(),
  modifiersById = new Map(),
  allowedGroupsByProduct = new Map(),
  exchangeRate,
  exchangeRateBs,
  discountValue = 0,
  discountPercent = 0,
  discountMode = null,
  deliveryCost = 0,
  tipValue = 0,
  tipPercent = 0,
} = {}) {
  const rate = positiveRate(exchangeRate, DEFAULT_EXCHANGE_RATE);
  const rateBs = positiveRate(exchangeRateBs, DEFAULT_EXCHANGE_RATE_BS);

  const pricedItems = (Array.isArray(items) ? items : []).map((item) => {
    const product = productsById.get(item?.productId);
    if (!product) {
      throw new AppError(`Producto con ID ${item?.productId || '(vacío)'} no encontrado`, 400);
    }
    if (product.active === false) {
      throw new AppError(`El producto "${product.name || product.id}" está inactivo`, 400);
    }

    const quantity = Math.trunc(toNumber(item?.quantity));
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError('La cantidad de cada producto debe ser un entero positivo', 400);
    }

    const currency = product.isUsd ? 'USD' : 'COP';
    const allowedGroups = allowedGroupsByProduct.get(product.id) || new Set();
    const ids = [...new Set(modifierIdsOf(item))];
    let extraPrice = 0;

    const modifiers = ids.map((id) => {
      const modifier = modifiersById.get(id);
      if (!modifier || modifier.active === false) {
        throw new AppError('Modificador inválido o inactivo', 400);
      }
      if (!allowedGroups.has(modifier.groupId)) {
        throw new AppError('El modificador no pertenece al producto', 400);
      }
      const price = roundMoney(modifier.price, currency);
      extraPrice += price;
      return { id: modifier.id, name: modifier.name, price };
    });

    return {
      productId: product.id,
      quantity,
      unitPrice: roundMoney(toNumber(product.price) + extraPrice, currency),
      currency,
      isUsd: Boolean(product.isUsd),
      notes: item?.notes || null,
      modifiers,
    };
  });

  // Primero el subtotal sin descuento: permite validar el descuento legado.
  const base = computeOrderTotals({
    items: pricedItems,
    exchangeRate: rate,
    exchangeRateBs: rateBs,
  });

  const discount = normalizeDiscount({
    subtotalCop: base.subtotalCop,
    discountValue,
    discountPercent,
    discountMode,
  });

  return computeOrderTotals({
    items: pricedItems,
    exchangeRate: rate,
    exchangeRateBs: rateBs,
    discountValue: discount.discountValue,
    discountPercent: discount.discountPercent,
    deliveryCost,
    tipValue,
    tipPercent,
  });
}

/**
 * Compatibilidad con PWAs en caché: la versión anterior enviaba el valor y el
 * porcentaje equivalente a la vez. Si coinciden (tolerancia de 1 peso) se
 * interpreta como porcentaje; si se contradicen, se rechaza.
 */
export function normalizeDiscount({ subtotalCop, discountValue = 0, discountPercent = 0, discountMode = null } = {}) {
  if (discountMode === 'value') {
    return { discountValue, discountPercent: 0 };
  }
  if (discountMode === 'percent') {
    return { discountValue: 0, discountPercent };
  }

  const value = toNumber(discountValue);
  const percent = toNumber(discountPercent);

  if (value > 0 && percent > 0) {
    const expected = roundCop((toNumber(subtotalCop) * percent) / 100);
    if (Math.abs(expected - roundCop(value)) <= 1) {
      return { discountValue: 0, discountPercent: percent };
    }
    throw new AppError('El descuento debe ser por valor o por porcentaje, no ambos', 400);
  }

  return { discountValue: value, discountPercent: percent };
}

/**
 * Normaliza y valida los pagos. El servidor recalcula el vuelto y se niega a
 * aceptar un cobro por encima del total (tolerancia de 1 peso).
 */
export function buildOrderPayments(payments = [], {
  totalCop = 0,
  exchangeRate,
  exchangeRateBs,
} = {}) {
  const list = Array.isArray(payments) ? payments : [];
  for (const payment of list) {
    const method = String(payment?.method || '').trim().toUpperCase();
    if (!PAYMENT_METHODS.has(method)) {
      throw new AppError('Método de pago inválido', 400);
    }
    if (toNumber(payment?.amount) <= 0) {
      throw new AppError('El monto de cada pago debe ser positivo', 400);
    }
  }

  const summary = summarizePayments(list, { totalCop, exchangeRate, exchangeRateBs });
  if (summary.isOverpaid) {
    throw new AppError('Los pagos superan el total del pedido', 400);
  }
  return summary;
}
