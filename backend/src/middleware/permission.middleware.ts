import type { Request, Response, NextFunction } from 'express';
import { hasPermission } from '../config/rbac.config.js';

/**
 * Reusable Permission Middleware.
 * Validates that the authenticated user possesses the required permission string.
 *
 * Usage:
 *   router.get('/', requireAuth, requirePermission('orders.read'), handler)
 *   router.post('/', requireAuth, requirePermission('orders.create'), handler)
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized — login required' });
      return;
    }

    const userRole = req.user.role || 'viewer';

    if (!hasPermission(userRole, permission)) {
      res.status(403).json({
        error: `Forbidden — role '${userRole}' lacks permission '${permission}'`,
      });
      return;
    }

    next();
  };
}
