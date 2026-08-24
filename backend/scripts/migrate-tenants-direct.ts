/**
 * migrate-tenants-direct.ts — Adds location/drop columns to all tenant databases via direct SQL.
 *
 * Usage:
 *   DATABASE_URL=postgresql://user:pass@host:5432/tms_db npx tsx scripts/migrate-tenants-direct.ts
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

function getTenantUrl(dbName: string): string {
  return baseUrl!.replace(/\/[^/]+$/, `/${dbName}`);
}

// NOTE: 'tms_db' is excluded intentionally — it is the auth-only database
// and does NOT contain orders/order_drops tables.
const TENANT_DBS = ['tmsf_gercepin', 'tmsf_dam'];

async function fixTenant(dbName: string) {
  const pool = new pg.Pool({
    connectionString: getTenantUrl(dbName),
  });
  const client = await pool.connect();
  try {
    console.log(`Updating schema for ${dbName}...`);
    await client.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS origin_district VARCHAR(100);
      ALTER TABLE order_drops ADD COLUMN IF NOT EXISTS district VARCHAR(100);
      ALTER TABLE order_drops ADD COLUMN IF NOT EXISTS pic VARCHAR(150);
      ALTER TABLE order_drops ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
    `);
    console.log(`✅ ${dbName} updated!`);
  } catch (err: any) {
    console.error(`Error on ${dbName}:`, err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  for (const t of TENANT_DBS) {
    await fixTenant(t);
  }
}

main().then(() => process.exit(0)).catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
});
