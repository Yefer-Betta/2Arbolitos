import prisma from '../config/database.js';
import { notifySSEClients } from '../sse.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';

function parseLocalDate(value) {
  const parts = String(value).split('-').map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return new Date(value);
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
    const { tableId, orderType, items, exchangeRate, exchangeRateBsSnapshot, discountValue, discountPercent, notes, payments, customerId, deliveryAddress, deliveryPhone, deliveryCost, clientOrderId } = req.body;
    
    const userId = req.user?.id;

    if (!items || items.length === 0) {
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

    const rate = exchangeRate || 4000;
    const rateBs = exchangeRateBsSnapshot || 40;

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
      } catch (e) {
        dbTableId = null;
      }
    }

    // Wrap all DB writes in a single transaction
    const { order, createdPayments } = await prisma.$transaction(async (tx) => {
      let totalCop = 0;
      let totalUsd = 0;

      const orderItems = [];
      for (const item of items) {
        const price = item.unitPrice || 0;
        const unitPrice = price;
        const totalPrice = unitPrice * item.quantity;

        totalCop += totalPrice;
        totalUsd += totalPrice / rate;

        let productId = item.productId;
        
        if (productId) {
          const existing = await tx.product.findUnique({ where: { id: productId } });
          if (!existing) {
            throw new Error(`Producto con ID ${productId} no encontrado`);
          }
        }

        orderItems.push({
          productId: productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice,
          notes: item.notes,
          modifiers: item.modifiers || null,
        });
      }

      const discount = discountPercent > 0 ? discountPercent : 0;
      const finalTotalCop = discount > 0
        ? totalCop - (totalCop * discount / 100)
        : totalCop;
      const finalTotalUsd = discount > 0
        ? totalUsd - (totalUsd * discount / 100)
        : totalUsd;

      const order = await tx.order.create({
        data: {
          tableId: dbTableId,
          userId,
          customerId: customerId || null,
          orderType: orderType ? orderType.toUpperCase() : 'MESA',
          clientOrderId: clientOrderId || null,
          totalCop: finalTotalCop,
          totalUsd: finalTotalUsd,
          exchangeRate: exchangeRate || 4000,
          exchangeRateBs: rateBs,
          discountValue: discountValue || 0,
          discountPercent: discountPercent || 0,
          notes,
          deliveryAddress: deliveryAddress || null,
          deliveryPhone: deliveryPhone || null,
          deliveryCost: deliveryCost || 0,
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

      // Create payments if provided
      let createdPayments = [];
      if (payments && Array.isArray(payments) && payments.length > 0) {
        for (const p of payments) {
          const payment = await tx.payment.create({
            data: {
              orderId: order.id,
              method: p.method,
              currency: p.currency || 'COP',
              amount: p.amount,
              change: p.change || 0,
              reference: p.reference,
            },
          });
          createdPayments.push(payment);
        }

        const totalPaid = createdPayments.reduce((sum, p) => {
          if (p.currency === 'USD') return sum + p.amount * rate;
          if (p.currency === 'Bs.') return sum + p.amount * rateBs;
          return sum + p.amount; // COP
        }, 0);
        const shouldServe = totalPaid >= finalTotalCop;
        if (shouldServe) {
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'SERVED', completedAt: new Date() },
          });
          order.status = 'SERVED';
          order.completedAt = new Date();
        }
      }

      // Include payments in response
      order.payments = createdPayments || [];

      // Descontar inventario y crear movimientos
      for (const item of order.items) {
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

      return { order, createdPayments };
    });

    // Delete table state after transaction succeeds
    if (tableId) {
      try {
        await prisma.tableState.delete({ where: { tableId } });
      } catch (e) {
        // Ignorar si el estado no existe
      }
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
