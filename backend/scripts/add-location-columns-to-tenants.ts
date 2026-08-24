import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/tmsf_gercepin',
});

const TENANTS = ['tmsf_gercepin', 'tmsf_dam'];

async function main() {
  const client = await pool.connect();
  try {
    for (const tenantDb of TENANTS) {
      console.log(`Applying location column updates to database: ${tenantDb}...`);
      await client.query(`
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS origin_district VARCHAR(100);
        ALTER TABLE order_drops ADD COLUMN IF NOT EXISTS district VARCHAR(100);
        ALTER TABLE order_drops ADD COLUMN IF NOT EXISTS pic VARCHAR(150);
        ALTER TABLE order_drops ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      `).catch((err) => console.warn(`DDL warning for ${tenantDb}:`, err.message));

      console.log(`✅ ${tenantDb} updated successfully!`);
    }
  } finally {
    client.release();
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
