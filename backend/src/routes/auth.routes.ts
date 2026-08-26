import { Router } from 'express';
import { auth } from '../auth/index.js';
import { fromNodeHeaders } from 'better-auth/node';

const router = Router();

/**
 * Native Express Auth Routes — clean, crash-proof implementation for Vercel Serverless.
 */

// POST /api/auth/sign-in/email
router.post('/sign-in/email', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const response = await auth.api.signInEmail({
      body: { email, password },
      asResponse: true,
      headers: fromNodeHeaders(req.headers),
    });

    response.headers.forEach((val, key) => {
      if (key.toLowerCase() !== 'content-length' && key.toLowerCase() !== 'content-type') {
        res.append(key, val);
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(401).json({ message: err.message || 'Invalid email or password' });
  }
});

// POST /api/auth/sign-up/email
router.post('/sign-up/email', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const response = await auth.api.signUpEmail({
      body: { name: name || email.split('@')[0], email, password },
      asResponse: true,
      headers: fromNodeHeaders(req.headers),
    });

    response.headers.forEach((val, key) => {
      if (key.toLowerCase() !== 'content-length' && key.toLowerCase() !== 'content-type') {
        res.append(key, val);
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Registration failed' });
  }
});

// GET /api/auth/get-session
router.get('/get-session', async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    res.json(session ?? null);
  } catch (err) {
    res.json(null);
  }
});

// POST /api/auth/sign-out
router.post('/sign-out', async (req, res, next) => {
  try {
    const response = await auth.api.signOut({
      asResponse: true,
      headers: fromNodeHeaders(req.headers),
    });

    response.headers.forEach((val, key) => {
      if (key.toLowerCase() !== 'content-length' && key.toLowerCase() !== 'content-type') {
        res.append(key, val);
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.json({ success: true });
  }
});

export default router;
