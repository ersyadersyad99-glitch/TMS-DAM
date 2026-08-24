import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { fleetService, fleetSchema } from '../../services/master/fleet.service.js';

const router = Router();

router.get('/', requireAuth, requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const { status, search } = req.query as Record<string, string>;
    const data = await fleetService.list(req.db, { status, search });
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, requirePermission('fleet.read'), async (req, res, next) => {
  try {
    const unit = await fleetService.getById(req.db, req.params.id as string);
    if (!unit) { res.status(404).json({ error: 'Fleet unit not found' }); return; }
    res.json(unit);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requirePermission('fleet.create'), async (req, res, next) => {
  try {
    const parsed = fleetSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const unit = await fleetService.create(req.db, parsed.data);
    res.status(201).json(unit);
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requirePermission('fleet.update'), async (req, res, next) => {
  try {
    const parsed = fleetSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const unit = await fleetService.update(req.db, req.params.id as string, parsed.data);
    res.json(unit);
  } catch (err) { next(err); }
});

router.patch('/:id/status', requireAuth, requirePermission('fleet.update'), async (req, res, next) => {
  try {
    const { status } = req.body as { status: string };
    const unit = await fleetService.updateStatus(req.db, req.params.id as string, status);
    res.json(unit);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requirePermission('fleet.delete'), async (req, res, next) => {
  try {
    const result = await fleetService.delete(req.db, req.params.id as string);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
