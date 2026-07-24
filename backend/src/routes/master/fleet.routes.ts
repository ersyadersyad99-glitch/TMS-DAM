import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { fleetService, fleetSchema } from '../../services/master/fleet.service.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, search } = req.query as Record<string, string>;
    const data = await fleetService.list({ status, search });
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const unit = await fleetService.getById(req.params.id);
    if (!unit) { res.status(404).json({ error: 'Fleet unit not found' }); return; }
    res.json(unit);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const parsed = fleetSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const unit = await fleetService.create(parsed.data);
    res.status(201).json(unit);
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const parsed = fleetSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const unit = await fleetService.update(req.params.id, parsed.data);
    res.json(unit);
  } catch (err) { next(err); }
});

router.patch('/:id/status', requireAuth, requireRole('admin', 'dispatcher'), async (req, res, next) => {
  try {
    const { status } = req.body as { status: string };
    const unit = await fleetService.updateStatus(req.params.id, status);
    res.json(unit);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await fleetService.delete(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
