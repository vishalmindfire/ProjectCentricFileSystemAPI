import cors, { CorsOptions } from 'cors';
import { RequestHandler } from 'express';

const allowedOrigins = ['https://www.cpfsystem.com:5173', 'https://127.0.0.1:5173', 'https://localhost:5173'];
const corsOptions: CorsOptions = {
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void => {
    // Allow requests with no origin (mobile apps, curl, etc)
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
