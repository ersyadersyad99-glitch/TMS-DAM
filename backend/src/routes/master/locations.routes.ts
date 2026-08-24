import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { locationsService, locationSchema } from '../../services/master/locations.service.js';

const router = Router();

/** GET /api/master/locations/provinces */
router.get('/provinces', requireAuth, requirePermission('locations.read'), async (req, res, next) => {
  try {
    const data = await locationsService.getProvinces(req.db);
    res.json(data);
  } catch (err) { next(err); }
});

/** GET /api/master/locations/cities?province=X */
router.get('/cities', requireAuth, requirePermission('locations.read'), async (req, res, next) => {
  try {
    const { province } = req.query as Record<string, string>;
    if (!province) { res.status(400).json({ error: 'province query parameter is required' }); return; }
    const data = await locationsService.getCities(req.db, province);
    res.json(data);
  } catch (err) { next(err); }
});

/** GET /api/master/locations/stores?city=X */
router.get('/stores', requireAuth, requirePermission('locations.read'), async (req, res, next) => {
  try {
    const { city } = req.query as Record<string, string>;
    if (!city) { res.status(400).json({ error: 'city query parameter is required' }); return; }
    const data = await locationsService.getStores(req.db, city);
    res.json(data);
  } catch (err) { next(err); }
});

/** POST /api/master/locations */
router.post('/', requireAuth, requirePermission('locations.create'), async (req, res, next) => {
  try {
    const parsed = locationSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const loc = await locationsService.create(req.db, parsed.data);
    res.status(201).json(loc);
  } catch (err) { next(err); }
});

/** DELETE /api/master/locations/:id */
router.delete('/:id', requireAuth, requirePermission('locations.delete'), async (req, res, next) => {
  try {
    const result = await locationsService.delete(req.db, req.params.id as string);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
