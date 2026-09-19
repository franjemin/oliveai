export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function unauthorized(message = "Authentication required"): AppError {
  return new AppError(401, "unauthorized", message);
}

export function forbidden(code: string, message: string, details?: unknown): AppError {
  return new AppError(403, code, message, details);
}

export function notFound(resource: string): AppError {
  return new AppError(404, "not_found", `${resource} not found`);
}

export function conflict(code: string, message: string, details?: unknown): AppError {
  return new AppError(409, code, message, details);
}

export function unprocessable(code: string, message: string, details?: unknown): AppError {
  return new AppError(422, code, message, details);
}

export function notImplemented(code: string, message: string, details?: unknown): AppError {
  return new AppError(501, code, message, details);
}
