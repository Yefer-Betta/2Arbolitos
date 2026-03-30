import { Router } from 'express';
import { tableController } from '../controllers/index.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/tables', optionalAuth, tableController.getTables);
router.get('/tables/:id', optionalAuth, tableController.getTable);
router.post('/tables', authenticate, authorize('ADMIN'), tableController.createTable);
router.put('/tables/:id', authenticate, authorize('ADMIN', 'CASHIER'), tableController.updateTable);
router.delete('/tables/:id', authenticate, authorize('ADMIN'), tableController.deleteTable);

export default router;
