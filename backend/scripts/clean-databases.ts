import 'dotenv/config';
import pg from 'pg';
import { TENANTS } from '../src/tenants/tenants.config.js';

function getTenantDbUrl(dbName: string): string {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is required in .env');
  }
  return baseUrl.replace(/\/[^/]+$/, `/${dbName}`);
}

async function cleanTenant(tenantId: string) {
  const tenant = TENANTS[tenantId];
  if (!tenant) return;

  const tenantUrl = getTenantDbUrl(tenant.dbName);
  console.log(`🧹 Cleaning database "${tenant.dbName}" for tenant "${tenant.id}"...`);

  const pool = new pg.Pool({ connectionString: tenantUrl });

  try {
    // Truncate all tables safely
    await pool.query(`
      TRUNCATE TABLE 
        order_drops, 
        travel_fund_items, 
        travel_funds, 
        invoices, 
        orders, 
        clients, 
        vendors, 
        fleet, 
        drivers, 
        locations, 
        verification, 
        session, 
        account, 
        "user" 
      RESTART IDENTITY CASCADE;
    `);

    console.log(`✅ Database "${tenant.dbName}" cleaned successfully!\n`);
  } catch (err) {
    console.error(`❌ Failed to clean database "${tenant.dbName}":`, err);
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('🧼 Starting database cleanup across ALL tenant databases...\n');
  for (const tenantId of Object.keys(TENANTS)) {
    await cleanTenant(tenantId);
  }
  console.log('🎉 All tenant databases cleaned successfully!');
}

main();
