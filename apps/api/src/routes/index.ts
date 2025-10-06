import { Router } from 'express';

const router = Router();

// Health check route (already in app.ts, but keeping for consistency)
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'personal-finance-api',
  });
});

// Placeholder routes - will be implemented in subsequent steps
router.use('/auth', (req, res) => {
  res.status(501).json({ error: 'NotImplemented', message: 'Auth routes not implemented yet' });
});

router.use('/transactions', (req, res) => {
  res.status(501).json({ error: 'NotImplemented', message: 'Transaction routes not implemented yet' });
});

router.use('/categories', (req, res) => {
  res.status(501).json({ error: 'NotImplemented', message: 'Category routes not implemented yet' });
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