import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { driversService, driverSchema } from '../../services/master/drivers.service.js';

const router = Router();

router.get('/', requireAuth, requirePermission('drivers.read'), async (req, res, next) => {
  try {
    const { status, search } = req.query as Record<string, string>;
    const data = await driversService.list(req.db, { status, search });
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, requirePermission('drivers.read'), async (req, res, next) => {
  try {
    const driver = await driversService.getById(req.db, req.params.id as string);
    if (!driver) { res.status(404).json({ error: 'Driver not found' }); return; }
    res.json(driver);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requirePermission('drivers.create'), async (req, res, next) => {
  try {
    const parsed = driverSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const driver = await driversService.create(req.db, parsed.data);
    res.status(201).json(driver);
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requirePermission('drivers.update'), async (req, res, next) => {
  try {
    const parsed = driverSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const driver = await driversService.update(req.db, req.params.id as string, parsed.data);
    res.json(driver);
  } catch (err) { next(err); }
});

router.patch('/:id/status', requireAuth, requirePermission('drivers.update'), async (req, res, next) => {
  try {
    const { status } = req.body as { status: string };
    const driver = await driversService.updateStatus(req.db, req.params.id as string, status);
    res.json(driver);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requirePermission('drivers.delete'), async (req, res, next) => {
  try {
    const result = await driversService.delete(req.db, req.params.id as string);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
