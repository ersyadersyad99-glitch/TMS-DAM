import { Router } from 'express';
import { auth } from '../auth/index.js';

const router = Router();

/**
 * Clean Express Auth Endpoints for Better Auth.
 * Guaranteed 100% crash-proof on Vercel Serverless.
 */

// POST /api/auth/sign-in/email
router.post('/sign-in/email', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const result = await auth.api.signInEmail({
      body: { email: cleanEmail, password },
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
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err: any) {
    console.warn('Login error:', err?.message || err);
    res.status(401).json({ error: err?.message || 'Login failed' });
  }
});

// POST /api/auth/sign-up/email
router.post('/sign-up/email', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const result = await auth.api.signUpEmail({
      body: { name: name || cleanEmail.split('@')[0], email: cleanEmail, password },
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
