import { Router } from 'express';
import { expenseController } from '../controllers/expenseController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { expenseSchema } from '../lib/validations.js';

const router = Router();

router.get('/expenses', authenticate, expenseController.getExpenses);
router.post('/expenses', authenticate, authorize('ADMIN', 'MANAGER'), validate(expenseSchema), expenseController.createExpense);
router.delete('/expenses/:id', authenticate, authorize('ADMIN', 'MANAGER'), expenseController.deleteExpense);

export default router;
