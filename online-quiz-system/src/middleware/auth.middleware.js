import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { TokenBlocklist } from '../models/TokenBlocklist.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication required. Missing or malformed Bearer token.');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw ApiError.unauthorized('Authentication token missing.');
  }

  // Check if token was revoked via logout
  const isRevoked = await TokenBlocklist.findOne({ token });
  if (isRevoked) {
    throw ApiError.unauthorized('Session has expired or was logged out. Please log in again.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token has expired. Please log in again.');
    }
    throw ApiError.unauthorized('Invalid authentication token.');
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    throw ApiError.unauthorized('User associated with this token no longer exists.');
  }

  req.user = user;
  req.token = token;
  req.tokenPayload = decoded;
  next();
});

/**
 * Optional authentication middleware:
 * Attaches user if token is valid, but allows guest access if no token is provided.
 */
export const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (!token) return next();

  try {
    const isRevoked = await TokenBlocklist.findOne({ token });
    if (isRevoked) return next();

    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.id);
    if (user) {
      req.user = user;
      req.token = token;
      req.tokenPayload = decoded;
    }
  } catch {
    // Ignore invalid tokens for optional auth routes
  }
  next();
});
