// Utilidades de entrada y formato de montos por moneda (COP, USD, Bs.).

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
  const amt = parseFloat(amount) || 0;
  if (method === 'cash_usd') return amt * (exchangeRate || 4000);
  if (method === 'cash_bs') return amt * (exchangeRateBs || 40);
  return amt;
}
