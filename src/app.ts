import httpsOptions from '#config/httpsConfig.js';
import { corsMiddleware } from '#middleware/cors.js';
import authRoutes from '#routes/authRoutes.js';
import cookieParser from 'cookie-parser';
import express from 'express';
import https from 'https';

const app = express();

const httpsPort = process.env.HTTPS_PORT ?? '3000';

app.use(corsMiddleware);
app.use(cookieParser());
app.use(express.json());

app.use('/auth', authRoutes);

const httpsServer = https.createServer(httpsOptions, app);
httpsServer.listen(httpsPort, () => {
  console.log(`HTTPS server listening on port ${httpsPort}`);
});
