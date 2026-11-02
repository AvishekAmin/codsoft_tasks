import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import prisma from '../config/db.js';
import { errorResponse } from '../utils/response.js';
import { sanitizeUser } from '../services/auth.service.js';

/**
 * Authentication middleware that verifies JWT Bearer tokens,
 * checks persistent token revocation status, and loads the authenticated user.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Authentication token is required');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return errorResponse(res, 401, 'Authentication token is required');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return errorResponse(res, 401, 'Authentication token has expired');
      }
      return errorResponse(res, 401, 'Invalid authentication token');
    }

    if (!decoded.id) {
      return errorResponse(res, 401, 'Invalid token payload');
    }

    // Check token revocation blocklist in database
    if (decoded.jti) {
      const revoked = await prisma.revokedToken.findUnique({
        where: { tokenId: decoded.jti }
      });
      if (revoked) {
        return errorResponse(res, 401, 'Authentication token has been revoked');
      }
    }

    // Load active user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user) {
      return errorResponse(res, 401, 'User account no longer exists');
    }

    // Attach sanitized user and token metadata to request
    req.user = sanitizeUser(user);
    req.tokenJti = decoded.jti;
    req.tokenExpiresAt = decoded.exp ? new Date(decoded.exp * 1000) : null;

    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;
