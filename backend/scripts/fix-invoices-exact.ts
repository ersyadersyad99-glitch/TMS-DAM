/**
 * fix-invoices-exact.ts — Applies exact invoice/order data corrections for all tenant databases.
 *
 * Usage:
 *   DATABASE_URL=postgresql://user:pass@host:5432/tms_db npx tsx scripts/fix-invoices-exact.ts
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

async function fixTenantInvoices(dbName: string) {
  const pool = new pg.Pool({
    connectionString: getTenantUrl(dbName),
  });
  const client = await pool.connect();
  try {
    console.log(`Fixing exact order statuses and invoices in database: ${dbName}...`);

    // 1. Update DO-2025-875 payment_status to 'belum_dp'
    await client.query(`
      UPDATE orders
      SET payment_status = 'belum_dp', status = 'picked_up'
      WHERE id = 'DO-2025-875';
    `);

    // 2. Ensure INV-DP-DO-2025-875 is unpaid (Belum Dibayar) for DP 70% (Rp 7.077.000)
    await client.query(`
      INSERT INTO invoices (id, order_id, client_name, payment_type, type, amount, issue_date, due_date, status)
      VALUES ('INV-DP-DO-2025-875', 'DO-2025-875', 'SHII', '70:30', 'dp', 7077000, '2026-08-05', '2026-08-07', 'unpaid')
      ON CONFLICT (id) DO UPDATE SET
        payment_type = '70:30',
        type = 'dp',
        amount = 7077000,
        status = 'unpaid',
        updated_at = NOW();
    `);

    // 3. Ensure INV-DP-DO-2025-802 is paid (Lunas) for DP 70% (Rp 7.077.000)
    await client.query(`
      INSERT INTO invoices (id, order_id, client_name, payment_type, type, amount, issue_date, due_date, status)
      VALUES ('INV-DP-DO-2025-802', 'DO-2025-802', 'SHII', '70:30', 'dp', 7077000, '2026-08-05', '2026-08-07', 'paid')
      ON CONFLICT (id) DO UPDATE SET
        payment_type = '70:30',
        type = 'dp',
        amount = 7077000,
        status = 'paid',
        updated_at = NOW();
    `);

    // 4. Ensure INV-LNS-DO-2025-802 is paid (Lunas) for Pelunasan 30% (Rp 3.033.000)
    await client.query(`
      INSERT INTO invoices (id, order_id, client_name, payment_type, type, amount, issue_date, due_date, status)
      VALUES ('INV-LNS-DO-2025-802', 'DO-2025-802', 'SHII', '70:30', 'pelunasan', 3033000, '2026-08-06', '2026-08-09', 'paid')
      ON CONFLICT (id) DO UPDATE SET
        payment_type = '70:30',
        type = 'pelunasan',
        amount = 3033000,
        status = 'paid',
        updated_at = NOW();
    `);

    // 5. Ensure INV-TOP-DO-2025-533 is paid (Lunas) for TOP 14 HARI (Rp 16.176.000)
    await client.query(`
      INSERT INTO invoices (id, order_id, client_name, payment_type, type, amount, issue_date, due_date, status)
      VALUES ('INV-TOP-DO-2025-533', 'DO-2025-533', 'SHII', 'TOP 14 HARI', 'top_full', 16176000, '2026-08-05', '2026-08-19', 'paid')
      ON CONFLICT (id) DO UPDATE SET
        payment_type = 'TOP 14 HARI',
        type = 'top_full',
        amount = 16176000,
        status = 'paid',
        updated_at = NOW();
    `);

    console.log(`✅ ${dbName} exact invoices fixed!`);
  } catch (err: any) {
    console.error(`Error on ${dbName}:`, err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  for (const t of TENANT_DBS) {
    await fixTenantInvoices(t);
  }
}

main().then(() => process.exit(0)).catch(e => {
  console.error('Fix error:', e);
  process.exit(1);
});
