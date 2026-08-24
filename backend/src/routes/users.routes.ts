import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { usersService, createUserSchema, updateUserSchema } from '../services/users.service.js';

const router = Router();

/** GET /api/users — list all users */
router.get('/', requireAuth, requirePermission('users.read'), async (req, res, next) => {
  try {
    const { role, search } = req.query as Record<string, string>;
    const data = await usersService.list({ role, search });
    res.json(data);
  } catch (err) { next(err); }
});

/** GET /api/users/:id */
router.get('/:id', requireAuth, requirePermission('users.read'), async (req, res, next) => {
  try {
    const user = await usersService.getById(req.params.id as string);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (err) { next(err); }
});

/** POST /api/users — create new user */
router.post('/', requireAuth, requirePermission('users.manage_users'), async (req, res, next) => {
  try {
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const user = await usersService.create(parsed.data);
    res.status(201).json(user);
  } catch (err) { next(err); }
});

/** PATCH /api/users/:id — update name/role/status */
router.patch('/:id', requireAuth, requirePermission('users.manage_users'), async (req, res, next) => {
  try {
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() }); return; }
    const user = await usersService.update(req.params.id as string, parsed.data);
    res.json(user);
  } catch (err) { next(err); }
});

/** PATCH /api/users/:id/toggle-status — activate or deactivate */
router.patch('/:id/toggle-status', requireAuth, requirePermission('users.manage_users'), async (req, res, next) => {
  try {
    // Prevent self-deactivation
    if (req.params.id === req.user!.id) {
      res.status(400).json({ error: 'Cannot change your own account status' });
      return;
    }
    const user = await usersService.toggleStatus(req.params.id as string);
    res.json(user);
  } catch (err) { next(err); }
});

/** DELETE /api/users/:id */
router.delete('/:id', requireAuth, requirePermission('users.manage_users'), async (req, res, next) => {
  try {
    if (req.params.id === req.user!.id) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }
    const result = await usersService.delete(req.params.id as string);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
