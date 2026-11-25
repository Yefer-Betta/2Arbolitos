import { Router } from 'express';
import { customerController } from '../controllers/index.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { customerSchema } from '../lib/validations.js';

const router = Router();

router.get('/customers', authenticate, customerController.list);
router.get('/customers/:id', authenticate, customerController.getById);
router.post('/customers', authenticate, validate(customerSchema), customerController.create);
router.put('/customers/:id', authenticate, validate(customerSchema), customerController.update);
router.get('/customers/:id/orders', authenticate, customerController.getOrders);

export default router;
