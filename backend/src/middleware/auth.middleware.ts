import type { Request, Response, NextFunction } from 'express';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import { users } from '../db/schema/auth.js';
import { eq } from 'drizzle-orm';

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        role: string;
        status: string;
      };
    }
  }
}

/**
 * requireAuth — verifies the Better Auth session cookie.
 * Attaches `req.user` on success; responds 401 otherwise.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: req.headers as unknown as Headers,
    });

    if (!session?.user) {
      res.status(401).json({ error: 'Unauthorized — please sign in' });
      return;
    }

    // Fetch full user record (includes role + status)
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!dbUser || dbUser.status === 'inactive') {
      res.status(401).json({ error: 'Account is inactive or not found' });
      return;
    }

    req.user = {
      id:     dbUser.id,
      name:   dbUser.name,
      email:  dbUser.email,
      role:   dbUser.role,
      status: dbUser.status,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * requireRole — role-based access control.
 * Must be used AFTER requireAuth.
 *
 * @example
 *   router.post('/orders', requireAuth, requireRole('admin', 'dispatcher'), handler)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden — requires role: ${roles.join(' or ')}`,
      });
      return;
    }
    next();
  };
}
