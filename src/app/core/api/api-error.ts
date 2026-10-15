/** Error body documented in the contract: `{ statusCode, error, message, details? }`. */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly error?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static from(status: number, body: unknown): ApiError {
    const b = (body ?? {}) as { error?: string; message?: string | string[]; details?: unknown };
    const message = Array.isArray(b.message) ? b.message.join('; ') : (b.message ?? b.error);
    return new ApiError(status, message || `HTTP ${status}`, b.error, b.details);
  }
}

/** Unwraps an `openapi-fetch` result, throwing `ApiError` on failure. */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.error !== undefined || result.data === undefined) {
    if (result.response.ok) return undefined as T; // 204 No Content
    throw ApiError.from(result.response.status, result.error);
  }
  return result.data;
}
