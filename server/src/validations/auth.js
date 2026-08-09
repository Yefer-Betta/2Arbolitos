import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Usuario debe tener al menos 3 caracteres'),
  password: z.string().min(6, 'Contraseña debe tener al menos 6 caracteres'),
  name: z.string().min(1, 'Nombre requerido'),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'COOK']).optional(),
});
