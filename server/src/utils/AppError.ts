export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = 'BAD_REQUEST') {
    return new AppError(400, code, message);
  }
  static unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    return new AppError(401, code, message);
  }
  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new AppError(403, code, message);
  }
  static notFound(message = 'Not found', code = 'NOT_FOUND') {
    return new AppError(404, code, message);
  }
  static conflict(message: string, code = 'CONFLICT') {
    return new AppError(409, code, message);
  }
  static tooManyRequests(message = 'Too many requests', code = 'RATE_LIMITED') {
    return new AppError(429, code, message);
  }
  static internal(message = 'Internal server error', code = 'INTERNAL_ERROR') {
    return new AppError(500, code, message);
  }
}
