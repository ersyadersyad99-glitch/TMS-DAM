import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { vendorsService } from '../../services/master/vendors.service.js';

const router = Router();

router.get('/', requireAuth, requirePermission('vendors.read'), async (req, res, next) => {
  try {
    const data = await vendorsService.list(req.db, req.query.search as string);
    res.json(data);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requirePermission('vendors.create'), async (req, res, next) => {
  try {
    const vendor = await vendorsService.create(req.db, req.body);
    res.status(201).json(vendor);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requirePermission('vendors.delete'), async (req, res, next) => {
  try {
    const result = await vendorsService.delete(req.db, req.params.id as string);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
