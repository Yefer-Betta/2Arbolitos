import { Router } from 'express';
import { inventoryMovementController } from '../controllers/inventoryMovementController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/inventory-movements', authenticate, inventoryMovementController.getMovements);
router.post('/inventory-movements', authenticate, inventoryMovementController.createMovement);

export default router;
