import { Router } from 'express';
import { expenseController } from '../controllers/expenseController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/expenses', authenticate, expenseController.getExpenses);
router.post('/expenses', authenticate, authorize('ADMIN', 'MANAGER'), expenseController.createExpense);
router.delete('/expenses/:id', authenticate, authorize('ADMIN', 'MANAGER'), expenseController.deleteExpense);

export default router;
