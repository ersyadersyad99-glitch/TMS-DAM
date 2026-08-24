import 'dotenv/config';
import pg from 'pg';
import { TENANTS } from '../src/tenants/tenants.config.js';

function getTenantDbUrl(dbName: string): string {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) throw new Error('DATABASE_URL is required');
  return baseUrl.replace(/\/[^/]+$/, `/${dbName}`);
}

async function updateSchema(tenantId: string) {
  const tenant = TENANTS[tenantId];
  if (!tenant) return;

  const tenantUrl = getTenantDbUrl(tenant.dbName);
  console.log(`🔧 Updating schema columns for database "${tenant.dbName}" (${tenantId})...`);

  const pool = new pg.Pool({ connectionString: tenantUrl });

  try {
    // Add missing vendor columns if they don't exist
    await pool.query(`
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pic VARCHAR(150);
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS email VARCHAR(150);
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS city VARCHAR(100);
      ALTER TABLE vendors ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active';
    `);

    // Add missing client columns if they don't exist
    await pool.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS pic VARCHAR(150);
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS email VARCHAR(150);
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active';
    `);

    console.log(`✅ Database "${tenant.dbName}" schema updated successfully!`);
  } catch (err) {
    console.error(`❌ Failed to update schema for "${tenant.dbName}":`, err);
  } finally {
    await pool.end();
  }
}

async function main() {
  for (const id of Object.keys(TENANTS)) {
    await updateSchema(id);
  }
  console.log('🎉 Schema update complete for all tenant DBs!');
  process.exit(0);
}

main();
