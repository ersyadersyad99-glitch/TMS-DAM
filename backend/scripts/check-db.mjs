/**
 * check-db.mjs — Quick data sanity check for a tenant database.
 * Usage: node scripts/check-db.mjs
 * Requires: POSTGRES_ADMIN_URL or DATABASE_URL env var pointing to the target tenant DB.
 */
import 'dotenv/config';
import pg from 'pg';

const connStr = process.env.POSTGRES_ADMIN_URL || process.env.DATABASE_URL;
if (!connStr) {
  console.error('❌ POSTGRES_ADMIN_URL or DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: connStr });
const client = await pool.connect();
try {
  const ordersRes = await client.query('SELECT id, client_name, payment_type, payment_status, status FROM orders ORDER BY created_at DESC');
  console.log('=== ORDERS ===');
  ordersRes.rows.forEach(r => console.log(JSON.stringify(r)));

  const invRes = await client.query('SELECT id, order_id, client_name, type, amount, status FROM invoices ORDER BY created_at DESC');
  console.log('=== INVOICES ===');
  invRes.rows.forEach(r => console.log(JSON.stringify(r)));
} finally {
  client.release();
  await pool.end();
}
