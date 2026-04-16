import { Router } from 'express';
import { tableController } from '../controllers/index.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';

const router = Router();

// TableState routes - these MUST be before /tables/:id
router.get('/tables/state', optionalAuth, tableController.getTableStates);
router.get('/tables/state/:tableId', optionalAuth, tableController.getTableState);
router.put('/tables/state', optionalAuth, tableController.updateTableState);
router.delete('/tables/state/:tableId', optionalAuth, tableController.deleteTableState);

// General table routes
router.get('/tables', optionalAuth, tableController.getTables);
router.get('/tables/:id', optionalAuth, tableController.getTable);
router.post('/tables', authenticate, authorize('ADMIN'), tableController.createTable);
router.put('/tables/:id', authenticate, authorize('ADMIN', 'CASHIER'), tableController.updateTable);
router.delete('/tables/:id', authenticate, authorize('ADMIN'), tableController.deleteTable);

export default router;
