import { Router } from 'express';
import { reservationController } from '../controllers/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/reservations', authenticate, reservationController.list);
router.get('/reservations/:id', authenticate, reservationController.getById);
router.post('/reservations', authenticate, authorize('ADMIN', 'MANAGER'), reservationController.create);
router.put('/reservations/:id', authenticate, authorize('ADMIN', 'MANAGER'), reservationController.update);
router.delete('/reservations/:id', authenticate, authorize('ADMIN'), reservationController.delete);

export default router;
