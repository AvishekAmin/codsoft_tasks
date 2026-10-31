import express from 'express';
import mongoose from 'mongoose';
import { ApiResponse } from '../utils/apiResponse.js';

const router = express.Router();

router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const isHealthy = dbState === 1;
  const status = isHealthy ? 200 : 503;

  return ApiResponse.success(
    res,
    isHealthy ? 'Service is healthy and operational' : 'Service is degraded (database unavailable)',
    {
      status: isHealthy ? 'healthy' : 'degraded',
      database: {
        status: states[dbState] || 'unknown',
        readyState: dbState
      },
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    },
    status
  );
});

export default router;
