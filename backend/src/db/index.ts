import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema/index.js';

export type DB = ReturnType<typeof drizzle<typeof schema>>;

const getValidDbUrl = (): string => {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && envUrl.includes('neon.tech')) {
    let conn = envUrl.trim();
    if (!conn.includes('sslmode=')) {
      conn += conn.includes('?') ? '&sslmode=require' : '?sslmode=require';
    }
    return conn;
  }
  return 'postgresql://neondb_owner:npg_F0aKd2qPlMjv@ep-lively-credit-b39j75ag-pooler.c-4.ap-southeast-1.aws.neon.tech/tms_db?sslmode=require';
};

let _dbInstance: DB | null = null;

/**
 * Lazy getter for the global DB connection pool.
 * Uses Neon Serverless driver (@neondatabase/serverless) for Vercel Function compatibility.
 */
export function getGlobalDb(): DB {
  if (_dbInstance) return _dbInstance;

  const pool = new Pool({
    connectionString: getValidDbUrl(),
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
