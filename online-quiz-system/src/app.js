import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFound } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security HTTP headers
app.use(
  helmet({
    contentSecurityPolicy: false // Disabled so Swagger UI assets render cleanly
  })
);

// CORS configuration
const allowedOrigins = env.corsOrigin === '*' ? '*' : env.corsOrigin.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Body parsing with safe limits against payload flooding
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Swagger UI OpenAPI Documentation
try {
  const swaggerDocument = YAML.load(path.join(__dirname, '../docs/openapi.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (err) {
  console.warn('[Documentation] Warning: Could not load Swagger documentation:', err.message);
}

// Root welcome endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to the Online Quiz System Backend REST API (CodSoft Internship Task 5)',
    documentation: '/api-docs',
    healthCheck: '/api/v1/health',
    version: '1.0.0'
  });
});

// Mount versioned API routes
app.use('/api/v1', apiRoutes);

// 404 Route Handler
app.use(notFound);

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
