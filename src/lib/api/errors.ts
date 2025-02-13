// src/lib/api/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }

  static fromError(error: unknown): ApiError {
    if (ApiError.isApiError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return new ApiError(error.message);
    }

    return new ApiError("An unknown error occurred");
  }
}

export function handleApiError(error: unknown): never {
  const apiError = ApiError.fromError(error);
  console.error("API Error:", {
    message: apiError.message,
    status: apiError.status,
    code: apiError.code,
    data: apiError.data,
  });
  throw apiError;
}
