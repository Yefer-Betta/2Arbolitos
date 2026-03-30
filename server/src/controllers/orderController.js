import prisma from '../config/database.js';

export const orderController = {
  async getOrders(req, res) {
    try {
      const { status, startDate, endDate, orderType } = req.query;

      const where = {};

      if (status) {
        where.status = status;
      }

      if (orderType) {
        where.orderType = orderType;
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
          items: {
            include: {
              product: true,
            },
          },
          payment: true,
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
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
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
          items: {
            include: {
              product: true,
            },
          },
          payment: true,
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
      const { tableId, orderType, items, exchangeRate, discountValue, discountPercent, notes, payment } = req.body;
      
      let userId = req.user?.id;
      if (!userId) {
        const defaultUser = await prisma.user.findFirst({ where: { role: 'WAITER' } });
        userId = defaultUser?.id;
      }

      if (!userId) {
        return res.status(400).json({ error: 'No hay usuario disponible' });
      }

      if (!items || items.length === 0) {
        return res.status(400).json({ error: 'El pedido debe tener al menos un producto' });
      }

      const rate = exchangeRate || 4000;
      let totalCop = 0;
      let totalUsd = 0;

      const orderItems = items.map(item => {
        const price = item.unitPrice || item.product?.price || 0;
        const isUsd = item.product?.isUsd || false;
        
        const unitPrice = isUsd ? price * rate : price;
        const totalPrice = unitPrice * item.quantity;

        if (isUsd) {
          totalUsd += item.quantity * price;
          totalCop += totalPrice;
        } else {
          totalCop += totalPrice;
          totalUsd += totalPrice / rate;
        }

        return {
          productId: item.productId || item.product?.id,
          quantity: item.quantity,
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.product.price,
          totalPrice,
          notes: item.notes,
        };
      });

      const finalTotalCop = discountValue > 0 
        ? totalCop - (totalCop * discountPercent / 100)
        : totalCop;

      const order = await prisma.order.create({
        data: {
          tableId,
          userId,
          orderType: orderType || 'MESA',
          totalCop: finalTotalCop,
          totalUsd,
          exchangeRate: exchangeRate || 4000,
          discountValue: discountValue || 0,
          discountPercent: discountPercent || 0,
          notes,
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

      res.status(201).json(order);
    } catch (error) {
      console.error('Error al crear pedido:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
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
        },
      });

      res.json(order);
    } catch (error) {
      console.error('Error al actualizar estado del pedido:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async addPayment(req, res) {
    try {
      const { id } = req.params;
      const { method, currency, amount, change, reference } = req.body;

      const payment = await prisma.payment.create({
        data: {
          orderId: id,
          method,
          currency,
          amount,
          change: change || 0,
          reference,
        },
      });

      await prisma.order.update({
        where: { id },
        data: { status: 'SERVED', completedAt: new Date() },
      });

      res.status(201).json(payment);
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
