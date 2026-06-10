import { Router } from 'express';
import { modifierController } from '../controllers/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/modifier-groups', authenticate, modifierController.listGroups);
router.post('/modifier-groups', authenticate, authorize('ADMIN'), modifierController.createGroup);
router.put('/modifier-groups/:id', authenticate, authorize('ADMIN'), modifierController.updateGroup);
router.delete('/modifier-groups/:id', authenticate, authorize('ADMIN'), modifierController.deleteGroup);

router.post('/modifiers', authenticate, authorize('ADMIN'), modifierController.createModifier);
router.put('/modifiers/:id', authenticate, authorize('ADMIN'), modifierController.updateModifier);
router.delete('/modifiers/:id', authenticate, authorize('ADMIN'), modifierController.deleteModifier);

router.get('/products/:productId/modifier-groups', authenticate, modifierController.getProductGroups);
router.post('/products/modifier-groups', authenticate, authorize('ADMIN'), modifierController.setProductGroups);

export default router;
