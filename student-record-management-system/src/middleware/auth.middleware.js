import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import prisma from '../config/db.js';
import ApiError from '../utils/apiError.js';

/**
 * Authentication middleware: extracts JWT from Bearer header, validates signature,
 * checks revocation, and attaches authenticated user to req.user.
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication token is missing or malformed');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw ApiError.unauthorized('Authentication token is missing');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Authentication token has expired');
      }
      throw ApiError.unauthorized('Invalid authentication token');
    }

    // Check if token has been revoked
    if (decoded.jti) {
      const revoked = await prisma.revokedToken.findUnique({
        where: { tokenId: decoded.jti }
      });

      if (revoked) {
        throw ApiError.unauthorized('Token has been revoked. Please log in again.');
      }
    }

    // Load active user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw ApiError.unauthorized('User associated with this token no longer exists');
    }

    req.user = user;
    req.tokenPayload = decoded;
    req.tokenString = token;

    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;
