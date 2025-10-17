export interface ApiResponse<T> {
  data?: T;
  error?: boolean;
  message?: string;
  code?: string;
}

