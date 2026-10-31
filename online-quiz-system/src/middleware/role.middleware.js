import { ApiError } from '../utils/apiError.js';

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  if (!roles.includes(req.user.role)) {
    return next(
      ApiError.forbidden(
        `Access denied. Role "${req.user.role}" is not authorized for this resource.`
      )
    );
  }

  next();
};

export const requireAdmin = requireRole('admin');
export const requireParticipant = requireRole('participant');
