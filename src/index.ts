import { createApp } from '#app.js';
import pool from '#config/dbConnector.js';
import httpsOptions from '#config/httpsConfig.js';
import https from 'https';

const app = createApp();
const httpsPort = process.env.HTTPS_PORT ?? '3000';

try {
  console.log('connecting to db');
  const client = await pool.connect();
  console.log('Connected to PostgreSQL database');
  client.release();
} catch (error: unknown) {
  console.error('Error connecting to the database:', error);
}

const httpsServer = https.createServer(httpsOptions, app);
httpsServer.listen(httpsPort, () => {
  console.log(`HTTPS server listening on port ${httpsPort}`);
});
