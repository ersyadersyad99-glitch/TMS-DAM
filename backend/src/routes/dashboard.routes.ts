import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { dashboardService } from '../services/dashboard.service.js';

const router = Router();

/**
 * GET /api/dashboard/stats
 * Returns KPI cards: activeOrders, pendingReceivable, unpaidDP, travelFundOut, margin
 */
router.get('/stats', requireAuth, async (_req, res, next) => {
  try {
    const stats = await dashboardService.getStats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/pl-per-trip
 * Returns P&L breakdown per completed delivery order
 */
router.get('/pl-per-trip', requireAuth, async (_req, res, next) => {
  try {
    const data = await dashboardService.getPLPerTrip();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/dashboard/cashflow
 * Returns 7-day daily cash in/out summary
 */
router.get('/cashflow', requireAuth, async (_req, res, next) => {
  try {
    const data = await dashboardService.getCashflow();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
