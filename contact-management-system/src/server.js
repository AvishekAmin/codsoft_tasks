import app from './app.js';
import env from './config/env.js';
import prisma, { checkDbConnection } from './config/db.js';
import logger from './utils/logger.js';

const startServer = async () => {
  try {
    // Verify database connectivity
    const dbStatus = await checkDbConnection();
    if (dbStatus.connected) {
      logger.info('Database connected successfully');
    } else {
      logger.warn(`Database not connected: ${dbStatus.error || 'Connection refused'}. Running in offline/development mode.`);
    }

    const server = app.listen(env.PORT, () => {
      console.log('='.repeat(65));
      console.log(`  CONTACT MANAGEMENT SYSTEM REST API`);
      console.log(`  CodSoft Internship Task 2 - Backend Development`);
      console.log('='.repeat(65));
      console.log(`  Server Port    : ${env.PORT}`);
      console.log(`  Environment    : ${env.NODE_ENV}`);
      console.log(`  API Root       : http://localhost:${env.PORT}/api/v1`);
      console.log(`  Documentation  : http://localhost:${env.PORT}/api-docs`);
      console.log(`  Health Check   : http://localhost:${env.PORT}/api/v1/health`);
      console.log('='.repeat(65));
    });

    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed');
        try {
          if (prisma.$disconnect) {
            await prisma.$disconnect();
            logger.info('Database disconnected');
          }
        } catch (err) {
          logger.error('Error during database disconnect', err);
        }
        process.exit(0);
      });

      // Force exit after 10s timeout
      setTimeout(() => {
        logger.error('Graceful shutdown timeout exceeded. Forcing exit.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();
