import { errorResponse } from '../utils/response.js';
import logger from '../utils/logger.js';
import env from '../config/env.js';

/**
 * Custom operational application error class with HTTP status code.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized error-handling middleware.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // JSON syntax error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, 400, 'Malformed JSON payload in request body');
  }

  // Zod validation error
  if (err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return errorResponse(res, statusCode, message, errors);
  }

  // Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    statusCode = 409;
    const target = err.meta?.target;
    const targetStr = Array.isArray(target) ? target.join(', ') : String(target || '');

    if (targetStr.includes('email') && targetStr.includes('ownerId')) {
      message = 'A contact with this email address already exists in your contact list';
    } else if (targetStr.includes('phone') && targetStr.includes('ownerId')) {
      message = 'A contact with this phone number already exists in your contact list';
    } else if (targetStr.includes('email')) {
      message = 'A user account with this email address already exists';
    } else {
      message = 'A unique constraint violation occurred';
    }

    return errorResponse(res, statusCode, message);
  }

  // Prisma record not found (P2025)
  if (err.code === 'P2025') {
    return errorResponse(res, 404, 'Requested record not found or inaccessible');
  }

  // Prisma foreign key constraint violation (P2003)
  if (err.code === 'P2003') {
    return errorResponse(res, 400, 'Foreign key constraint violation: referenced entity does not exist');
  }

  // Log 500 or unexpected internal server errors
  if (statusCode >= 500) {
    logger.error(`Unhandled Exception [${req.method} ${req.originalUrl}]`, err);
    if (env.NODE_ENV === 'production') {
      message = 'An unexpected internal server error occurred';
      errors = null;
    }
  }

  return errorResponse(res, statusCode, message, errors);
};

export default errorHandler;
