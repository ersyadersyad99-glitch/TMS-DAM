import 'dotenv/config';
import { execSync } from 'child_process';
import { TENANTS } from '../src/tenants/tenants.config.js';

function getTenantDbUrl(dbName: string): string {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) {
    throw new Error('DATABASE_URL environment variable is required in .env');
  }
  return baseUrl.replace(/\/[^/]+$/, `/${dbName}`);
}

async function migrateTenant(tenantId: string) {
  const tenant = TENANTS[tenantId];
  if (!tenant) {
    console.error(`❌ Error: Unknown tenant "${tenantId}". Available tenants: ${Object.keys(TENANTS).join(', ')}`);
    process.exit(1);
  }

  const tenantUrl = getTenantDbUrl(tenant.dbName);
  console.log(`🚀 Migrating database "${tenant.dbName}" for tenant "${tenant.id}"...`);

  try {
    // Run drizzle-kit push --force for non-interactive execution
    execSync('npx drizzle-kit push --force', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: tenantUrl,
      },
    });
    console.log(`✅ Tenant "${tenant.id}" database (${tenant.dbName}) migrated successfully!\n`);
  } catch (err) {
    console.error(`❌ Migration failed for tenant "${tenant.id}":`, err);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isAll = args.includes('--all');
  const tenantArg = args.find(a => !a.startsWith('--')) || args.find(a => a.startsWith('--tenant='))?.split('=')[1];

  if (isAll) {
    console.log('📦 Starting multi-tenant migration for ALL registered databases...\n');
    for (const tenantId of Object.keys(TENANTS)) {
      await migrateTenant(tenantId);
    }
    console.log('🎉 All tenant databases migrated successfully!');
  } else if (tenantArg) {
    await migrateTenant(tenantArg);
  } else {
    console.log('Usage:');
    console.log('  npm run migrate:all               (Migrate all tenant databases)');
    console.log('  npm run migrate:tenant gercepin   (Migrate specific tenant database)');
    process.exit(1);
  }
}

main();
