import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { invoicesService } from '../services/invoices.service.js';

const router = Router();

/** GET /api/invoices — list with optional filters */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, type, clientId, search } = req.query as Record<string, string>;
    const data = await invoicesService.list({ status, type, clientId, search });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/invoices/:id — invoice detail with order + POD files */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const invoice = await invoicesService.getById(req.params.id);
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.json(invoice);
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/invoices/:id/mark-paid — mark invoice as paid */
router.patch(
  '/:id/mark-paid',
  requireAuth,
  requireRole('admin', 'finance'),
  async (req, res, next) => {
    try {
      const invoice = await invoicesService.markPaid(req.params.id);
      res.json(invoice);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
