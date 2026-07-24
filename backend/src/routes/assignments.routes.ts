import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { assignmentsService, assignSchema } from '../services/assignments.service.js';

const router = Router();

/** GET /api/assignments — list DO ready to be assigned */
router.get('/', requireAuth, requireRole('admin', 'dispatcher'), async (_req, res, next) => {
  try {
    const data = await assignmentsService.getAssignableOrders();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** POST /api/assignments — assign driver + fleet to an order */
router.post('/', requireAuth, requireRole('admin', 'dispatcher'), async (req, res, next) => {
  try {
    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const result = await assignmentsService.assign(parsed.data);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
