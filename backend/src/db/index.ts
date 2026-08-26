import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';

const { Pool } = pg;

export type DB = ReturnType<typeof drizzle<typeof schema>>;

let _dbInstance: DB | null = null;

/**
 * Lazy getter for the global DB connection pool.
 * Prevents Vercel Serverless cold-start module crashes by opening TCP pools only on-demand during request execution.
 */
export function getGlobalDb(): DB {
  if (_dbInstance) return _dbInstance;

  const rawUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_F0aKd2qPlMjv@ep-lively-credit-b39j75ag-pooler.c-4.ap-southeast-1.aws.neon.tech/tms_db?sslmode=require';
  let connStr = rawUrl.trim();
  if (!connStr.includes('sslmode=')) {
    connStr += connStr.includes('?') ? '&sslmode=require' : '?sslmode=require';
  }

  const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  _dbInstance = drizzle(pool, { schema });
  return _dbInstance;
}

/**
 * Proxy wrapper so existing `import { db } from '../db/index.js'` references resolve dynamically to getGlobalDb().
 */
export const db: DB = new Proxy({} as DB, {
  get(_target, prop) {
    const instance = getGlobalDb() as any;
    const value = instance[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
