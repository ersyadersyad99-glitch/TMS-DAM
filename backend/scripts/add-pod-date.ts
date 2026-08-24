/**
 * add-pod-date.ts — Adds pod_date column to orders table for all tenant databases.
 *
 * Usage:
 *   DATABASE_URL=postgresql://user:pass@host:5432/tms_db npx tsx scripts/add-pod-date.ts
 *
 * Requires: DATABASE_URL env var. The script derives tenant DB URLs from it.
 */
import 'dotenv/config';
import pg from 'pg';

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

// Derive all tenant database URLs from the base DATABASE_URL
const TENANT_DBS = ['tmsf_gercepin', 'tmsf_dam'];

function getTenantUrl(dbName: string): string {
  return baseUrl!.replace(/\/[^/]+$/, `/${dbName}`);
}

async function migrate() {
  for (const db of TENANT_DBS) {
    const pool = new pg.Pool({ connectionString: getTenantUrl(db) });
    const client = await pool.connect();
    try {
      await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS pod_date date;');
      console.log(`✅ ${db}: pod_date column added`);
    } catch (e: any) {
      console.error(`Error ${db}:`, e.message);
    } finally {
      client.release();
      await pool.end();
    }
  }
}

migrate().then(() => process.exit(0));
