import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { errorHandler, notFoundHandler } from './core/middleware/error.middleware';
import { logger } from './core/utils/logger';
import moduleRoutes from './modules';
import { ROUTE_PREFIX } from './shared/constants';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://mendhospitality.in',
  'https://www.mendhospitality.in',
  'http://127.0.0.1:5500',
  'http://localhost:5000',
];

export const createApp = (): Application => {
  const app = express();

  app.use(helmet());
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Hotel-Id', 'X-Requested-With', 'Accept'],
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim())
      }
    })
  );

  app.use(ROUTE_PREFIX, moduleRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};