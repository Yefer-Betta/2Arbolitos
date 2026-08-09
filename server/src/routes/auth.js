import { Router } from 'express';
import { authController } from '../controllers/index.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validations/auth.js';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/register', authenticate, authorize('ADMIN'), validate(registerSchema), authController.register);
router.get('/verify', authenticate, authController.verifyToken);

router.get('/users', authenticate, authorize('ADMIN', 'MANAGER'), authController.getUsers);
router.put('/users/:id', authenticate, authorize('ADMIN'), authController.updateUser);
router.delete('/users/:id', authenticate, authorize('ADMIN'), authController.deleteUser);

export default router;
