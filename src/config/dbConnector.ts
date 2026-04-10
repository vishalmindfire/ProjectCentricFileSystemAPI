import { Pool } from 'pg';

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

const pool: Pool = new Pool({
  database: getEnv('DB_NAME'),
  host: getEnv('DB_HOST'),
  password: getEnv('DB_PASSWORD'),
  port: Number(getEnv('DB_PORT')),
  user: getEnv('DB_USER'),
});

void (async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    client.release();
  } catch (error: unknown) {
    console.error('Error connecting to the database:', error);
  }
})();

export default pool;
