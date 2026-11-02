import { errorResponse } from '../utils/response.js';

/**
 * 404 Handler for undefined routes.
 */
export const notFound = (req, res) => {
  return errorResponse(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
};

export default notFound;
