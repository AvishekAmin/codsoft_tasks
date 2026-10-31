export class ApiResponse {
  static success(res, message = 'Success', data = null, statusCode = 200) {
    const payload = {
      success: true,
      message
    };
    if (data !== null && data !== undefined) {
      payload.data = data;
    }
    return res.status(statusCode).json(payload);
  }

  static created(res, message = 'Resource created successfully', data = null) {
    return ApiResponse.success(res, message, data, 201);
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static error(res, message = 'An error occurred', errors = [], statusCode = 400) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors: Array.isArray(errors) ? errors : [errors]
    });
  }
}
