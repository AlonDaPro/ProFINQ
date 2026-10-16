import type { ErrorCode } from '../constants/errorCode.js';

export interface ApiErrorDetail {
  path: string;
  message: string;
}

/** Every error response has this shape: `{ "error": { "code", "message", "details?" } }`. */
export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
}

export function errorBody(code: ErrorCode, message: string, details?: ApiErrorDetail[]): ApiErrorBody {
  return { error: details ? { code, message, details } : { code, message } };
}
