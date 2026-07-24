import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware.js';
import { ordersService, createOrderSchema } from '../services/orders.service.js';
import { upload } from '../lib/upload.js';

const router = Router();

/** GET /api/orders — list with optional filters */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, clientId, search } = req.query as Record<string, string>;
    const data = await ordersService.list({ status, clientId, search });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/** GET /api/orders/:id — single order with drops and invoices */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const order = await ordersService.getById(req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
});

/** POST /api/orders — create new order + auto-generate DP invoice */
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'dispatcher'),
  async (req, res, next) => {
    try {
      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
        return;
      }
      const order = await ordersService.create(parsed.data, req.user!.id);
      res.status(201).json(order);
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /api/orders/:id/status — update order status */
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('admin', 'dispatcher'),
  async (req, res, next) => {
    try {
      const { status } = req.body as { status: string };
      if (!status) {
        res.status(400).json({ error: 'status is required' });
        return;
      }
      const order = await ordersService.updateStatus(req.params.id, status);
      res.json(order);
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /api/orders/:id/mark-dp-paid — mark DP as paid */
router.patch(
  '/:id/mark-dp-paid',
  requireAuth,
  requireRole('admin', 'finance'),
  async (req, res, next) => {
    try {
      await ordersService.markDPPaid(req.params.id);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /api/orders/:id/close — close order + create pelunasan invoice */
router.patch(
  '/:id/close',
  requireAuth,
  requireRole('admin', 'dispatcher'),
  async (req, res, next) => {
    try {
      const order = await ordersService.closeOrder(req.params.id);
      res.json(order);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/orders/:id/drops/:dropId/pod
 * Upload Proof of Delivery file for a drop point
 */
router.post(
  '/:id/drops/:dropId/pod',
  requireAuth,
  requireRole('admin', 'dispatcher'),
  upload.single('pod'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      await ordersService.uploadPOD(req.params.id, req.params.dropId, req.file.filename);
      res.json({ success: true, filename: req.file.filename });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
