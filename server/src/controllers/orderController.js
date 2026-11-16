import prisma from '../config/database.js';
import { notifySSEClients } from '../sse.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import {
  buildOrderPayments,
  priceOrderItems,
  resolveOrderType,
} from '../lib/orderPricing.js';

function parseLocalDate(value) {
  const parts = String(value).split('-').map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(value);
}

function collectModifierIds(items = []) {
  const ids = new Set();
  for (const item of items) {
    if (!Array.isArray(item?.modifiers)) continue;
    for (const modifier of item.modifiers) {
      const id = typeof modifier === 'string' ? modifier : modifier?.id;
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

function indexById(records = []) {
  return new Map(records.map((record) => [record.id, record]));
}

export const orderController = {
  getOrders: asyncHandler(async (req, res) => {
    const { status, startDate, endDate, orderType } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (orderType) {
      where.orderType = orderType.toUpperCase();
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = parseLocalDate(startDate);
      }
      if (endDate) {
        const end = parseLocalDate(endDate);
        end.setDate(end.getDate() + 1);
        where.createdAt.lt = end;
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        table: true,
        user: {
          select: { id: true, name: true, username: true },
        },
        customer: {
          select: { id: true, name: true, phone: true },
        },
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  }),

  getActiveOrders: asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ['PENDING', 'PREPARING', 'READY'],
        },
      },
      include: {
        table: true,
        user: {
          select: { id: true, name: true, username: true },
        },
        customer: {
          select: { id: true, name: true, phone: true },
        },
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    res.json(orders);
  }),

  getOrder: asyncHandler(async (req, res) => {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: true,
        user: {
          select: { id: true, name: true, username: true },
        },
        customer: {
          select: { id: true, name: true, phone: true },
        },
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    });

    if (!order) {
      throw new AppError('Pedido no encontrado', 404);
    }

    res.json(order);
  }),

  createOrder: asyncHandler(async (req, res) => {
    const {
      tableId,
      orderType,
      items,
      exchangeRate,
      exchangeRateBsSnapshot,
      discountValue,
      discountPercent,
      discountMode,
      notes,
      payments,
      customerId,
      deliveryAddress,
      deliveryPhone,
      deliveryCost,
      clientOrderId,
      tipValue,
      tipPercent,
    } = req.body;

    const userId = req.user?.id;

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('El pedido debe tener al menos un producto', 400);
    }

    const fullInclude = {
      table: true,
      user: {
        select: { id: true, name: true, username: true },
      },
      items: {
        include: {
          product: true,
        },
      },
      payments: true,
    };

    if (clientOrderId) {
      const existing = await prisma.order.findUnique({ where: { clientOrderId }, include: fullInclude });
      if (existing) {
        notifySSEClients('order:created', existing);
        return res.status(201).json(existing);
      }
    }

    // Validate tableId early
    let dbTableId = tableId;
    if (tableId && tableId.startsWith('mesa-')) {
      const tableNumber = parseInt(tableId.split('-')[1]);
      if (!isNaN(tableNumber)) {
        try {
          const table = await prisma.table.findFirst({ where: { number: tableNumber } });
          if (table) {
            dbTableId = table.id;
          } else {
            console.log('Table not found, using null:', tableNumber);
            dbTableId = null;
          }
        } catch (e) {
          console.log('Error finding table, using null:', e.message);
          dbTableId = null;
        }
      }
    } else if (tableId === 'para-llevar' || tableId === 'domicilio') {
      dbTableId = null;
    }

    if (dbTableId) {
      try {
        const tableExists = await prisma.table.findUnique({ where: { id: dbTableId } });
        if (!tableExists) {
          console.log(`Mesa con ID ${dbTableId} no encontrada en la BD, asignando null para evitar error de FK`);
          dbTableId = null;
        }
      } catch {
        dbTableId = null;
      }
    }

    let order;
    try {
      ({ order } = await prisma.$transaction(async (tx) => {
        const productIds = [...new Set(items.map((item) => item?.productId).filter(Boolean))];
        const modifierIds = collectModifierIds(items);

        const [products, modifiers, productGroups] = await Promise.all([
          productIds.length
            ? tx.product.findMany({ where: { id: { in: productIds } } })
            : Promise.resolve([]),
          modifierIds.length
            ? tx.modifier.findMany({ where: { id: { in: modifierIds } } })
            : Promise.resolve([]),
          productIds.length
            ? tx.productModifierGroup.findMany({ where: { productId: { in: productIds } } })
            : Promise.resolve([]),
        ]);

        const allowedGroupsByProduct = new Map();
        for (const group of productGroups) {
          if (!allowedGroupsByProduct.has(group.productId)) {
            allowedGroupsByProduct.set(group.productId, new Set());
          }
          allowedGroupsByProduct.get(group.productId).add(group.groupId);
        }

        // El servidor ignora unitPrice/totalPrice del cliente y recalcula todo.
        const totals = priceOrderItems({
          items,
          productsById: indexById(products),
          modifiersById: indexById(modifiers),
          allowedGroupsByProduct,
          exchangeRate,
          exchangeRateBs: exchangeRateBsSnapshot,
          discountValue,
          discountPercent,
          discountMode,
          deliveryCost,
          tipValue,
          tipPercent,
        });

        const orderItems = totals.lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          totalPrice: line.lineTotalCop,
          notes: line.notes,
          modifiers: line.modifiers.length > 0 ? line.modifiers : null,
        }));

        const createdOrder = await tx.order.create({
          data: {
            tableId: dbTableId,
            userId,
            customerId: customerId || null,
            orderType: resolveOrderType(orderType),
            clientOrderId: clientOrderId || null,
            totalCop: totals.totalCop,
            totalUsd: totals.totalUsd,
            exchangeRate: totals.exchangeRate,
            exchangeRateBs: totals.exchangeRateBs,
            discountValue: totals.discountCop,
            discountPercent: totals.discountMode === 'percent' ? totals.discountPercent : 0,
            notes,
            deliveryAddress: deliveryAddress || null,
            deliveryPhone: deliveryPhone || null,
            deliveryCost: totals.deliveryCostCop,
            items: {
              create: orderItems,
            },
          },
          include: {
            table: true,
            user: {
              select: { id: true, name: true, username: true },
            },
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        // Los pagos se normalizan aquí: el vuelto lo calcula el servidor.
        let createdPayments = [];
        let paymentSummary = null;
        if (Array.isArray(payments) && payments.length > 0) {
          paymentSummary = buildOrderPayments(payments, {
            totalCop: totals.totalCop,
            exchangeRate: totals.exchangeRate,
            exchangeRateBs: totals.exchangeRateBs,
          });

          for (const payment of paymentSummary.payments) {
            const created = await tx.payment.create({
              data: {
                orderId: createdOrder.id,
                method: payment.method,
                currency: payment.currency,
                amount: payment.amount,
                change: payment.change,
                reference: payment.reference,
              },
            });
            createdPayments.push(created);
          }

          if (paymentSummary.isFullyPaid) {
            await tx.order.update({
              where: { id: createdOrder.id },
              data: { status: 'SERVED', completedAt: new Date() },
            });
            createdOrder.status = 'SERVED';
            createdOrder.completedAt = new Date();
          }
        }

        createdOrder.payments = createdPayments;

        // Datos calculados para que el ticket y la PWA muestren lo mismo que se guardó.
        createdOrder.subtotalCop = totals.subtotalCop;
        createdOrder.totalBs = totals.totalBs;
        createdOrder.changeCop = paymentSummary?.changeCop || 0;
        createdOrder.pricing = {
          subtotalCop: totals.subtotalCop,
          discountCop: totals.discountCop,
          totalCop: totals.totalCop,
          totalUsd: totals.totalUsd,
          totalBs: totals.totalBs,
          exchangeRate: totals.exchangeRate,
          exchangeRateBs: totals.exchangeRateBs,
        };

        // Descontar inventario y crear movimientos
        for (const item of createdOrder.items) {
          if (item.productId) {
            const invItems = await tx.inventoryItem.findMany({
              where: { productId: item.productId },
            });
            for (const inv of invItems) {
              if (inv.quantity < item.quantity) {
                console.warn(`Stock insuficiente para "${inv.name}": disponible ${inv.quantity}, requerido ${item.quantity}`);
              }
              const deducted = Math.min(item.quantity, inv.quantity);
              const newQty = Math.max(0, inv.quantity - item.quantity);
              await tx.inventoryItem.update({
                where: { id: inv.id },
                data: { quantity: newQty },
              });
              await tx.inventoryMovement.create({
                data: {
                  itemId: inv.id,
                  quantity: -deducted,
                  previous: inv.quantity,
                  newQuantity: newQty,
                  reason: 'venta',
                  userId: userId,
                },
              });
            }
          }
        }

        return { order: createdOrder };
      }));
    } catch (error) {
      // Dos reintentos simultáneos con el mismo clientOrderId: devolver el
      // pedido ya creado en vez de un 500/409.
      if (error?.code === 'P2002' && clientOrderId) {
        const existing = await prisma.order.findUnique({ where: { clientOrderId }, include: fullInclude });
        if (existing) {
          notifySSEClients('order:created', existing);
          return res.status(201).json(existing);
        }
      }
      throw error;
    }

    // Delete table state after transaction succeeds
    if (tableId) {
      try {
        await prisma.tableState.deleteMany({ where: { tableId } });
      } catch {
        // Ignorar si el estado no existe
      }
      // Avisar a las demás pantallas de que la mesa quedó libre
      notifySSEClients('table:cleared', { tableId });
    }

    notifySSEClients('order:created', order);

    res.status(201).json(order);
  }),

  updateOrderStatus: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'];

    if (!validStatuses.includes(status)) {
      throw new AppError('Estado inválido', 400);
    }

    const current = await prisma.order.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!current) {
      throw new AppError('Pedido no encontrado', 404);
    }

    // La cocina solo avanza la preparación y puede cancelar lo que aún no salió.
    if (req.user?.role === 'COOK') {
      const cookTransitions = {
        PENDING: ['PREPARING', 'CANCELLED'],
        PREPARING: ['READY', 'CANCELLED'],
        READY: ['CANCELLED'],
      };
      const allowed = cookTransitions[current.status] || [];
      if (!allowed.includes(status)) {
        throw new AppError('La cocina no puede aplicar ese cambio de estado', 403);
      }
    }

    const data = { status };

    if (status === 'SERVED') {
      data.completedAt = new Date();
    }

    const order = await prisma.order.update({
      where: { id },
      data,
      include: {
        table: true,
        user: {
          select: { id: true, name: true, username: true },
        },
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
    });

    notifySSEClients('order:updated', order);
    res.json(order);
  }),

  addPayment: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const paymentsData = req.body.payments || [req.body];

    const order = await prisma.order.findUnique({
      where: { id },
      select: { totalCop: true, exchangeRate: true, exchangeRateBs: true },
    });
    if (!order) {
      throw new AppError('Pedido no encontrado', 404);
    }

    const createdPayments = [];
    for (const p of paymentsData) {
      const payment = await prisma.payment.create({
        data: {
          orderId: id,
          method: p.method,
          currency: p.currency || 'COP',
          amount: p.amount,
          change: p.change || 0,
          reference: p.reference,
        },
      });
      createdPayments.push(payment);
    }

    const allPayments = await prisma.payment.findMany({
      where: { orderId: id },
      select: { amount: true, currency: true },
    });
    const rate = order.exchangeRate || 4000;
    const rateBs = order.exchangeRateBs || 40;
    const totalPaid = allPayments.reduce((sum, p) => {
      if (p.currency === 'USD') return sum + p.amount * rate;
      if (p.currency === 'Bs.') return sum + p.amount * rateBs;
      return sum + p.amount; // COP
    }, 0);
    const shouldServe = totalPaid >= order.totalCop;

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: shouldServe ? { status: 'SERVED', completedAt: new Date() } : {},
      include: {
        table: true,
        user: { select: { id: true, name: true, username: true } },
        items: { include: { product: true } },
        payments: true,
      },
    });

    notifySSEClients('order:updated', updatedOrder);
    res.status(201).json({ payments: createdPayments, order: updatedOrder });
  }),

  getKitchenOrders: asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ['PENDING', 'PREPARING', 'READY'],
        },
      },
      include: {
        table: true,
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(orders);
  }),
};
