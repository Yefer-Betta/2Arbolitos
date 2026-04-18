import { Router } from 'express';
import { closureController } from '../controllers/closureController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, closureController.getClosures);
router.post('/', authenticate, closureController.createClosure);
router.delete('/:id', authenticate, closureController.deleteClosure);

export default router;