import { errorResponse } from '../utils/response.js';

/**
 * Higher-order middleware to validate incoming request data using Zod schemas.
 *
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source
 */
export const validate = (schema, source = 'body') => {
  return async (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = await schema.parseAsync(dataToValidate);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error.errors && Array.isArray(error.errors)) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return errorResponse(res, 400, 'Validation failed', formattedErrors);
      }
      next(error);
    }
  };
};

export default validate;
