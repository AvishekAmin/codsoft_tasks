import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

let server;

const startServer = async () => {
  try {
    // 1. Establish database connection before accepting HTTP requests
    console.log('[Server] Connecting to database...');
    await connectDB();

    // 2. Start HTTP server
    server = app.listen(env.port, () => {
      console.log('====================================================');
      console.log(` Online Quiz System Backend API (CodSoft Task 5) `);
      console.log(` Server running in [${env.nodeEnv}] mode on port ${env.port}`);
      console.log(` Health check: http://localhost:${env.port}/api/v1/health`);
      console.log(` Swagger Docs: http://localhost:${env.port}/api-docs`);
      console.log('====================================================');
    });
  } catch (error) {
    console.error(`[Server] Fatal error during startup: ${error.message}`);
    process.exit(1);
  }
};

const handleShutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      try {
        await disconnectDB();
        console.log('[Server] Graceful shutdown completed.');
        process.exit(0);
      } catch (err) {
        console.error(`[Server] Error during database disconnect: ${err.message}`);
        process.exit(1);
      }
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

startServer();
