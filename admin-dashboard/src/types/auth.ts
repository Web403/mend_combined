// ─────────────────────────────────────────────────────────────────────────────
// src/types/auth.ts
// ─────────────────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  email: string;
  role: string;
  hotelId?: string;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

// Keys used in localStorage
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: "mend_access_token",
  REFRESH_TOKEN: "mend_refresh_token",
  USER: "mend_user",
  HOTEL_ID: "mend_hotel_id",
} as const;
