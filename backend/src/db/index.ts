import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from './schema/index.js';

const connStr = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_F0aKd2qPlMjv@ep-lively-credit-b39j75ag-pooler.c-4.ap-southeast-1.aws.neon.tech/tms_db?sslmode=require';

/**
 * Global DB instance — connected to DATABASE_URL via Neon Serverless Driver.
 * Used by Better Auth (auth tables live in the shared/auth DB).
 */
const pool = new Pool({
  connectionString: connStr,
});

export const db = drizzle(pool, { schema });

/** Drizzle instance type — shared across global + per-tenant connections */
export type DB = typeof db;
