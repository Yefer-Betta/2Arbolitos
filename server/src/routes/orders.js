import { Router } from 'express';
import { orderController } from '../controllers/index.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/orders', authenticate, optionalAuth, orderController.getOrders);
router.get('/orders/active', optionalAuth, orderController.getActiveOrders);
router.get('/orders/kitchen', optionalAuth, orderController.getKitchenOrders);
router.get('/orders/:id', optionalAuth, orderController.getOrder);
router.post('/orders', authenticate, optionalAuth, orderController.createOrder);
router.put('/orders/:id/status', authenticate, authorize('ADMIN', 'COOK', 'WAITER'), orderController.updateOrderStatus);
router.post('/orders/:id/payment', authenticate, orderController.addPayment);

export default router;
