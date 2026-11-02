/**
 * Standard API Response envelope utilities.
 */

export const successResponse = (res, statusCode = 200, message = 'Success', data = null) => {
  const payload = {
    success: true,
    message
  };

  if (data !== null && data !== undefined) {
    payload.data = data;
  }

  return res.status(statusCode).json(payload);
};

export const paginatedResponse = (
  res,
  statusCode = 200,
  message = 'Success',
  items = [],
  pagination = { page: 1, limit: 10, totalItems: 0, totalPages: 0 }
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data: {
      items,
      pagination
    }
  });
};

export const errorResponse = (res, statusCode = 500, message = 'An error occurred', errors = null) => {
  const payload = {
    success: false,
    message
  };

  if (errors !== null && errors !== undefined) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};
