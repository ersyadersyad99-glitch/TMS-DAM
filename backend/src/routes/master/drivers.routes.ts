import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { driversService, driverSchema } from '../../services/master/drivers.service.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, search } = req.query as Record<string, string>;
    const data = await driversService.list({ status, search });
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const driver = await driversService.getById(req.params.id);
    if (!driver) { res.status(404).json({ error: 'Driver not found' }); return; }
    res.json(driver);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const parsed = driverSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const driver = await driversService.create(parsed.data);
    res.status(201).json(driver);
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const parsed = driverSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const driver = await driversService.update(req.params.id, parsed.data);
    res.json(driver);
  } catch (err) { next(err); }
});

router.patch('/:id/status', requireAuth, requireRole('admin', 'dispatcher'), async (req, res, next) => {
  try {
    const { status } = req.body as { status: string };
    const driver = await driversService.updateStatus(req.params.id, status);
    res.json(driver);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await driversService.delete(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
