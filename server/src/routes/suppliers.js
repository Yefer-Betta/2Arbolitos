import { Router } from 'express';
import { supplierController } from '../controllers/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/suppliers', authenticate, supplierController.listSuppliers);
router.post('/suppliers', authenticate, authorize('ADMIN', 'MANAGER'), supplierController.createSupplier);
router.put('/suppliers/:id', authenticate, authorize('ADMIN', 'MANAGER'), supplierController.updateSupplier);

router.get('/purchase-orders', authenticate, supplierController.listPurchaseOrders);
router.post('/purchase-orders', authenticate, authorize('ADMIN', 'MANAGER'), supplierController.createPurchaseOrder);
router.put('/purchase-orders/:id/status', authenticate, authorize('ADMIN'), supplierController.updatePurchaseOrderStatus);

export default router;
