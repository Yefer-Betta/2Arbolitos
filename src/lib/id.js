/** Genera un id único (crypto.randomUUID con fallback para contextos HTTP). */
export function genId() {
  try {
    return crypto.randomUUID();
  } catch {
    return Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }
}
