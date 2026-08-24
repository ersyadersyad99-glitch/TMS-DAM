/**
 * Tenant connection pool.
 *
 * Creates and caches one Drizzle ORM instance per tenant database,
 * so we don't open a new pool on every request.
 *
 * Pool sizing:
 *   TENANT_POOL_MAX env var controls max connections per tenant (default: 5).
 *   For Neon Free Tier (max ~20 total connections across all databases),
 *   keep this value at 5 or lower when running 2+ tenants.
 *   For a dedicated PostgreSQL server, you may raise it to 10–20.
 */

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
 *
 * The connection string is built by replacing the database name in DATABASE_URL.
 * Example: postgresql://postgres:pass@localhost:5432/tms_db  →
 *          postgresql://postgres:pass@localhost:5432/tmsf_gercepin
 */
export function getTenantDb(tenantId: string): DB {
  if (pool[tenantId]) return pool[tenantId];

  const tenant = TENANTS[tenantId];
  if (!tenant) {
    throw Object.assign(new Error(`Unknown tenant: ${tenantId}`), { status: 400 });
  }

  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Replace the database name portion of the connection string while preserving query params (e.g. ?sslmode=require)
  const tenantUrl = baseUrl.replace(/\/[^/?]+(\?.*)?$/, `/${tenant.dbName}$1`);

  // Max connections: default 5 (Neon-compatible). Override via TENANT_POOL_MAX.
  const maxConnections = Math.max(1, parseInt(process.env.TENANT_POOL_MAX ?? '5', 10));

  const pgPool = new Pool({
    connectionString: tenantUrl,
    max: maxConnections,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  pool[tenantId] = drizzle(pgPool, { schema });

  return pool[tenantId];
}

