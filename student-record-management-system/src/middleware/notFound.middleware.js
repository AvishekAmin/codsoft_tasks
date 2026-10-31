/**
 * Fallback 404 handler for unmatched routes.
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found: [${req.method}] ${req.originalUrl}`,
    errors: [
      {
        field: 'path',
        message: `Endpoint ${req.originalUrl} does not exist on this server`
      }
    ]
  });
};

export default notFoundHandler;
