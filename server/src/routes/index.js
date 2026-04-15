import { Router } from 'express';
import authRoutes from './auth.js';
import productRoutes from './products.js';
import orderRoutes from './orders.js';
import tableRoutes from './tables.js';
import settingsRoutes from './settings.js';
import expenseRoutes from './expenses.js';
import closureRoutes from './closures.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/', productRoutes);
router.use('/', orderRoutes);
router.use('/', tableRoutes);
router.use('/', settingsRoutes);
router.use('/', expenseRoutes);
router.use('/closures', closureRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
