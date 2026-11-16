import { Router } from 'express';
import { tableController } from '../controllers/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

const OPERATOR_ROLES = ['ADMIN', 'MANAGER', 'CASHIER', 'WAITER'];

// TableState routes - these MUST be before /tables/:id
router.get('/tables/state', authenticate, tableController.getTableStates);
router.get('/tables/state/:tableId', authenticate, tableController.getTableState);
router.put('/tables/state', authenticate, authorize(...OPERATOR_ROLES), tableController.updateTableState);
router.delete('/tables/state/:tableId', authenticate, authorize(...OPERATOR_ROLES), tableController.deleteTableState);

// General table routes
router.get('/tables', authenticate, tableController.getTables);
router.get('/tables/:id', authenticate, tableController.getTable);
router.post('/tables', authenticate, authorize('ADMIN', 'MANAGER'), tableController.createTable);
router.put('/tables/:id', authenticate, authorize('ADMIN', 'MANAGER', 'CASHIER'), tableController.updateTable);
router.delete('/tables/:id', authenticate, authorize('ADMIN', 'MANAGER'), tableController.deleteTable);

export default router;
