const pg = require('pg');

const neonConnStr = 'postgresql://neondb_owner:npg_F0aKd2qPlMjv@ep-lively-credit-b39j75ag-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

async function checkNeonDatabases() {
  const pool = new pg.Pool({ connectionString: neonConnStr, ssl: { rejectUnauthorized: false } });
  try {
    const res = await pool.query(`SELECT datname FROM pg_database WHERE datistemplate = false;`);
    console.log('Databases available on Neon:', res.rows.map(r => r.datname));
  } catch (err) {
    console.error('Neon Connection Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkNeonDatabases();
