import { checkDbConnection } from '../config/db.js';
import { successResponse } from '../utils/response.js';

export const getHealth = async (req, res, next) => {
  try {
    const dbStatus = await checkDbConnection();

    return successResponse(res, 200, 'Contact Management System API is healthy', {
      service: 'contact-management-system',
      status: 'UP',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbStatus.connected ? 'connected' : 'disconnected'
    });
  } catch (error) {
    next(error);
  }
};
