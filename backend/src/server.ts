import http from 'http';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './core/utils/logger';

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    const app = createApp();
    const server = http.createServer(app);

    server.listen(env.PORT, () => {
      logger.info(`✅ Server started on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });

    const shutdown = (signal: string) => {
      logger.info(`❌ Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info('❌ HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error('❌ Failed to start server', error);
    process.exit(1);
  }
};

void startServer();

