import { Router } from 'express';
import { orderController } from '../controllers/index.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/orders', optionalAuth, orderController.getOrders);
router.get('/orders/active', optionalAuth, orderController.getActiveOrders);
router.get('/orders/kitchen', optionalAuth, orderController.getKitchenOrders);
router.get('/orders/:id', optionalAuth, orderController.getOrder);
router.post('/orders', optionalAuth, orderController.createOrder);
router.put('/orders/:id/status', optionalAuth, orderController.updateOrderStatus);
router.post('/orders/:id/payment', optionalAuth, orderController.addPayment);

export default router;
