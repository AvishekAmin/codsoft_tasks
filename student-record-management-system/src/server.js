import app from './app.js';
import env from './config/env.js';
import { prisma, checkDbConnection } from './config/db.js';

const startServer = async () => {
  const port = env.PORT || 5001;

  // Check database connectivity
  console.log('Connecting to PostgreSQL database...');
  const dbStatus = await checkDbConnection();

  if (dbStatus.connected) {
    console.log('Connected to PostgreSQL database successfully.');
  } else {
    console.warn(`WARNING: Could not connect to PostgreSQL: ${dbStatus.error}`);
    console.warn('API is running in degraded mode. Database-dependent endpoints will return errors until PostgreSQL is running.');
  }

  const server = app.listen(port, () => {
    console.log(`====================================================`);
    console.log(`Student Record Management API (CodSoft Task 1)`);
    console.log(`Environment : ${env.NODE_ENV}`);
    console.log(`Server URL  : http://localhost:${port}`);
    console.log(`API Base    : http://localhost:${port}/api/v1`);
    console.log(`Swagger Docs: http://localhost:${port}/api-docs`);
    console.log(`Health Check: http://localhost:${port}/api/v1/health`);
    console.log(`====================================================`);
  });

  const gracefulShutdown = async (signal) => {
    console.log(`Received ${signal}. Gracefully shutting down...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      await prisma.$disconnect();
      console.log('Prisma database connection closed.');
      process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
