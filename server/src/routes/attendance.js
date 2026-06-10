import { Router } from 'express';
import { attendanceController } from '../controllers/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/attendance', authenticate, authorize('ADMIN', 'MANAGER'), attendanceController.list);
router.post('/attendance/check-in', authenticate, attendanceController.checkIn);
router.post('/attendance/check-out', authenticate, attendanceController.checkOut);
router.get('/attendance/today', authenticate, attendanceController.getTodayStatus);

export default router;
