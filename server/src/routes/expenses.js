import { Router } from 'express';
import { expenseController } from '../controllers/expenseController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/expenses', expenseController.getExpenses);
router.post('/expenses', authenticate, expenseController.createExpense);
router.delete('/expenses/:id', authenticate, expenseController.deleteExpense);

export default router;
