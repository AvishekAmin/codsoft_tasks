import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

/**
 * Throttles registration and login endpoints to prevent brute-force attacks.
 * Automatically bypassed in test mode.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes'
  }
});

/**
 * General API rate limiter for standard endpoints.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  }
});
