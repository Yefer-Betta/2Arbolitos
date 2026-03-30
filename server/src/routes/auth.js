import { Router } from 'express';
import { authController } from '../controllers/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.post('/login', authController.login);
router.post('/register', authenticate, authorize('ADMIN'), authController.register);
router.get('/verify', authenticate, authController.verifyToken);

router.get('/users', authenticate, authorize('ADMIN'), authController.getUsers);
router.put('/users/:id', authenticate, authorize('ADMIN'), authController.updateUser);
router.delete('/users/:id', authenticate, authorize('ADMIN'), authController.deleteUser);

export default router;
