export interface ApiError {
  error: string;
  fieldErrors?: Record<string, string[]>;
}

export interface ApiSuccess<T> {
  data: T;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
