import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { travelFundsService, createTravelFundSchema, addItemSchema } from '../services/travel-funds.service.js';
import { upload } from '../lib/upload.js';

const router = Router();

/** GET /api/travel-funds — list with optional filters */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, orderId } = req.query as Record<string, string>;
    const data = await travelFundsService.list({ status, orderId });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/travel-funds/:id — detail with realization items */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const fund = await travelFundsService.getById(req.params.id);
    if (!fund) {
      res.status(404).json({ error: 'Travel fund not found' });
      return;
    }
    res.json(fund);
  } catch (err) {
    next(err);
  }
});

/** POST /api/travel-funds — create new travel fund request */
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'dispatcher'),
  async (req, res, next) => {
    try {
      const parsed = createTravelFundSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }
      const fund = await travelFundsService.create(parsed.data);
      res.status(201).json(fund);
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /api/travel-funds/:id/disburse — approve + disburse cash */
router.patch(
  '/:id/disburse',
  requireAuth,
  requireRole('admin', 'finance'),
  async (req, res, next) => {
    try {
      const fund = await travelFundsService.disburse(req.params.id);
      res.json(fund);
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/travel-funds/:id/items — add realization expense item */
router.post(
  '/:id/items',
  requireAuth,
  requireRole('admin', 'dispatcher'),
  upload.single('receipt'),
  async (req, res, next) => {
    try {
      const body = {
        ...req.body,
        amount:     Number(req.body.amount),
        hasReceipt: req.file != null,
        receiptFile: req.file?.filename,
      };
      const parsed = addItemSchema.safeParse(body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }
      const fund = await travelFundsService.addItem(req.params.id, parsed.data);
      res.status(201).json(fund);
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /api/travel-funds/:id/finalize — finalize realization */
router.patch(
  '/:id/finalize',
  requireAuth,
  requireRole('admin', 'finance'),
  async (req, res, next) => {
    try {
      const fund = await travelFundsService.finalize(req.params.id);
      res.json(fund);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
