import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { clientsService, clientSchema } from '../../services/master/clients.service.js';

const router = Router();

router.get('/', requireAuth, requirePermission('clients.read'), async (req, res, next) => {
  try {
    const data = await clientsService.list(req.db, req.query.search as string);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, requirePermission('clients.read'), async (req, res, next) => {
  try {
    const client = await clientsService.getById(req.db, req.params.id as string);
    if (!client) { res.status(404).json({ error: 'Client not found' }); return; }
    res.json(client);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requirePermission('clients.create'), async (req, res, next) => {
  try {
    const parsed = clientSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const client = await clientsService.create(req.db, parsed.data);
    res.status(201).json(client);
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requirePermission('clients.update'), async (req, res, next) => {
  try {
    const parsed = clientSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const client = await clientsService.update(req.db, req.params.id as string, parsed.data);
    res.json(client);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requirePermission('clients.delete'), async (req, res, next) => {
  try {
    const result = await clientsService.delete(req.db, req.params.id as string);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
