import { z } from 'zod';

const paymentSchema = z.object({
  method: z.enum(['CASH_COP', 'CASH_USD', 'CASH_BS', 'NEQUI', 'CARD']),
  currency: z.enum(['COP', 'USD', 'Bs.']).optional().default('COP'),
  amount: z.number().positive(),
  change: z.number().min(0).optional().default(0),
  reference: z.string().optional(),
});

const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  notes: z.string().optional(),
  modifiers: z.any().optional(),
});

export const createOrderSchema = z.object({
  tableId: z.string().optional().nullable(),
  orderType: z.enum(['MESA', 'PARA_LLEVAR', 'DOMICILIO']).optional(),
  items: z.array(orderItemSchema).min(1, 'El pedido debe tener al menos un producto'),
  exchangeRate: z.number().positive().optional(),
  exchangeRateBsSnapshot: z.number().positive().optional(),
  discountValue: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  payments: z.array(paymentSchema).optional(),
  customerId: z.string().optional().nullable(),
  deliveryAddress: z.string().optional().nullable(),
  deliveryPhone: z.string().optional().nullable(),
  deliveryCost: z.number().min(0).optional(),
  clientOrderId: z.string().optional().nullable(),
});

export const addPaymentSchema = z.object({
  payments: z.array(paymentSchema).optional(),
  method: z.string().optional(),
  currency: z.enum(['COP', 'USD', 'Bs.']).optional(),
  amount: z.number().optional(),
  change: z.number().optional(),
  reference: z.string().optional(),
}).refine(data => data.payments || (data.method && data.amount), {
  message: 'Debe proporcionar payments[] o (method + amount)',
});
