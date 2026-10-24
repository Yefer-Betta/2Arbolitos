import { z } from 'zod';

export const validate = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issues = err.errors || err.issues || [];
      const errors = issues.map(e => ({ field: (e.path || []).join('.'), message: e.message }));
      return res.status(400).json({ error: 'Datos inválidos', details: errors });
    }
    next(err);
  }
};
