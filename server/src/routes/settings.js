import { Router } from 'express';
import { settingsController } from '../controllers/index.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/settings', optionalAuth, settingsController.getSettings);
router.get('/settings/:key', optionalAuth, settingsController.getSetting);
router.post('/settings', authenticate, authorize('ADMIN', 'CASHIER'), settingsController.setSetting);
router.put('/settings', authenticate, authorize('ADMIN', 'CASHIER'), settingsController.setSettings);

router.get('/reports/finances', authenticate, optionalAuth, settingsController.getFinanceReport);

export default router;
