import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { clientsService, clientSchema } from '../../services/master/clients.service.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const data = await clientsService.list(req.query.search as string);
    res.json(data);
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const client = await clientsService.getById(req.params.id);
    if (!client) { res.status(404).json({ error: 'Client not found' }); return; }
    res.json(client);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const parsed = clientSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const client = await clientsService.create(parsed.data);
    res.status(201).json(client);
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const parsed = clientSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const client = await clientsService.update(req.params.id, parsed.data);
    res.json(client);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const result = await clientsService.delete(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
