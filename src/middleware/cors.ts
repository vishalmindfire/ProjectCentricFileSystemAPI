import cors, { CorsOptions } from 'cors';
import { RequestHandler } from 'express';

const allowedOrigins = [
  'https://www.cpfsystem.com:5173',
  'https://www.cpfsystem.local:4000',
  'https://localhost:5173',
  'http://www.cpfsystem.com:5173',
  'http://www.cpfsystem.local:4000',
  'http://localhost:5173',
  'http://www.cpfsystem.com:4173',
  'http://localhost:4173',
  'https://project-centric-file-system.vercel.app',
  'https://project-centric-file-system-api.vercel.app',
];
const corsOptions: CorsOptions = {
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void => {
    console.log('origin ', origin);
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
};

export const corsMiddleware: RequestHandler = cors(corsOptions) as RequestHandler;
