/**
 * fix-all-tenants.ts — Data quality fixes for all tenant databases.
 *
 * Usage:
 *   DATABASE_URL=postgresql://user:pass@host:5432/tms_db npx tsx scripts/fix-all-tenants.ts
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

async function fixTenant(tenantName: string, dbName: string) {
  const pool = new pg.Pool({ connectionString: getTenantUrl(dbName) });
  const client = await pool.connect();
  console.log(`\n===== FIXING: ${tenantName.toUpperCase()} (${dbName}) =====`);
  try {
    // 1. Fix missing payment_type on pelunasan invoices
    await client.query(`
      UPDATE invoices SET payment_type = '70:30'
      WHERE type = 'pelunasan' AND payment_type IS NULL AND order_id LIKE 'DO-%'
    `);
    console.log('✅ Fixed missing payment_type on pelunasan invoices');

    // 2. Fix DO-2025-533 status - should be 'selesai' since it's delivered and TOP invoice paid
    await client.query(`
      UPDATE orders SET status = 'selesai'
      WHERE id = 'DO-2025-533' AND status = 'delivered'
    `);
    console.log('✅ Fixed DO-2025-533 status to selesai');

    // 3. Check the current status of DO-2025-875
    const orderCheck = await client.query('SELECT id, status, payment_status FROM orders WHERE id = $1', ['DO-2025-875']);
    console.log('DO-2025-875 current state:', orderCheck.rows[0]);

    // 4. Ensure all orders with payment_status='lunas' and all PODs done have status='selesai'
    await client.query(`
      UPDATE orders o
      SET status = 'selesai'
      WHERE o.payment_status = 'lunas'
        AND o.status IN ('delivered')
        AND NOT EXISTS (
          SELECT 1 FROM order_drops od
          WHERE od.order_id = o.id AND od.status != 'done'
        )
        AND (
          SELECT COUNT(*) FROM order_drops od WHERE od.order_id = o.id
        ) > 0
    `);
    console.log('✅ Fixed delivered+lunas orders to selesai');

    // 5. Verify travel_fund_items schema uses travel_fund_id
    const tfiCols = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'travel_fund_items' ORDER BY ordinal_position
    `);
    console.log('travel_fund_items columns:', tfiCols.rows.map(r => r.column_name));

    // 6. Check travel funds
    const funds = await client.query(`
      SELECT tf.id, tf.order_id, tf.status, tf.request_amount, tf.total_realized, tf.balance,
             COUNT(tfi.id) as item_count
      FROM travel_funds tf
      LEFT JOIN travel_fund_items tfi ON tfi.travel_fund_id = tf.id
      GROUP BY tf.id ORDER BY tf.created_at DESC
    `);
    console.log(`\ntravel_funds count: ${funds.rows.length}`);
    funds.rows.forEach(r => console.log(' -', JSON.stringify(r)));

    // 7. Print final state of invoices
    const invs = await client.query(`
      SELECT id, order_id, type, amount, status, payment_type FROM invoices ORDER BY created_at DESC
    `);
    console.log(`\n[FINAL INVOICES] Count: ${invs.rows.length}`);
    invs.rows.forEach(r => console.log(' -', JSON.stringify(r)));

    // 8. Print final state of orders
    const orders = await client.query(`
      SELECT id, status, payment_status, payment_type FROM orders ORDER BY created_at DESC
    `);
    console.log(`\n[FINAL ORDERS] Count: ${orders.rows.length}`);
    orders.rows.forEach(r => console.log(' -', JSON.stringify(r)));

    console.log(`\n✅ ${dbName} fixes complete!`);
  } catch (e: any) {
    console.error(`ERROR on ${dbName}:`, e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  for (const t of TENANTS) {
    await fixTenant(t.name, t.db);
  }
  console.log('\n✅ All tenant fixes complete!');
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
