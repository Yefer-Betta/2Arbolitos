import { Router } from 'express';
import { productController } from '../controllers/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/products', authenticate, productController.getProducts);
router.get('/products/cost-analysis', authenticate, productController.getCostAnalysis);
router.get('/products/:id', authenticate, productController.getProduct);
router.post('/products', authenticate, authorize('ADMIN', 'CASHIER'), productController.createProduct);
router.put('/products/:id', authenticate, authorize('ADMIN', 'CASHIER'), productController.updateProduct);
router.delete('/products/:id', authenticate, authorize('ADMIN'), productController.deleteProduct);

router.get('/categories', authenticate, productController.getCategories);
router.post('/categories', authenticate, authorize('ADMIN', 'CASHIER'), productController.createCategory);
router.put('/categories/:id', authenticate, authorize('ADMIN', 'CASHIER'), productController.updateCategory);
router.delete('/categories/:id', authenticate, authorize('ADMIN'), productController.deleteCategory);

export default router;
