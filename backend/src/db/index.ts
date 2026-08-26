import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

const { Pool } = pg;

let rawUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_F0aKd2qPlMjv@ep-lively-credit-b39j75ag-pooler.c-4.ap-southeast-1.aws.neon.tech/tms_db?sslmode=require';

if (!rawUrl.includes('sslmode=')) {
  rawUrl += rawUrl.includes('?') ? '&sslmode=require' : '?sslmode=require';
}

/**
 * Global DB instance — connected to DATABASE_URL.
 * Used by Better Auth (auth tables live in the shared/auth DB).
 */
const pool = new Pool({
  connectionString: rawUrl,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });

/** Drizzle instance type — shared across global + per-tenant connections */
export type DB = typeof db;
