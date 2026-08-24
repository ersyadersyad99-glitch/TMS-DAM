/**
 * migrate-drop-pod-date.ts — Adds pod_date column to order_drops table for all tenant databases.
 *
 * Usage:
 *   DATABASE_URL=postgresql://user:pass@host:5432/tms_db npx tsx scripts/migrate-drop-pod-date.ts
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

const TENANT_DBS = ['tmsf_gercepin', 'tmsf_dam'];
const SQL = 'ALTER TABLE order_drops ADD COLUMN IF NOT EXISTS pod_date date;';

async function main() {
  for (const dbName of TENANT_DBS) {
    const pool = new pg.Pool({ connectionString: getTenantUrl(dbName) });
    const client = await pool.connect();
    try {
      await client.query(SQL);
      console.log(`✅ Migration done: ${dbName} — pod_date column added to order_drops`);
      // Verify
      const check = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name='order_drops' AND column_name='pod_date'
      `);
      console.log(`   └─ Verification: ${check.rows.length > 0 ? '✅ column exists' : '❌ column missing'}`);
    } catch(e: any) {
      console.error(`❌ Error on ${dbName}:`, e.message);
    } finally {
      client.release();
      await pool.end();
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
