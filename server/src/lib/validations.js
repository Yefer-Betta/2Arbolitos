import { z } from 'zod';

/** Esquemas de validación para endpoints de escritura que carecían de ellos (A13). */

export const expenseSchema = z.object({
  description: z.string().min(1, 'Descripción requerida'),
  amount: z.coerce.number().positive('El monto debe ser positivo'),
  category: z.string().min(1, 'Categoría requerida'),
  date: z.string().optional(),
  id: z.string().optional(), // idempotency key opcional del cliente
});

export const closureSchema = z.object({
  id: z.string().optional(),
  orderCount: z.coerce.number().int().nonnegative().optional(),
  totalSalesCOP: z.coerce.number().nonnegative().optional(),
  totalSalesUSD: z.coerce.number().nonnegative().optional(),
  totalExpenses: z.coerce.number().nonnegative().optional(),
  exchangeRate: z.coerce.number().positive().optional(),
  countedCash: z.coerce.number().nonnegative().optional(),
  countedUsd: z.coerce.number().nonnegative().optional(),
  countedBs: z.coerce.number().nonnegative().optional(),
  countedNequi: z.coerce.number().nonnegative().optional(),
  countedDebit: z.coerce.number().nonnegative().optional(),
  differences: z.string().optional(),
  totalDifference: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export const customerSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().optional(),
});

export const reservationSchema = z.object({
  customerName: z.string().min(1, 'Nombre del cliente requerido'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  guests: z.coerce.number().int().positive().optional(),
  dateTime: z.string().datetime('Fecha/hora inválida'),
  tableId: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'DONE']).optional(),
});

export const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  quantity: z.coerce.number().int().nonnegative('Cantidad inválida'),
  unitCost: z.coerce.number().nonnegative('Costo unitario inválido').optional(),
  productId: z.string().optional(),
});

export const settingsSchema = z.object({
  key: z.string().min(1, 'Clave requerida'),
  value: z.string().min(1, 'Valor requerido'),
});
