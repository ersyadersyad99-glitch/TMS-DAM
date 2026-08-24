import { db } from './index.js';
import { sql } from 'drizzle-orm';

async function fix() {
  console.log('Migrating column types...');
  await db.execute(sql`ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_client_id_clients_id_fk;`);
  await db.execute(sql`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_client_id_clients_id_fk;`);
  await db.execute(sql`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_driver_id_drivers_id_fk;`);
  await db.execute(sql`ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_fleet_id_fleet_id_fk;`);
  await db.execute(sql`ALTER TABLE travel_funds DROP CONSTRAINT IF EXISTS travel_funds_driver_id_drivers_id_fk;`);

  await db.execute(sql`ALTER TABLE clients ALTER COLUMN id TYPE varchar(50);`);
  await db.execute(sql`ALTER TABLE drivers ALTER COLUMN id TYPE varchar(50);`);
  await db.execute(sql`ALTER TABLE fleet ALTER COLUMN id TYPE varchar(50);`);
  await db.execute(sql`ALTER TABLE invoices ALTER COLUMN client_id TYPE varchar(50);`);
  await db.execute(sql`ALTER TABLE orders ALTER COLUMN client_id TYPE varchar(50);`);
  await db.execute(sql`ALTER TABLE orders ALTER COLUMN driver_id TYPE varchar(50);`);
  await db.execute(sql`ALTER TABLE orders ALTER COLUMN fleet_id TYPE varchar(50);`);
  await db.execute(sql`ALTER TABLE travel_funds ALTER COLUMN driver_id TYPE varchar(50);`);

  console.log('✅ Column types migrated successfully!');
  process.exit(0);
}

fix().catch(err => {
  console.error(err);
  process.exit(1);
});
