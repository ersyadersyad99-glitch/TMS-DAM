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

function launchStudio(tenantId: string) {
  const tenant = TENANTS[tenantId];
  if (!tenant) {
    console.error(`❌ Error: Unknown tenant "${tenantId}". Available tenants: ${Object.keys(TENANTS).join(', ')}`);
    process.exit(1);
  }

  const tenantUrl = getTenantDbUrl(tenant.dbName);
  console.log(`🎨 Opening Drizzle Studio for tenant "${tenant.id}" (${tenant.dbName})...`);
  console.log(`   Database URL: ${tenantUrl}\n`);

  try {
    // Run drizzle-kit studio with overridden DATABASE_URL env
    execSync('npx drizzle-kit studio', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: tenantUrl,
      },
    });
  } catch (err) {
    console.error(`❌ Drizzle Studio stopped for tenant "${tenant.id}":`, err);
  }
}

function main() {
  const args = process.argv.slice(2);
  const tenantId = args[0] || process.env.TENANT_ID;

  if (!tenantId) {
    console.log('Usage:');
    console.log('  npm run studio:tenant gercepin   (Open Drizzle Studio for gercepin)');
    console.log('  npm run studio:tenant dam        (Open Drizzle Studio for dam)');
    console.log(`Available tenants: ${Object.keys(TENANTS).join(', ')}`);
    process.exit(1);
  }

  launchStudio(tenantId);
}

main();
