/**
 * full-audit.ts — Prints a detailed audit of all tenant database contents.
 *
 * Usage:
 *   DATABASE_URL=postgresql://user:pass@host:5432/tms_db npx tsx scripts/full-audit.ts
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

const TENANTS = [
  { name: 'gercepin', db: 'tmsf_gercepin' },
  { name: 'dam', db: 'tmsf_dam' },
];

async function auditTenant(tenantName: string, dbName: string) {
  const pool = new pg.Pool({ connectionString: getTenantUrl(dbName) });
  const client = await pool.connect();
  console.log(`\n===== AUDIT: ${tenantName.toUpperCase()} (${dbName}) =====`);
  try {
    // 1. Orders
    const ordersRes = await client.query('SELECT id, client_name, payment_type, payment_status, status, origin_province, origin_city, origin_district, pod_date FROM orders ORDER BY created_at DESC');
    console.log(`\n[ORDERS] Count: ${ordersRes.rows.length}`);
    ordersRes.rows.forEach(r => console.log(' -', JSON.stringify(r)));

    // 2. Order Drops (check district, pic, phone columns)
    const dropsRes = await client.query(`
      SELECT od.id, od.order_id, od.seq, od.province, od.city, od.district, od.pic, od.phone, od.status, od.pod_file
      FROM order_drops od
      ORDER BY od.order_id, od.seq
    `);
    console.log(`\n[ORDER_DROPS] Count: ${dropsRes.rows.length}`);
    dropsRes.rows.forEach(r => console.log(' -', JSON.stringify(r)));

    // 3. Invoices
    const invRes = await client.query('SELECT id, order_id, client_name, type, amount, status, payment_type FROM invoices ORDER BY created_at DESC');
    console.log(`\n[INVOICES] Count: ${invRes.rows.length}`);
    invRes.rows.forEach(r => console.log(' -', JSON.stringify(r)));

    // 4. Travel Funds + Items
    const fundsRes = await client.query(`
      SELECT tf.id, tf.order_id, tf.status,
             count(tfi.id) as item_count,
             sum(tfi.amount) as total_realized
      FROM travel_funds tf
      LEFT JOIN travel_fund_items tfi ON tfi.travel_fund_id = tf.id
      GROUP BY tf.id ORDER BY tf.created_at DESC
    `);
    console.log(`\n[TRAVEL_FUNDS] Count: ${fundsRes.rows.length}`);
    fundsRes.rows.forEach(r => console.log(' -', JSON.stringify(r)));

    // 5. Check columns exist
    const colCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'orders'
      AND column_name IN ('pod_date', 'origin_district', 'origin_store')
      ORDER BY column_name
    `);
    console.log(`\n[COLUMNS CHECK orders]:`, colCheck.rows.map(r => r.column_name));

    const dropColCheck = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'order_drops'
      AND column_name IN ('district', 'pic', 'phone')
      ORDER BY column_name
    `);
    console.log(`[COLUMNS CHECK order_drops]:`, dropColCheck.rows.map(r => r.column_name));

    // 6. Clients, Fleet, Drivers count
    const clientsCount = await client.query('SELECT count(*) FROM clients');
    const fleetCount = await client.query('SELECT count(*) FROM fleet');
    const driversCount = await client.query('SELECT count(*) FROM drivers');
    console.log(`\n[MASTER DATA] clients: ${clientsCount.rows[0].count}, fleet: ${fleetCount.rows[0].count}, drivers: ${driversCount.rows[0].count}`);

  } catch (e: any) {
    console.error(`ERROR on ${dbName}:`, e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  for (const t of TENANTS) {
    await auditTenant(t.name, t.db);
  }
  console.log('\n✅ Audit complete!');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
