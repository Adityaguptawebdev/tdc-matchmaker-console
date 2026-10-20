import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/error';
import { buildRouter } from './routes';
import type { Store } from './store/types';

export function createApp(store: Store) {
  const app = express();
  app.disable('x-powered-by');
  if (env.trustProxy) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      // Environment-based allow-list; requests without an Origin (curl, server-to-server) are allowed.
      origin: (origin, cb) =>
        !origin || env.corsOrigins.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS')),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use((req, _res, next) => {
    req.store = store;
    next();
  });

  app.get('/', (_req, res) => {
    res.json({
      data: { service: 'tdc-matchmaker-api', docs: 'See README.md#api-reference', health: '/api/health' },
    });
  });
  app.use('/api', apiLimiter, buildRouter());
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
