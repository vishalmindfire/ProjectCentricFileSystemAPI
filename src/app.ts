import pool from '#config/dbConnector.js';
import httpsOptions from '#config/httpsConfig.js';
import { corsMiddleware } from '#middleware/cors.js';
import authRoutes from '#routes/authRoutes.js';
import projectRoutes from '#routes/projectRoutes.js';
import cookieParser from 'cookie-parser';
import express from 'express';
import https from 'https';

const app = express();

const httpsPort = process.env.HTTPS_PORT ?? '3000';

app.use(corsMiddleware);
app.use(cookieParser());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
try {
  console.log('connecting to db');
  const client = await pool.connect();
  console.log('Connected to PostgreSQL database');
  client.release();
} catch (error: unknown) {
  console.error('Error connecting to the database:', error);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({ message });
});

const httpsServer = https.createServer(httpsOptions, app);
httpsServer.listen(httpsPort, () => {
  console.log(`HTTPS server listening on port ${httpsPort}`);
});
