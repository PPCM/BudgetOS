import { Router } from 'express';
import authRoutes from './auth.js';
import accountRoutes from './accounts.js';
import transactionRoutes from './transactions.js';
import creditCardRoutes from './creditCards.js';
import categoryRoutes from './categories.js';
import plannedTransactionRoutes from './plannedTransactions.js';
import importRoutes from './import.js';
import reportRoutes from './reports.js';
import ruleRoutes from './rules.js';
import { csrfTokenRoute } from '../middleware/csrf.js';

const router = Router();

// Route CSRF token
router.get('/csrf-token', csrfTokenRoute);

// Routes API
router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);
router.use('/credit-cards', creditCardRoutes);
router.use('/categories', categoryRoutes);
router.use('/planned-transactions', plannedTransactionRoutes);
router.use('/import', importRoutes);
router.use('/reports', reportRoutes);
router.use('/rules', ruleRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
