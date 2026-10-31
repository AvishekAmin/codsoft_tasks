import ApiError from '../utils/apiError.js';

/**
 * Role-based authorization middleware
 * @param  {...string} roles - Permitted roles (e.g. 'ADMIN', 'STAFF')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User must be authenticated first'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access forbidden: required role '${roles.join(' or ')}', but you have '${req.user.role}'`
        )
      );
    }

    next();
  };
};

export default authorize;
