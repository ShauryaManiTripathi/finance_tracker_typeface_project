import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import categoryRoutes from '../modules/categories/category.routes';
import transactionRoutes from '../modules/transactions/transaction.routes';
import statsRoutes from '../modules/stats/stats.routes';
import uploadRoutes from '../modules/uploads/upload.routes';
import agentRoutes from '../modules/agent/agent.routes';

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

// Transaction routes - implemented
router.use('/transactions', transactionRoutes);

// Stats routes - implemented
router.use('/stats', statsRoutes);

// AI Agent routes - implemented
router.use('/agent', agentRoutes);

// Upload routes (receipts & statements) - implemented
router.use('/uploads', uploadRoutes);

router.use('/imports', (req, res) => {
  res.status(501).json({ error: 'NotImplemented', message: 'Import routes not implemented yet' });
});

export default router;