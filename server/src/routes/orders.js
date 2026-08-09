import { Router } from 'express';
import { orderController } from '../controllers/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createOrderSchema, addPaymentSchema } from '../validations/order.js';

const router = Router();

router.get('/orders', authenticate, orderController.getOrders);
router.get('/orders/active', authenticate, orderController.getActiveOrders);
router.get('/orders/kitchen', authenticate, orderController.getKitchenOrders);
router.get('/orders/:id', authenticate, orderController.getOrder);
router.post('/orders', authenticate, validate(createOrderSchema), orderController.createOrder);
router.put('/orders/:id/status', authenticate, authorize('ADMIN', 'MANAGER', 'WAITER'), orderController.updateOrderStatus);
router.post('/orders/:id/payment', authenticate, authorize('ADMIN', 'MANAGER', 'CASHIER'), validate(addPaymentSchema), orderController.addPayment);

export default router;
