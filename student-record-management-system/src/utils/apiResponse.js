/**
 * Standardized JSON API Response utility
 */
export class ApiResponse {
  /**
   * Generic success response
   */
  static success(res, message = 'Operation completed successfully', data = {}, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  /**
   * 201 Created response
   */
  static created(res, message = 'Resource created successfully', data = {}) {
    return res.status(201).json({
      success: true,
      message,
      data
    });
  }

  /**
   * 204 No Content response
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Paginated response format matching CodSoft Task 1 specification
   */
  static paginated(res, message = 'Records retrieved successfully', items = [], pagination = {}, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data: {
        items,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          totalItems: pagination.totalItems,
          totalPages: pagination.totalPages
        }
      }
    });
  }
}

export default ApiResponse;
