import ApiResponse from '../utils/apiResponse.js';

/**
 * Middleware factory to validate request parts (body, query, params) against Zod schemas.
 * Accepts either a raw Zod schema with { body, query, params } in its shape, or an object with schemas.
 * @param {object} schemaOrSchemas - Object with optional { body, query, params } Zod schemas
 */
export const validate = (schemaOrSchemas = {}) => {
  return async (req, res, next) => {
    try {
      const shape = schemaOrSchemas.shape || schemaOrSchemas;

      if (shape.params) {
        req.params = await shape.params.parseAsync(req.params);
      }
      if (shape.query) {
        req.query = await shape.query.parseAsync(req.query);
      }
      if (shape.body) {
        req.body = await shape.body.parseAsync(req.body);
      }

      next();
    } catch (error) {
      if (error.errors && Array.isArray(error.errors)) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: formattedErrors
        });
      }

      next(error);
    }
  };
};

export default validate;
