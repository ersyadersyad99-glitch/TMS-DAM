import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool } from '@neondatabase/serverless';
import * as schema from '../db/schema/index.js';
import { TENANTS } from './tenants.config.js';
import type { DB } from '../db/index.js';

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

  let baseUrl = 'postgresql://neondb_owner:npg_F0aKd2qPlMjv@ep-lively-credit-b39j75ag-pooler.c-4.ap-southeast-1.aws.neon.tech/tms_db?sslmode=require';

  if (!baseUrl.includes('sslmode=')) {
    baseUrl += baseUrl.includes('?') ? '&sslmode=require' : '?sslmode=require';
  }

  // Replace the database name portion of the connection string while preserving query params
  const tenantUrl = baseUrl.replace(/\/[^/?]+(\?.*)?$/, `/${tenant.dbName}$1`);

  const pgPool = new Pool({
    connectionString: tenantUrl,
  });
  pool[tenantId] = drizzle(pgPool, { schema });

  return pool[tenantId];
}
