import { Router } from 'express';
import prisma from '../config/database.js';
import authRoutes from './auth.js';
import productRoutes from './products.js';
import orderRoutes from './orders.js';
import tableRoutes from './tables.js';
import settingsRoutes from './settings.js';
import expenseRoutes from './expenses.js';
import closureRoutes from './closures.js';
import inventoryRoutes from './inventory.js';
import permissionsRoutes from './permissions.js';
import auditRoutes from './audit.js';
import inventoryMovementRoutes from './inventoryMovements.js';
import customerRoutes from './customers.js';
import reservationRoutes from './reservations.js';
import modifierRoutes from './modifiers.js';
import supplierRoutes from './suppliers.js';
import attendanceRoutes from './attendance.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', productRoutes);
router.use('/', orderRoutes);
router.use('/', tableRoutes);
router.use('/', settingsRoutes);
router.use('/', expenseRoutes);
router.use('/closures', closureRoutes);
router.use('/', inventoryRoutes);
router.use('/', permissionsRoutes);
router.use('/', auditRoutes);
router.use('/', inventoryMovementRoutes);
router.use('/', customerRoutes);
router.use('/', reservationRoutes);
router.use('/', modifierRoutes);
router.use('/', supplierRoutes);
router.use('/', attendanceRoutes);

router.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'down', timestamp: new Date().toISOString() });
  }
});

export default router;
