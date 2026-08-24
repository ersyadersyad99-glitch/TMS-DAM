import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { assignmentsService, assignSchema } from '../services/assignments.service.js';

const router = Router();

/** GET /api/assignments — list DO ready to be assigned */
router.get('/', requireAuth, requirePermission('assignments.read'), async (req, res, next) => {
  try {
    const data = await assignmentsService.getAssignableOrders(req.db);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** POST /api/assignments — assign driver + fleet to an order */
router.post('/', requireAuth, requirePermission('assignments.create'), async (req, res, next) => {
  try {
    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }
    const result = await assignmentsService.assign(req.db, parsed.data);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
