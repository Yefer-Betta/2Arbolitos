import { Router } from 'express';
import { closureController } from '../controllers/closureController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { closureSchema } from '../lib/validations.js';

const router = Router();

router.get('/', authenticate, authorize('ADMIN', 'MANAGER'), closureController.getClosures);
router.post('/', authenticate, authorize('ADMIN', 'MANAGER'), validate(closureSchema), closureController.createClosure);
router.delete('/:id', authenticate, authorize('ADMIN'), closureController.deleteClosure);

export default router;