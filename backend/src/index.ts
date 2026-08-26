import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { toNodeHandler } from 'better-auth/node';

import { auth } from './auth/index.js';
import apiRoutes from './routes/index.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { tenantMiddleware } from './tenants/tenant.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';

// ─── CORS ─────────────────────────────────────────────────────────────────
// Build an explicit allowlist from environment variables.
// Separate multiple origins with a comma in CORS_ORIGINS.
// Example: CORS_ORIGINS=https://tms-staging.digitalinaja.net,https://dam.digitalinaja.net
const buildCorsAllowlist = (): string[] => {
  const list: string[] = [];

  // Primary: comma-separated list of allowed origins
  const corsOrigins = process.env.CORS_ORIGINS;
  if (corsOrigins) {
    corsOrigins.split(',').map(o => o.trim()).filter(Boolean).forEach(o => list.push(o));
  }

  // Secondary: single FRONTEND_URL (kept for backward compatibility)
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl && !list.includes(frontendUrl)) {
    list.push(frontendUrl);
  }

  // Development fallbacks — only added when NOT in production
  if (process.env.NODE_ENV !== 'production') {
    ['http://localhost:5173', 'http://127.0.0.1:5173'].forEach(o => {
      if (!list.includes(o)) list.push(o);
    });
  }

  return list;
};

const corsAllowlist = buildCorsAllowlist();
if (corsAllowlist.length === 0) {
  console.warn('[CORS] ⚠️  No allowed origins configured. All cross-origin requests will be blocked.');
}
console.log('[CORS] Allowed origins:', corsAllowlist.join(', ') || '(none)');

app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin / non-browser requests (e.g., curl, Postman, mobile)
    if (!origin) return callback(null, true);
    if (corsAllowlist.includes(origin)) return callback(null, true);

    // Allow all digitalinaja.net and vercel.app subdomains in production & staging
    if (origin.endsWith('.digitalinaja.net') || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Development fallbacks — allow local WiFi / LAN IPs (e.g., http://192.168.x.x:5173)
    if (process.env.NODE_ENV !== 'production') {
      const isLocalNetwork = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(origin);
      if (isLocalNetwork) return callback(null, true);
    }

    callback(new Error(`CORS: origin "${origin}" not allowed`));
  },
  credentials: true,               // required for Better Auth cookies
}));

// ─── Body parsers ─────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Serve uploaded files ──────────────────────────────────────────────────
const uploadsPath = path.join(__dirname, '..', UPLOAD_DIR);
app.use('/uploads', express.static(uploadsPath));
app.use('/uploads/pod', express.static(path.join(uploadsPath, 'pod')));
app.use('/uploads/receipts', express.static(path.join(uploadsPath, 'receipts')));

// Fallback file resolver across all upload subdirectories
import fs from 'fs';
app.get('/uploads/:file(*)', (req, res, next) => {
  const file = (req.params as any)['file(*)'] || (req.params as any).file;
  const decoded = decodeURIComponent(file || '');
  const possiblePaths = [
    path.join(uploadsPath, decoded),
    path.join(uploadsPath, 'pod', decoded),
    path.join(uploadsPath, 'receipts', decoded),
    path.join(uploadsPath, path.basename(decoded)),
    path.join(uploadsPath, 'pod', path.basename(decoded)),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) {
      return res.sendFile(p);
    }
  }
  next();
});

// ─── Better Auth handler (/api/auth/*) ────────────────────────────────────
// This handles: sign-in, sign-out, sign-up, get-session, etc.
app.all('/api/auth/*', toNodeHandler(auth));

// ─── Tenant Resolver ──────────────────────────────────────────────────────
// Must run before API routes so req.db is available in every handler
app.use('/api', tenantMiddleware);

// ─── Application API routes ───────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Global error handler ────────────────────────────────────────────────
app.use(errorMiddleware);

// ─── Start server ─────────────────────────────────────────────────────────
if (process.env.VERCEL !== '1') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ TMS Backend running on http://0.0.0.0:${PORT} (Access via local IP: ${PORT})`);
    console.log(`   Auth endpoints: /api/auth`);
    console.log(`   API endpoints:  /api`);
  });
}

export default app;
