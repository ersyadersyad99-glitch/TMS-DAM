import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

const { Pool } = pg;

const connStr = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_F0aKd2qPlMjv@ep-lively-credit-b39j75ag-pooler.c-4.ap-southeast-1.aws.neon.tech/tms_db?sslmode=require';

const isCloud = connStr.includes('neon.tech') || process.env.NODE_ENV === 'production';

/**
 * Global DB instance — connected to DATABASE_URL.
 * Used by Better Auth (auth tables live in the shared/auth DB).
 * All application CRUD uses req.db (injected by tenantMiddleware).
 */
const pool = new Pool({
  connectionString: connStr,
  ssl: isCloud ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

/** Drizzle instance type — shared across global + per-tenant connections */
export type DB = typeof db;
