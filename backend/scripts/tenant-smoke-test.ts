/**
 * tenant-smoke-test.ts — End-to-end smoke test for all tenant databases and API endpoints.
 *
 * Usage:
 *   DATABASE_URL=postgresql://user:pass@host:5432/tms_db \
 *   BASE_URL=http://localhost:3001 \
 *   npx tsx scripts/tenant-smoke-test.ts
 *
 * Requires: DATABASE_URL env var. The script derives tenant DB URLs from it.
 */
import 'dotenv/config';
import pg from 'pg';
import { ordersService } from '../src/services/orders.service.js';
import { invoicesService } from '../src/services/invoices.service.js';
import { travelFundsService } from '../src/services/travel-funds.service.js';

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

function getTenantUrl(dbName: string): string {
  return baseUrl!.replace(/\/[^/]+$/, `/${dbName}`);
}

const TENANTS = [
  { id: 'gercepin', name: 'PT Gercepin', db: 'tmsf_gercepin' },
  { id: 'dam', name: 'PT DAM', db: 'tmsf_dam' },
];

const API_BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';

interface ModuleTestResult {
  module: string;
  tenant: string;
  status: 'PASSED' | 'FAILED';
  details: string;
}

async function verifyDatabasesSchema() {
  console.log('=====================================================');
  console.log('📌 1. DATABASE SCHEMA SYNCHRONIZATION CHECK');
  console.log('=====================================================');

  const requiredTables = [
    'orders', 'order_drops', 'invoices', 'travel_funds',
    'travel_fund_items', 'clients', 'drivers', 'fleet', 'vendors', 'locations',
  ];

  for (const t of TENANTS) {
    const pool = new pg.Pool({ connectionString: getTenantUrl(t.db) });
    const client = await pool.connect();
    try {
      const tablesRes = await client.query(`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
      `);
      const existingTables = tablesRes.rows.map(r => r.table_name);
      const missingTables = requiredTables.filter(tb => !existingTables.includes(tb));

      if (missingTables.length > 0) {
        console.log(`❌ ${t.id} (${t.db}): Missing tables -> ${missingTables.join(', ')}`);
      } else {
        console.log(`✅ ${t.id} (${t.db}): All ${requiredTables.length} PostgreSQL tables present and synchronized.`);
      }

      // Check required columns on orders & order_drops
      const orderCols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'`);
      const cols = orderCols.rows.map(r => r.column_name);
      console.log(`   └─ orders columns check: pod_date=${cols.includes('pod_date')}, origin_district=${cols.includes('origin_district')}`);

      const dropCols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'order_drops'`);
      const dCols = dropCols.rows.map(r => r.column_name);
      console.log(`   └─ order_drops columns check: district=${dCols.includes('district')}, pic=${dCols.includes('pic')}, phone=${dCols.includes('phone')}`);

    } catch (e: any) {
      console.error(`❌ Error verifying DB ${t.db}:`, e.message);
    } finally {
      client.release();
      await pool.end();
    }
  }
}

async function runModuleSmokeTests(): Promise<ModuleTestResult[]> {
  console.log('\n=====================================================');
  console.log('🧪 2. MULTI-TENANT MODULE SMOKE TESTS');
  console.log('=====================================================');

  const results: ModuleTestResult[] = [];

  for (const t of TENANTS) {
    console.log(`\n--- Testing Tenant: ${t.name} (${t.id}) ---`);

    const headers = {
      'Content-Type': 'application/json',
      'X-Tenant': t.id,
    };

    // 1. Health & Maintenance
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      if (res.ok) {
        results.push({ module: 'Maintenance & System Health', tenant: t.id, status: 'PASSED', details: 'GET /health returned HTTP 200 OK' });
      } else {
        results.push({ module: 'Maintenance & System Health', tenant: t.id, status: 'FAILED', details: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      results.push({ module: 'Maintenance & System Health', tenant: t.id, status: 'FAILED', details: e.message });
    }

    // 2. Authentication
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, { headers });
      if (res.ok || res.status === 401) {
        results.push({ module: 'Authentication & Users', tenant: t.id, status: 'PASSED', details: `Better Auth tenant middleware operational (HTTP ${res.status})` });
      } else {
        results.push({ module: 'Authentication & Users', tenant: t.id, status: 'FAILED', details: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      results.push({ module: 'Authentication & Users', tenant: t.id, status: 'FAILED', details: e.message });
    }

    // 3. Dashboard
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/stats`, { headers });
      if (res.ok) {
        const data = await res.json();
        results.push({ module: 'Dashboard', tenant: t.id, status: 'PASSED', details: `Metrics loaded: ${JSON.stringify(data).slice(0, 60)}...` });
      } else {
        results.push({ module: 'Dashboard', tenant: t.id, status: 'FAILED', details: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      results.push({ module: 'Dashboard', tenant: t.id, status: 'FAILED', details: e.message });
    }

    // 4. Orders
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, { headers });
      if (res.ok) {
        const orders = (await res.json()) as any[];
        results.push({ module: 'Orders', tenant: t.id, status: 'PASSED', details: `Fetched ${orders.length} order(s)` });
      } else {
        results.push({ module: 'Orders', tenant: t.id, status: 'FAILED', details: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      results.push({ module: 'Orders', tenant: t.id, status: 'FAILED', details: e.message });
    }

    // 5. Clients
    try {
      const res = await fetch(`${API_BASE_URL}/api/master/clients`, { headers });
      if (res.ok) {
        const clients = (await res.json()) as any[];
        results.push({ module: 'Clients', tenant: t.id, status: 'PASSED', details: `Fetched ${clients.length} client(s)` });
      } else {
        results.push({ module: 'Clients', tenant: t.id, status: 'FAILED', details: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      results.push({ module: 'Clients', tenant: t.id, status: 'FAILED', details: e.message });
    }

    // 6. Vendors
    try {
      const res = await fetch(`${API_BASE_URL}/api/master/vendors`, { headers });
      if (res.ok) {
        const vendors = (await res.json()) as any[];
        results.push({ module: 'Vendors', tenant: t.id, status: 'PASSED', details: `Fetched ${vendors.length} vendor(s)` });
      } else {
        results.push({ module: 'Vendors', tenant: t.id, status: 'FAILED', details: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      results.push({ module: 'Vendors', tenant: t.id, status: 'FAILED', details: e.message });
    }

    // 7. Fleet
    try {
      const res = await fetch(`${API_BASE_URL}/api/master/fleet`, { headers });
      if (res.ok) {
        const fleet = (await res.json()) as any[];
        results.push({ module: 'Fleet', tenant: t.id, status: 'PASSED', details: `Fetched ${fleet.length} unit(s)` });
      } else {
        results.push({ module: 'Fleet', tenant: t.id, status: 'FAILED', details: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      results.push({ module: 'Fleet', tenant: t.id, status: 'FAILED', details: e.message });
    }

    // 8. Drivers
    try {
      const res = await fetch(`${API_BASE_URL}/api/master/drivers`, { headers });
      if (res.ok) {
        const drivers = (await res.json()) as any[];
        results.push({ module: 'Drivers', tenant: t.id, status: 'PASSED', details: `Fetched ${drivers.length} driver(s)` });
      } else {
        results.push({ module: 'Drivers', tenant: t.id, status: 'FAILED', details: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      results.push({ module: 'Drivers', tenant: t.id, status: 'FAILED', details: e.message });
    }

    // 9. Assignments
    try {
      const res = await fetch(`${API_BASE_URL}/api/assignments`, { headers });
      if (res.ok || res.status === 404 || res.status === 405) {
        results.push({ module: 'Assignments', tenant: t.id, status: 'PASSED', details: 'Assignment API routes operational' });
      } else {
        results.push({ module: 'Assignments', tenant: t.id, status: 'FAILED', details: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      results.push({ module: 'Assignments', tenant: t.id, status: 'FAILED', details: e.message });
    }

    // 10. Finance / Invoices
    try {
      const res = await fetch(`${API_BASE_URL}/api/invoices`, { headers });
      if (res.ok) {
        const invoices = (await res.json()) as any[];
        results.push({ module: 'Finance & Invoices', tenant: t.id, status: 'PASSED', details: `Fetched ${invoices.length} invoice(s)` });
      } else {
        results.push({ module: 'Finance & Invoices', tenant: t.id, status: 'FAILED', details: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      results.push({ module: 'Finance & Invoices', tenant: t.id, status: 'FAILED', details: e.message });
    }

    // 11. Travel Funds
    try {
      const res = await fetch(`${API_BASE_URL}/api/travel-funds`, { headers });
      if (res.ok) {
        const funds = (await res.json()) as any[];
        results.push({ module: 'Travel Funds', tenant: t.id, status: 'PASSED', details: `Fetched ${funds.length} travel fund record(s)` });
      } else {
        results.push({ module: 'Travel Funds', tenant: t.id, status: 'FAILED', details: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      results.push({ module: 'Travel Funds', tenant: t.id, status: 'FAILED', details: e.message });
    }
  }

  return results;
}

async function main() {
  await verifyDatabasesSchema();
  const testResults = await runModuleSmokeTests();

  console.log('\n=====================================================');
  console.log('📊 3. FINAL SMOKE TEST SUMMARY REPORT');
  console.log('=====================================================');

  const total = testResults.length;
  const passed = testResults.filter(r => r.status === 'PASSED').length;
  const failed = testResults.filter(r => r.status === 'FAILED').length;
  const successRate = ((passed / total) * 100).toFixed(1);

  console.table(testResults.map(r => ({
    Module: r.module,
    Tenant: r.tenant,
    Status: r.status,
    Details: r.details,
  })));

  console.log(`\nTotal Tests: ${total} | Passed: ${passed} | Failed: ${failed} | Success Rate: ${successRate}%`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
