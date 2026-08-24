/**
 * sync-missing-dp-invoices.ts — Syncs missing DP invoices for all tenant databases.
 *
 * Usage:
 *   DATABASE_URL=postgresql://user:pass@host:5432/tms_db npx tsx scripts/sync-missing-dp-invoices.ts
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

async function syncTenant(dbName: string) {
  const pool = new pg.Pool({
    connectionString: getTenantUrl(dbName),
  });
  const client = await pool.connect();
  try {
    console.log(`Syncing missing DP invoices for database: ${dbName}...`);
    const ordersRes = await client.query(`
      SELECT id, client_name, date, total_value, dp_amount, payment_type, payment_status
      FROM orders
      WHERE payment_type = '70:30' OR payment_type IS NULL OR payment_type = ''
    `);

    for (const o of ordersRes.rows) {
      const dpId = `INV-DP-${o.id}`;
      const issueDate = o.date || new Date().toISOString().split('T')[0];
      const dueDateObj = new Date(issueDate);
      dueDateObj.setDate(dueDateObj.getDate() + 2);
      const dueDateStr = dueDateObj.toISOString().split('T')[0];
      const dpAmount = o.dp_amount || Math.round((o.total_value || 0) * 0.7);
      const isPaid = o.payment_status === 'dp_lunas' || o.payment_status === 'lunas';

      await client.query(`
        INSERT INTO invoices (id, order_id, client_name, payment_type, type, amount, issue_date, due_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          client_name = EXCLUDED.client_name,
          amount = EXCLUDED.amount,
          status = EXCLUDED.status,
          updated_at = NOW();
      `, [dpId, o.id, o.client_name || '—', '70:30', 'dp', dpAmount, issueDate, dueDateStr, isPaid ? 'paid' : 'unpaid']);
    }
    console.log(`✅ ${dbName} DP invoices synced successfully!`);
  } catch (err: any) {
    console.error(`Error on ${dbName}:`, err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  for (const t of TENANT_DBS) {
    await syncTenant(t);
  }
}

main().then(() => process.exit(0)).catch(e => {
  console.error('Sync error:', e);
  process.exit(1);
});
