const { Pool, types } = require('pg');

// NUMERIC (prices, totals) and BIGINT (COUNT) come back as strings by default.
// Turn them into real numbers so the frontend gets 85 instead of "85.00".
types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(20, (v) => parseInt(v, 10));

const schema = process.env.DB_SCHEMA || 'cst_cafe';
const timezone = process.env.DB_TIMEZONE || 'Asia/Thimphu';

if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
  throw new Error('DB_SCHEMA contains invalid characters');
}
if (!/^[A-Za-z0-9_\/+-]+$/.test(timezone)) {
  throw new Error('DB_TIMEZONE contains invalid characters');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 10,
  // Every connection looks in the cst_cafe schema and shows times in Bhutan time.
  options: `-c search_path=${schema},public -c timezone=${timezone}`,
});

// Runs fn(client) inside BEGIN/COMMIT, and rolls back if anything throws.
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // ignore: the original error is more useful
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, tx };
