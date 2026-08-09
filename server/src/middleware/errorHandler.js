export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, req, res, next) {
  if (err.statusCode >= 500 || !err.isOperational) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);
  }

  if (err.code === 'P2002') return res.status(409).json({ error: 'El registro ya existe' });
  if (err.code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado' });
  if (err.code === 'P2003') return res.status(400).json({ error: 'Referencia inválida' });

  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({ error: 'Datos inválidos para la base de datos' });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational
    ? err.message
    : (process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message);

  res.status(statusCode).json({ error: message });
}
