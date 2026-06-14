import prisma from '../config/database.js';
import { notifySSEClients } from '../sse.js';

export const orderController = {
  async getOrders(req, res) {
    try {
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
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
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
    } catch (error) {
      console.error('Error al obtener pedidos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getActiveOrders(req, res) {
    try {
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
    } catch (error) {
      console.error('Error al obtener pedidos activos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getOrder(req, res) {
    try {
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
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      res.json(order);
    } catch (error) {
      console.error('Error al obtener pedido:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async createOrder(req, res) {
    try {
      const { tableId, orderType, items, exchangeRate, exchangeRateBsSnapshot, discountValue, discountPercent, notes, payments, customerId, deliveryAddress, deliveryCost } = req.body;
      
      let userId = req.user?.id;
      if (!userId) {
        try {
          const defaultUser = await prisma.user.findFirst({ where: { role: 'WAITER' } });
          userId = defaultUser?.id;
        } catch (e) {
          console.log('No user found, using null');
          userId = null;
        }
      }

      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'El pedido debe tener al menos un producto' });
      }

      const rate = exchangeRate || 4000;
      const rateBs = exchangeRateBsSnapshot || 40;
      let totalCop = 0;
      let totalUsd = 0;

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

      const orderItems = [];
      for (const item of items) {
        const price = item.unitPrice || 0;
        const unitPrice = price;
        const totalPrice = unitPrice * item.quantity;

        totalCop += totalPrice;
        totalUsd += totalPrice / rate;

        let productId = item.productId;
        
        if (productId) {
          try {
            const existing = await prisma.product.findUnique({ where: { id: productId } });
            if (!existing) {
              let categoryId;
              const firstCategory = await prisma.category.findFirst({ where: { active: true } });
              if (firstCategory) {
                categoryId = firstCategory.id;
              } else {
                const newCat = await prisma.category.create({
                  data: { name: 'General', order: 0 },
                });
                categoryId = newCat.id;
              }
              const newProduct = await prisma.product.create({
                data: {
                  id: productId,
                  name: `Producto ${productId.slice(0, 8)}`,
                  categoryId,
                  price: unitPrice,
                  active: true,
                },
              });
              console.log('Auto-creado producto:', newProduct.id);
            }
          } catch (e) {
            console.log('Error al auto-crear producto:', e.message);
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

      const order = await prisma.order.create({
        data: {
          tableId: dbTableId,
          userId,
          customerId: customerId || null,
          orderType: orderType ? orderType.toUpperCase() : 'MESA',
          totalCop: finalTotalCop,
          totalUsd: finalTotalUsd,
          exchangeRate: exchangeRate || 4000,
          exchangeRateBs: rateBs,
          discountValue: discountValue || 0,
          discountPercent: discountPercent || 0,
          notes,
          deliveryAddress: deliveryAddress || null,
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
          const payment = await prisma.payment.create({
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
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'SERVED', completedAt: new Date() },
          });
          order.status = 'SERVED';
          order.completedAt = new Date();
        }
      }

      // Include payments in response
      order.payments = createdPayments || [];

      if (tableId) {
        try {
          await prisma.tableState.delete({ where: { tableId } });
        } catch (e) {
          // Ignorar si el estado no existe
        }
      }

      notifySSEClients('order:created', order);

      // Descontar inventario por cada ítem del pedido
      try {
        for (const item of order.items) {
          if (item.productId) {
            const invItems = await prisma.inventoryItem.findMany({
              where: { productId: item.productId },
            });
            for (const inv of invItems) {
              const newQty = Math.max(0, inv.quantity - item.quantity);
              await prisma.inventoryItem.update({
                where: { id: inv.id },
                data: { quantity: newQty },
              });
            }
          }
        }
      } catch (invErr) {
        console.error('Error al descontar inventario:', invErr);
      }

      res.status(201).json(order);
    } catch (error) {
      console.error('Error al crear pedido:', error);
      res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }
  },

  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['PENDING', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'];
      
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
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
    } catch (error) {
      console.error('Error al actualizar estado del pedido:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async addPayment(req, res) {
    try {
      const { id } = req.params;
      const paymentsData = req.body.payments || [req.body];

      const order = await prisma.order.findUnique({
        where: { id },
        select: { totalCop: true, exchangeRate: true, exchangeRateBs: true },
      });
      if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
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
    } catch (error) {
      console.error('Error al añadir pago:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getKitchenOrders(req, res) {
    try {
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
    } catch (error) {
      console.error('Error al obtener pedidos de cocina:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};
