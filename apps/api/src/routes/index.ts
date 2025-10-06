import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import categoryRoutes from '../modules/categories/category.routes';

const router = Router();

// Health check route (already in app.ts, but keeping for consistency)
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'personal-finance-api',
  });
});

// Auth routes - implemented
router.use('/auth', authRoutes);

// Category routes - implemented
router.use('/categories', categoryRoutes);

// Placeholder routes - will be implemented in subsequent steps
router.use('/transactions', (req, res) => {
  res.status(501).json({ error: 'NotImplemented', message: 'Transaction routes not implemented yet' });
});

router.use('/stats', (req, res) => {
  res.status(501).json({ error: 'NotImplemented', message: 'Stats routes not implemented yet' });
});

router.use('/uploads', (req, res) => {
  res.status(501).json({ error: 'NotImplemented', message: 'Upload routes not implemented yet' });
});

router.use('/imports', (req, res) => {
  res.status(501).json({ error: 'NotImplemented', message: 'Import routes not implemented yet' });
});

export default router;