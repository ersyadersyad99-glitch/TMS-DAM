import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { toNodeHandler } from 'better-auth/node';

import { auth } from './auth/index.js';
import apiRoutes from './routes/index.js';
import { errorMiddleware } from './middleware/error.middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT ?? 3001);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';

// ─── CORS ─────────────────────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,               // required for Better Auth cookies
}));

// ─── Body parsers ─────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Serve uploaded files ──────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', UPLOAD_DIR)));

// ─── Better Auth handler (/api/auth/*) ────────────────────────────────────
// This handles: sign-in, sign-out, sign-up, get-session, etc.
app.all('/api/auth/*', toNodeHandler(auth));

// ─── Application API routes ───────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Global error handler ────────────────────────────────────────────────
app.use(errorMiddleware);

// ─── Start server ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ TMS Backend running on http://localhost:${PORT}`);
  console.log(`   Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`   API endpoints:  http://localhost:${PORT}/api`);
});
