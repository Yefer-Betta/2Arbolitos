import prisma from '../config/database.js';
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  async setAutoStart(req, res) {
    try {
      const { enabled } = req.body;

      await prisma.settings.upsert({
        where: { key: 'autoStart' },
        update: { value: String(enabled), type: 'boolean' },
        create: { key: 'autoStart', value: String(enabled), type: 'boolean' },
      });

      const platform = os.platform();
      try {
        if (enabled) {
          if (platform === 'win32') {
            execSync('npx pm2-startup install', { stdio: 'pipe', timeout: 30000 });
          } else {
            execSync('npx pm2 startup', { stdio: 'pipe', timeout: 30000 });
          }
        } else {
          if (platform === 'win32') {
            execSync('npx pm2-startup uninstall', { stdio: 'pipe', timeout: 30000 });
          } else {
            execSync('npx pm2 unstartup', { stdio: 'pipe', timeout: 30000 });
          }
        }
        res.json({ autoStart: enabled, message: enabled ? 'Auto-inicio activado' : 'Auto-inicio desactivado' });
      } catch (cmdError) {
        res.json({
          autoStart: enabled,
          warning: 'Configuración guardada, pero no se pudo configurar el auto-inicio del sistema. ' + cmdError.message,
        });
      }
    } catch (error) {
      console.error('Error al configurar auto-inicio:', error);
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

  async downloadBackup(req, res) {
    try {
      const backupsDir = path.resolve(__dirname, '..', '..', '..', 'backups');
      if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupsDir, `backup-${timestamp}.sql`);

      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) return res.status(500).json({ error: 'DATABASE_URL no configurada' });

      const match = dbUrl.match(/^mysql:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/);
      if (!match) return res.status(500).json({ error: 'DATABASE_URL formato inválido' });

      const [, user, password, host, port = '3306', database] = match;
      const dumpCmd = `mysqldump -u ${user} -p${password} -h ${host} -P ${port} ${database}`;

      execSync(`${dumpCmd} > "${backupFile}"`, { stdio: 'pipe', shell: true, timeout: 120000 });

      res.download(backupFile, `backup-2arbolitos-${timestamp}.sql`, (err) => {
        if (err) console.error('Error al enviar backup:', err.message);
        fs.unlink(backupFile, () => {});
      });
    } catch (error) {
      console.error('Error al generar backup:', error.message);
      res.status(500).json({ error: 'Error al generar backup: ' + error.message });
    }
  },
};
