import { Router } from 'express';
import { auth } from '../auth/index.js';
import { db } from '../db/index.js';
import { users } from '../db/schema/auth.js';
import { ilike } from 'drizzle-orm';

const router = Router();

/**
 * Resolves a User Name / Username or Email input to the actual account email in PostgreSQL.
 */
async function resolveUsernameToEmail(identifier: string): Promise<string> {
  const clean = (identifier || '').trim();
  if (!clean) return '';
  if (clean.includes('@')) {
    return clean.toLowerCase();
  }

  try {
    const [found] = await db.select().from(users).where(ilike(users.name, clean)).limit(1);
    if (found && found.email) {
      return found.email.toLowerCase();
    }
  } catch (e) {
    console.warn('Username lookup DB warning:', e);
  }

  const normalized = clean.toLowerCase();
  if (normalized.includes('ersyad') && normalized.includes('dam')) return 'ersyad.dam@dam.id';
  if (normalized.includes('ersyad')) return 'ersyad.gercepin@gercepin.com';
  if (normalized.includes('admin') && normalized.includes('dam')) return 'admin@dam.id';
  if (normalized.includes('admin')) return 'admin@gercepin.com';
  if (normalized.includes('dispatcher')) return 'dispatcher@tms.id';
  if (normalized.includes('finance')) return 'finance@tms.id';
  if (normalized.includes('viewer')) return 'viewer@tms.id';

  return `${normalized}@tms.id`;
}

/**
 * Clean Express Auth Endpoints for Better Auth.
 * Supports Username or Email login.
 */

// POST /api/auth/sign-in/email
router.post('/sign-in/email', async (req, res) => {
  try {
    const { email, username, identifier, password } = req.body || {};
    const inputId = String(identifier || username || email || '').trim();

    if (!inputId || !password) {
      res.status(400).json({ error: 'Username/Email and password are required' });
      return;
    }

    const targetEmail = await resolveUsernameToEmail(inputId);

    const result = await auth.api.signInEmail({
      body: { email: targetEmail, password },
    });

    if (result && result.token) {
      // Set session cookie with Cross-Subdomain security attributes
      res.cookie('better-auth.session_token', result.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.json(result);
    } else {
      res.status(401).json({ error: 'Username atau password salah' });
    }
  } catch (err: any) {
    console.warn('Login error:', err?.message || err);
    res.status(401).json({ error: err?.message || 'Username atau password salah' });
  }
});

// POST /api/auth/sign-up/email
router.post('/sign-up/email', async (req, res) => {
  try {
    const { name, username, email, password } = req.body || {};
    const userNameInput = String(username || name || email || '').trim();
    if (!userNameInput || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const cleanEmail = email ? String(email).trim().toLowerCase() : `${userNameInput.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@tms.id`;

    const result = await auth.api.signUpEmail({
      body: { name: userNameInput, email: cleanEmail, password },
    });

    if (result && result.token) {
      res.cookie('better-auth.session_token', result.token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    res.status(201).json(result);
  } catch (err: any) {
    console.warn('Sign-up error:', err?.message || err);
    res.status(400).json({ error: err?.message || 'Registration failed' });
  }
});

// GET /api/auth/get-session
router.get('/get-session', async (req, res) => {
  try {
    const token = req.cookies?.['better-auth.session_token'] || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.json(null);
      return;
    }
    const session = await auth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${token}` }),
    });
    res.json(session ?? null);
  } catch (err) {
    res.json(null);
  }
});

// POST /api/auth/sign-out
router.post('/sign-out', async (_req, res) => {
  try {
    res.clearCookie('better-auth.session_token', {
      path: '/',
      sameSite: 'none',
      secure: true,
    });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: true });
  }
});

export default router;
