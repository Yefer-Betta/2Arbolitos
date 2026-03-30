import prisma from '../config/database.js';

export const settingsController = {
  async getSettings(req, res) {
    try {
      const settings = await prisma.settings.findMany();

      const settingsObject = settings.reduce((acc, setting) => {
        let value = setting.value;
        
        if (setting.type === 'number') {
          value = parseFloat(setting.value);
        } else if (setting.type === 'boolean') {
          value = setting.value === 'true';
        } else if (setting.type === 'object') {
          try {
            value = JSON.parse(setting.value);
          } catch (e) {
            // Keep as string if parse fails
          }
        }

        acc[setting.key] = value;
        return acc;
      }, {});

      res.json(settingsObject);
    } catch (error) {
      console.error('Error al obtener configuraciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getSetting(req, res) {
    try {
      const { key } = req.params;

      const setting = await prisma.settings.findUnique({
        where: { key },
      });

      if (!setting) {
        return res.status(404).json({ error: 'Configuración no encontrada' });
      }

      let value = setting.value;
      
      if (setting.type === 'number') {
        value = parseFloat(setting.value);
      } else if (setting.type === 'boolean') {
        value = setting.value === 'true';
      } else if (setting.type === 'object') {
        try {
          value = JSON.parse(setting.value);
        } catch (e) {
          // Keep as string
        }
      }

      res.json({ key: setting.key, value, type: setting.type });
    } catch (error) {
      console.error('Error al obtener configuración:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async setSetting(req, res) {
    try {
      const { key, value, type = 'string' } = req.body;

      if (!key || value === undefined) {
        return res.status(400).json({ error: 'Clave y valor requeridos' });
      }

      let stringValue = value;
      if (type === 'object') {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = String(value);
      }

      const setting = await prisma.settings.upsert({
        where: { key },
        update: {
          value: stringValue,
          type,
        },
        create: {
          key,
          value: stringValue,
          type,
        },
      });

      res.json({
        key: setting.key,
        value,
        type: setting.type,
      });
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async setSettings(req, res) {
    try {
      const settings = req.body;

      const results = await Promise.all(
        Object.entries(settings).map(async ([key, value]) => {
          const type = typeof value;
          let stringValue = value;
          
          if (type === 'object') {
            stringValue = JSON.stringify(value);
          } else {
            stringValue = String(value);
          }

          return prisma.settings.upsert({
            where: { key },
            update: {
              value: stringValue,
              type,
            },
            create: {
              key,
              value: stringValue,
              type,
            },
          });
        })
      );

      res.json({ message: 'Configuraciones guardadas', count: results.length });
    } catch (error) {
      console.error('Error al guardar configuraciones:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getFinanceReport(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const where = {
        status: 'SERVED',
      };

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
          payment: true,
          user: {
            select: { id: true, name: true },
          },
        },
      });

      const totalCop = orders.reduce((sum, order) => sum + order.totalCop, 0);
      const totalUsd = orders.reduce((sum, order) => sum + order.totalUsd, 0);
      const totalDiscount = orders.reduce((sum, order) => sum + order.discountValue, 0);
      const orderCount = orders.length;

      const paymentsByMethod = orders.reduce((acc, order) => {
        if (order.payment) {
          acc[order.payment.method] = (acc[order.payment.method] || 0) + order.payment.amount;
        }
        return acc;
      }, {});

      const averageTicket = orderCount > 0 ? totalCop / orderCount : 0;

      res.json({
        period: { startDate, endDate },
        totals: {
          orders: orderCount,
          cop: totalCop,
          usd: totalUsd,
          discount: totalDiscount,
          averageTicket,
        },
        payments: paymentsByMethod,
        orders: orders,
      });
    } catch (error) {
      console.error('Error al obtener reporte financiero:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};
