/**
 * push_tenant_schema.cjs — Provisions the full database schema for all tenant databases.
 *
 * Usage:
 *   DATABASE_URL=postgresql://user:pass@host:5432/tms_db node push_tenant_schema.cjs
 *
 * For Neon PostgreSQL staging:
 *   DATABASE_URL=postgresql://neonuser:password@ep-xxx.neon.tech:5432/tms_db?sslmode=require \
 *   node push_tenant_schema.cjs
 *
 * Requires: DATABASE_URL env var. The script derives tenant DB URLs by replacing
 * the database name at the end of the connection string.
 *
 * IMPORTANT: This script uses CREATE TABLE IF NOT EXISTS and is safe to re-run.
 * It does NOT drop or truncate any existing data.
 */

'use strict';

require('dotenv').config();

const { Pool } = require('pg');

const BASE_URL = process.env.DATABASE_URL;
if (!BASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('   Set it in your .env file or as an environment variable before running this script.');
  process.exit(1);
}

// Derive tenant DB URL by replacing the database name at the end of the connection string
function getTenantUrl(dbName) {
  return BASE_URL.replace(/\/[^/?]+(\?.*)?$/, `/${dbName}$1`);
}

const SQL = [
  "CREATE TABLE IF NOT EXISTS clients (id varchar(50) PRIMARY KEY, name varchar(255) NOT NULL, contact varchar(100), address text, bank_account varchar(255), pic varchar(150), phone varchar(50), email varchar(150), city varchar(100), status varchar(30) DEFAULT 'active', created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL)",
  "CREATE TABLE IF NOT EXISTS drivers (id varchar(50) PRIMARY KEY, name varchar(255) NOT NULL, phone varchar(50), license varchar(100), status varchar(30) DEFAULT 'available' NOT NULL, created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL)",
  "CREATE TABLE IF NOT EXISTS fleet (id varchar(50) PRIMARY KEY, plate varchar(50) NOT NULL, type varchar(100), capacity varchar(50), vendor varchar(255), status varchar(30) DEFAULT 'available' NOT NULL, created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL)",
  "CREATE TABLE IF NOT EXISTS vendors (id varchar(50) PRIMARY KEY, name varchar(255) NOT NULL, contact varchar(100), address text, bank_account varchar(255), pic varchar(150), phone varchar(50), email varchar(150), city varchar(100), status varchar(30) DEFAULT 'active', created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL)",
  "CREATE TABLE IF NOT EXISTS locations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), province varchar(100) NOT NULL, city varchar(100) NOT NULL, store varchar(200), created_at timestamp DEFAULT now() NOT NULL)",
  "CREATE TABLE IF NOT EXISTS orders (id varchar(30) PRIMARY KEY, so_number varchar(50), client_name varchar(255), client_id varchar(50) REFERENCES clients(id), date date NOT NULL, pickup_date date, etd_date date, eta_date date, pod_date date, total_value integer NOT NULL, dp_amount integer DEFAULT 0 NOT NULL, final_amount integer DEFAULT 0 NOT NULL, buying_price integer DEFAULT 0, status varchar(30) DEFAULT 'menunggu_dp' NOT NULL, payment_status varchar(30) DEFAULT 'belum_dp' NOT NULL, payment_type varchar(50) DEFAULT '70:30', invoice_pending boolean DEFAULT false, top_days integer, service_type varchar(50) DEFAULT 'FTL', unit_type varchar(50), kubikasi varchar(50), tonase varchar(50), weight varchar(50), origin_province varchar(100), origin_city varchar(100), origin_district varchar(100), origin_store varchar(200), driver_id varchar(50) REFERENCES drivers(id), driver_name varchar(150), fleet_id varchar(50) REFERENCES fleet(id), fleet_plate varchar(50), vendor_name varchar(150), vendor_payment_status varchar(30) DEFAULT 'unpaid', vendor_payment_date date, vendor_payment_details text, cost_breakdown text, notes text, created_by text, created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL)",
  "CREATE TABLE IF NOT EXISTS order_drops (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id varchar(30) NOT NULL REFERENCES orders(id) ON DELETE CASCADE, seq integer NOT NULL, province varchar(100), city varchar(100), district varchar(100), store varchar(200), pic varchar(150), phone varchar(50), status varchar(20) DEFAULT 'pending' NOT NULL, pod_file varchar(500), pod_date date, created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL)",
  "CREATE TABLE IF NOT EXISTS invoices (id varchar(50) PRIMARY KEY, order_id varchar(30) NOT NULL REFERENCES orders(id), client_id varchar(50) REFERENCES clients(id), client_name varchar(255), payment_type varchar(50), top_days integer, type varchar(20) NOT NULL, amount integer NOT NULL, issue_date date NOT NULL, due_date date NOT NULL, status varchar(20) DEFAULT 'unpaid' NOT NULL, paid_at timestamp, created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL)",
  "CREATE TABLE IF NOT EXISTS travel_funds (id varchar(30) PRIMARY KEY, order_id varchar(30) NOT NULL REFERENCES orders(id), driver_id varchar(50) REFERENCES drivers(id), request_amount integer NOT NULL, disbursed_amount integer DEFAULT 0 NOT NULL, total_realized integer DEFAULT 0 NOT NULL, balance integer DEFAULT 0 NOT NULL, status varchar(30) DEFAULT 'pengajuan' NOT NULL, request_date date NOT NULL, disbursed_at timestamp, finalized_at timestamp, created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp DEFAULT now() NOT NULL)",
  "CREATE TABLE IF NOT EXISTS travel_fund_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), travel_fund_id varchar(30) NOT NULL REFERENCES travel_funds(id) ON DELETE CASCADE, category varchar(50) DEFAULT 'Uang Jalan Driver' NOT NULL, description varchar(255) NOT NULL, amount integer NOT NULL, has_receipt boolean DEFAULT false NOT NULL, receipt_file varchar(500), created_at timestamp DEFAULT now() NOT NULL)"
];

async function pushToDb(dbName) {
  const connStr = getTenantUrl(dbName);
  const pool = new Pool({ connectionString: connStr });
  console.log(`\n🚀 Provisioning schema for database: ${dbName}`);
  try {
    for (const s of SQL) {
      await pool.query(s);
    }
    console.log(`✅ OK: ${dbName}`);
  } catch (e) {
    console.error(`❌ ERR ${dbName}: ${e.message}`);
  } finally {
    await pool.end();
  }
}

// Provision both tenant databases
pushToDb('tmsf_gercepin')
  .then(() => pushToDb('tmsf_dam'))
  .then(() => {
    console.log('\n🎉 Done! All tenant schemas provisioned.');
    console.log('\nNext steps:');
    console.log('  1. Verify tables exist: psql $DATABASE_URL -c "\\dt"');
    console.log('  2. Seed initial data if needed');
    process.exit(0);
  })
  .catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
  });
