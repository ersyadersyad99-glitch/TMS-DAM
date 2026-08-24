import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

/**
 * Global DB instance — connected to DATABASE_URL.
 * Used only by Better Auth (auth tables live in the shared/auth DB).
 * All application CRUD should use req.db (injected by tenantMiddleware).
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

/** Drizzle instance type — shared across global + per-tenant connections */
export type DB = typeof db;
