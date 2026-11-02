import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import env from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFound } from './middleware/notFound.middleware.js';
import { apiRateLimiter } from './middleware/rateLimiter.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// General rate limiter
app.use(apiRateLimiter);

// Body parser with strict size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Swagger API Documentation UI
try {
  const swaggerDocument = YAML.load(path.join(__dirname, '../docs/openapi.yaml'));
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, {
      customSiteTitle: 'Contact Management System API Docs'
    })
  );
} catch (err) {
  console.warn('Swagger documentation could not be loaded:', err.message);
}

// Root convenience info route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CodSoft Task 2: Contact Management System REST API is running',
    version: '1.0.0',
    documentation: '/api-docs',
    endpointsPrefix: '/api/v1'
  });
});

// Mount versioned API routes
app.use('/api/v1', apiRouter);

// 404 Fallback
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

export default app;
