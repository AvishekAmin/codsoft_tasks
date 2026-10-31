import { Router } from 'express';
import { checkDbConnection } from '../config/db.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import env from '../config/env.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const dbStatus = await checkDbConnection();

    const healthData = {
      status: dbStatus.connected ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: env.NODE_ENV,
      database: {
        type: 'PostgreSQL',
        connected: dbStatus.connected,
        ...(dbStatus.error && { message: dbStatus.error })
      }
    };

    const statusCode = dbStatus.connected ? 200 : 503;
    return res.status(statusCode).json({
      success: dbStatus.connected,
      message: dbStatus.connected
        ? 'Student Record Management API is healthy'
        : 'Service degraded: Database connection unavailable',
      data: healthData
    });
  })
);

export default router;
