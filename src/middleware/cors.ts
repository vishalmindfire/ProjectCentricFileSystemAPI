import cors, { CorsOptions } from 'cors';
import { RequestHandler } from 'express';

const allowedOrigins = [
  'https://www.cpfsystem.com:5173',
  'https://www.cpfsystem.local:4000',
  'https://127.0.0.1:5173',
  'https://localhost:5173',
  'http://www.cpfsystem.com:5173',
  'http://www.cpfsystem.local:4000',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
];
const corsOptions: CorsOptions = {
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void => {
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
