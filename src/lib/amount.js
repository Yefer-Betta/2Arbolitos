// Utilidades de entrada y formato de montos por moneda (COP, USD, Bs.).
import { amountToCop as moneyToCop } from './money.js';

/** Deja solo los dígitos (COP) o dígitos + un punto decimal (USD/Bs.). */
export function cleanAmount(value, currency) {
  if (currency === 'COP') return value.replace(/[^0-9]/g, '');
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) return parts[0] + '.' + parts.slice(1).join('');
  return cleaned;
}

/** Formatea un monto para mostrarlo en un input (miles con separador es-CO). */
export function formatAmount(raw, currency) {
  const cleaned = cleanAmount(String(raw), currency);
  if (!cleaned) return '';
  if (currency === 'USD' || currency === 'Bs.') {
    const parts = cleaned.split('.');
    const intPart = parseInt(parts[0], 10);
    if (isNaN(intPart)) return '';
    const formatted = intPart.toLocaleString('es-CO');
    if (parts.length > 1) return formatted + '.' + parts[1].slice(0, 2);
    return formatted;
  }
  const num = parseInt(cleaned, 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('es-CO');
}

/** Convierte el monto de un pago a COP según su método (USD/Bs. usan la tasa). */
export function amountToCop(amount, method, exchangeRate, exchangeRateBs) {
  const value = String(method || '').toLowerCase();
  const currency = value === 'cash_usd' ? 'USD' : value === 'cash_bs' ? 'Bs.' : 'COP';
  return moneyToCop(amount, currency, exchangeRate, exchangeRateBs);
}
