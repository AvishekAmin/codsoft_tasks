import { Prisma } from '@prisma/client';
import ApiError from '../utils/apiError.js';
import env from '../config/env.js';

/**
 * Centralized error-handling middleware.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || [];

  // Handle Zod syntax or JSON body parser errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON in request body';
    errors = [{ field: 'body', message: err.message }];
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    errors = [{ field: 'authorization', message: 'Token signature or format is invalid' }];
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
    errors = [{ field: 'authorization', message: 'Token expired, please re-authenticate' }];
  }

  // Handle Prisma Database Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        // Unique constraint violation
        statusCode = 409;
        const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target || 'field';
        message = `Conflict: A record with this unique ${target} already exists`;
        errors = [{ field: target, message: `Unique constraint violated on ${target}` }];
        break;
      }
      case 'P2003': {
        // Foreign key constraint failed
        statusCode = 409;
        const fieldName = err.meta?.field_name || 'relation';
        message = 'Foreign key constraint violated: dependent records exist or referenced record is missing';
        errors = [{ field: fieldName, message: 'Operation conflicts with existing relational data' }];
        break;
      }
      case 'P2025': {
        // Record not found
        statusCode = 404;
        message = 'The requested resource was not found';
        errors = [{ field: 'id', message: 'Record does not exist' }];
        break;
      }
      default: {
        statusCode = 500;
        message = 'Database operation failed';
        errors = [{ field: 'database', message: 'An unexpected database error occurred' }];
        break;
      }
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Database query validation error';
    errors = [{ field: 'database', message: 'Invalid data format provided to query engine' }];
  }

  // In non-development, do not expose stack or raw internal messages for 500 errors
  if (statusCode === 500 && env.NODE_ENV === 'production') {
    message = 'Internal server error';
    errors = [];
  }

  // Diagnostic logging on the server without leaking secrets
  if (statusCode === 500) {
    console.error(`[Error 500] ${req.method} ${req.originalUrl}:`, err.message);
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errors: Array.isArray(errors) ? errors : [errors]
  });
};

export default errorHandler;
