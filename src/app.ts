import { corsMiddleware } from '#middleware/cors.js';
import authRoutes from '#routes/authRoutes.js';
import fileRoutes from '#routes/fileRoutes.js';
import jobRoutes from '#routes/jobRoutes.js';
import projectRoutes from '#routes/projectRoutes.js';
import cookieParser from 'cookie-parser';
import express from 'express';

export const createApp = (): express.Express => {
  const app = express();

  app.use(corsMiddleware);
  app.use(cookieParser());
  app.use(express.json());

  app.use('/auth', authRoutes);
  app.use('/projects', projectRoutes);
  app.use('/projects/:projectId/files', fileRoutes);
  app.use('/projects/:projectId/jobs', jobRoutes);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ message });
  });

  return app;
};

export default createApp();
