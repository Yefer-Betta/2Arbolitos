import { Router } from 'express';
import { settingsController } from '../controllers/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { settingsSchema } from '../lib/validations.js';

const router = Router();

router.get('/settings', authenticate, settingsController.getSettings);
router.get('/settings/:key', authenticate, settingsController.getSetting);
router.post('/settings', authenticate, authorize('ADMIN', 'CASHIER'), validate(settingsSchema), settingsController.setSetting);
router.put('/settings', authenticate, authorize('ADMIN', 'CASHIER'), settingsController.setSettings);

router.post('/settings/auto-start', authenticate, authorize('ADMIN'), settingsController.setAutoStart);

router.get('/reports/finances', authenticate, authorize('ADMIN', 'MANAGER'), settingsController.getFinanceReport);
router.post('/backup/download', authenticate, authorize('ADMIN'), settingsController.downloadBackup);

export default router;
