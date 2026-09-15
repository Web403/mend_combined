export interface ApiResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

export class ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T | null;
  meta?: ApiResponseMeta;

  constructor(params: { success: boolean; message?: string; data?: T | null; meta?: ApiResponseMeta }) {
    this.success = params.success;
    this.message = params.message;
    this.data = params.data;
    this.meta = params.meta;
  }

  static success<T>(message: string, data?: T | null, meta?: ApiResponseMeta): ApiResponse<T> {
    return new ApiResponse<T>({ success: true, message, data, meta });
  }

  static error(message: string, meta?: ApiResponseMeta): ApiResponse<null> {
    return new ApiResponse<null>({ success: false, message, data: null, meta });
  }
}

export const successResponse = <T>(
  data: T | null,
  message = 'Success',
  meta?: ApiResponseMeta
): ApiResponse<T> => {
  return new ApiResponse<T>({
    success: true,
    message,
    data,
    meta
  });
};

export const errorResponse = (
  message: string,
  meta?: ApiResponseMeta
): ApiResponse<null> => {
  return new ApiResponse<null>({
    success: false,
    message,
    data: null,
    meta
  });
};

export class ApiError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode = 500, code?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
  }

  static badRequest(message: string, code?: string): ApiError {
    return new ApiError(message, 400, code);
  }

  static unauthorized(message: string, code?: string): ApiError {
    return new ApiError(message, 401, code);
  }

  static forbidden(message: string, code?: string): ApiError {
    return new ApiError(message, 403, code);
  }

  static notFound(message: string, code?: string): ApiError {
    return new ApiError(message, 404, code);
  }

  static conflict(message: string, code?: string): ApiError {
    return new ApiError(message, 409, code);
  }
}

