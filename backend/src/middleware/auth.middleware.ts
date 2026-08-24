import type { Request, Response, NextFunction } from 'express';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import { users } from '../db/schema/auth.js';
import { eq } from 'drizzle-orm';
import type { DB } from '../db/index.js';

// Extend Express Request to carry the authenticated user, tenant context, and scoped DB
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
      /** Tenant identifier resolved by tenantMiddleware (e.g. "gercepin", "dam") */
      tenant?: string;
      /** Drizzle instance scoped to the current tenant's database */
      db: DB;
    }
  }
}

/**
 * requireAuth — verifies the Better Auth session cookie.
 * Attaches `req.user` on success; responds 401 otherwise.
 *
 * SECURITY NOTE:
 *   Auth bypass via NODE_ENV=development has been REMOVED.
 *   Every environment (dev, staging, production) requires a real session.
 *
 *   For local development, log in through the frontend UI at /login.
 *   Alternatively, set DEV_AUTH_BYPASS=true in .env ONLY for local dev,
 *   alongside DEV_AUTH_USER (email of an existing user in tms_db).
 *   DEV_AUTH_BYPASS must NEVER be set in staging or production environments.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // ── Explicit dev-only bypass (must be deliberately configured) ──────────
    // Requires BOTH DEV_AUTH_BYPASS=true AND DEV_AUTH_USER to be set.
    // This safeguard prevents accidental bypass in staging/production.
    if (
      process.env.DEV_AUTH_BYPASS === 'true' &&
      process.env.DEV_AUTH_USER
    ) {
      if (process.env.NODE_ENV === 'production') {
        // Hard block: bypass is forbidden in production regardless of env vars
        res.status(401).json({ error: 'Unauthorized — please sign in' });
        return;
      }

      // Resolve the configured dev user from the database
      const [devUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, process.env.DEV_AUTH_USER))
        .limit(1);

      if (devUser && devUser.status === 'active') {
        console.warn(
          `[DEV_AUTH_BYPASS] Authenticating as "${devUser.email}" (role: ${devUser.role}). ` +
          'Remove DEV_AUTH_BYPASS before deploying.',
        );
        req.user = {
          id:     devUser.id,
          name:   devUser.name,
          email:  devUser.email,
          role:   devUser.role,
          status: devUser.status,
        };
        return next();
      }

      // Dev user not found or inactive — fall through to real auth check
      console.warn(`[DEV_AUTH_BYPASS] User "${process.env.DEV_AUTH_USER}" not found or inactive. Falling back to session auth.`);
    }

    // ── Real session validation (all environments) ───────────────────────────
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
