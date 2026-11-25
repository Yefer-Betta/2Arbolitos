import { Router } from 'express';
import { reservationController } from '../controllers/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reservationSchema } from '../lib/validations.js';

const router = Router();

router.get('/reservations', authenticate, reservationController.list);
router.get('/reservations/:id', authenticate, reservationController.getById);
router.post('/reservations', authenticate, authorize('ADMIN', 'MANAGER'), validate(reservationSchema), reservationController.create);
router.put('/reservations/:id', authenticate, authorize('ADMIN', 'MANAGER'), validate(reservationSchema), reservationController.update);
router.delete('/reservations/:id', authenticate, authorize('ADMIN'), reservationController.delete);

export default router;
