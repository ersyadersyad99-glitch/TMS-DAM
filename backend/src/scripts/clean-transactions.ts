import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const BASE_URL = process.env.POSTGRES_ADMIN_URL || process.env.DATABASE_URL;
if (!BASE_URL) {
  console.error('❌ POSTGRES_ADMIN_URL or DATABASE_URL environment variable is required');
  process.exit(1);
}

const urlObj = new URL(BASE_URL);
const host = urlObj.hostname;
const port = urlObj.port;
const user = urlObj.username;
const password = urlObj.password;

const tenantDbs = ['tms_db', 'tmsf_gercepin', 'tmsf_dam'];

async function cleanTenant(dbName: string) {
  console.log(`\n========================================`);
  console.log(`Cleaning transaction data in DB: ${dbName}`);
  console.log(`========================================`);

  const pool = new Pool({
    host,
    port: Number(port),
    user,
    password,
    database: dbName,
  });

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const r1 = await client.query('DELETE FROM travel_fund_items');
      console.log(`- Deleted ${r1.rowCount} rows from travel_fund_items`);

      const r2 = await client.query('DELETE FROM travel_funds');
      console.log(`- Deleted ${r2.rowCount} rows from travel_funds`);

      const r3 = await client.query('DELETE FROM invoices');
      console.log(`- Deleted ${r3.rowCount} rows from invoices`);

      const r4 = await client.query('DELETE FROM order_drops');
      console.log(`- Deleted ${r4.rowCount} rows from order_drops`);

      const r5 = await client.query('DELETE FROM orders');
      console.log(`- Deleted ${r5.rowCount} rows from orders`);

      await client.query('COMMIT');
      console.log(`✅ Successfully cleaned all transaction data in ${dbName}`);
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error(`❌ Error cleaning ${dbName}:`, err.message);
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error(`❌ Connection error to ${dbName}:`, err.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  for (const dbName of tenantDbs) {
    await cleanTenant(dbName);
  }
}

main().catch(console.error);
