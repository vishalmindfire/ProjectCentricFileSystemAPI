import { createApp } from '#app.js';
import pool from '#config/dbConnector.js';
import httpsOptions from '#config/httpsConfig.js';
import http from 'http';
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
if (process.env.NODE_ENV !== 'production') {
  const httpsServer = https.createServer(httpsOptions, app);
  httpsServer.listen(httpsPort, () => {
    console.log(`HTTPS server listening on port ${httpsPort}`);
  });
} else {
  const httpServer = http.createServer(app);
  httpServer.listen(httpsPort, () => {
    console.log(`HTTP server listening on port ${httpsPort}`);
  });
}
