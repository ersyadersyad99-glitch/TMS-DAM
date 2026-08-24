const pg = require('pg');

const neonConnStr = 'postgresql://neondb_owner:npg_F0aKd2qPlMjv@ep-lively-credit-b39j75ag-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function fixDbName() {
  const pool = new pg.Pool({ connectionString: neonConnStr, ssl: { rejectUnauthorized: false } });
  try {
    console.log('Renaming "Database name: tms_db" to "tms_db" on Neon...');
    await pool.query(`ALTER DATABASE "Database name: tms_db" RENAME TO tms_db;`);
    console.log('✅ Database successfully renamed to tms_db!');

    const res = await pool.query(`SELECT datname FROM pg_database WHERE datistemplate = false;`);
    console.log('Updated Databases on Neon:', res.rows.map(r => r.datname));
  } catch (err) {
    console.error('Rename Error:', err.message);
  } finally {
    await pool.end();
  }
}

fixDbName();
