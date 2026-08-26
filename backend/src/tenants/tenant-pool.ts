import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../db/schema/index.js';
import { TENANTS } from './tenants.config.js';
import type { DB } from '../db/index.js';

const { Pool } = pg;

/** In-memory cache: tenantId → drizzle instance */
const pool: Record<string, DB> = {};

/**
 * Returns (creating if needed) a Drizzle instance connected to the given tenant's database.
 */
export function getTenantDb(tenantId: string): DB {
  if (pool[tenantId]) return pool[tenantId];

  const tenant = TENANTS[tenantId];
  if (!tenant) {
    throw Object.assign(new Error(`Unknown tenant: ${tenantId}`), { status: 400 });
  }

  let baseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_F0aKd2qPlMjv@ep-lively-credit-b39j75ag-pooler.c-4.ap-southeast-1.aws.neon.tech/tms_db?sslmode=require';

  if (!baseUrl.includes('sslmode=')) {
    baseUrl += baseUrl.includes('?') ? '&sslmode=require' : '?sslmode=require';
  }

  // Replace the database name portion of the connection string while preserving query params
  const tenantUrl = baseUrl.replace(/\/[^/?]+(\?.*)?$/, `/${tenant.dbName}$1`);

  const maxConnections = Math.max(1, parseInt(process.env.TENANT_POOL_MAX ?? '5', 10));

  const pgPool = new Pool({
    connectionString: tenantUrl,
    max: maxConnections,
    ssl: { rejectUnauthorized: false },
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  pool[tenantId] = drizzle(pgPool, { schema });

  return pool[tenantId];
}
