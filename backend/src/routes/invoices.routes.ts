import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { invoicesService } from '../services/invoices.service.js';

const router = Router();

/** GET /api/invoices — list with optional filters */
router.get('/', requireAuth, requirePermission('invoices.read'), async (req, res, next) => {
  try {
    const { status, type, clientId, search } = req.query as Record<string, string>;
    const data = await invoicesService.list(req.db, { status, type, clientId, search });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/invoices/:id — invoice detail with order + POD files */
router.get('/:id', requireAuth, requirePermission('invoices.read'), async (req, res, next) => {
  try {
    const invoice = await invoicesService.getById(req.db, req.params.id as string);
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
  requirePermission('invoices.approve'),
  async (req, res, next) => {
    try {
      const invoice = await invoicesService.markPaid(req.db, req.params.id as string);
      res.json(invoice);
    } catch (err) {
      next(err);
    }
  },
);

/** POST /api/invoices — create or sync invoice */
router.post('/', requireAuth, requirePermission('invoices.create'), async (req, res, next) => {
  try {
    const invoice = await invoicesService.create(req.db, req.body);
    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
});

export default router;
