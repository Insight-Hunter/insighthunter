// ── API response wrappers ─────────────────────────────────────────────────────
export interface ApiOk<T> {
  ok:   true;
   T;
}

export interface ApiError {
  ok?:     false;
  error:   string;
  message: string;
  issues?: { field: string; message: string }[];
}

export type ApiResponse<T> = ApiOk<T> | ApiError;

// ── Pagination ────────────────────────────────────────────────────────────────
export interface PaginatedResult<T> {
     T[];
  total:  number;
  limit:  number;
  offset: number;
}

export interface PaginationParams {
  limit?:  number;
  offset?: number;
}

// ── Date helpers ──────────────────────────────────────────────────────────────
export interface DateRange {
  start: string;   // YYYY-MM-DD
  end:   string;   // YYYY-MM-DD
}

// ── Service-to-service ────────────────────────────────────────────────────────
export interface ServiceRequest {
  orgId:   string;
  userId?: string;
}

export interface HealthResponse {
  ok:      true;
  service: string;
  ts:      string;
}
