// ─────────────────────────────────────────────────────────────────────────────
// src/api/auth.api.ts
// Covers:
//   POST /api/v1/admin/login   → MENDADMIN login (for this dashboard)
//   POST /api/v1/auth/login    → hotel/user login
//   POST /api/v1/auth/refresh  → refresh access token
//   POST /api/v1/auth/logout   → invalidate session
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import type { AuthTokens, LoginPayload } from "../types/auth";
import { AUTH_STORAGE_KEYS } from "../types/auth";

const BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1";

// Bare axios — no interceptors, used only for auth calls
const authHttp = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export const AuthAPI = {
  /**
   * Admin login — POST /admin/login
   * Requires MENDADMIN role in the database.
   */
  async adminLogin(payload: LoginPayload): Promise<AuthTokens> {
    const res = await authHttp.post<{
      success: boolean;
      message?: string;
      data: AuthTokens | null;
    }>("/admin/login", payload);

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message ?? "Login failed");
    }
    return res.data.data;
  },

  /**
   * Hotel/User login — POST /auth/login
   * Returns accessToken, refreshToken, and role.
   */
  async userLogin(
    payload: LoginPayload,
    hotelId?: string
  ): Promise<AuthTokens & { role: string }> {
    const headers: Record<string, string> = {};
    if (hotelId) headers["X-Hotel-Id"] = hotelId;

    const res = await authHttp.post<{
      success: boolean;
      message?: string;
      data: (AuthTokens & { role: string }) | null;
    }>("/auth/login", payload, { headers });

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message ?? "Login failed");
    }
    return res.data.data;
  },

  /**
   * Refresh access token — POST /auth/refresh
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string }> {
    const res = await authHttp.post<{
      success: boolean;
      message?: string;
      data: { accessToken: string } | null;
    }>("/auth/refresh", { refreshToken });

    if (!res.data.success || !res.data.data) {
      throw new Error(res.data.message ?? "Token refresh failed");
    }
    return res.data.data;
  },

  /**
   * Logout — POST /auth/logout
   */
  async logout(sessionId: string): Promise<void> {
    await authHttp.post("/auth/logout", { sessionId }).catch(() => {
      // Best-effort — always clear local state regardless of server response
    });
  },
};

// ─── Token storage helpers ────────────────────────────────────────────────────

export const TokenStorage = {
  save(tokens: AuthTokens, hotelId?: string): void {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    if (hotelId) localStorage.setItem(AUTH_STORAGE_KEYS.HOTEL_ID, hotelId);
    // Keep legacy keys aligned so the existing axios interceptor in lms.api.ts works
    localStorage.setItem("adminToken", tokens.accessToken);
    if (hotelId) localStorage.setItem("hotelId", hotelId);
  },

  clear(): void {
    Object.values(AUTH_STORAGE_KEYS).forEach((k) =>
      localStorage.removeItem(k)
    );
    localStorage.removeItem("adminToken");
    localStorage.removeItem("hotelId");
  },

  getAccessToken(): string | null {
    return localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  },

  getRefreshToken(): string | null {
    return localStorage.getItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
  },

  getHotelId(): string | null {
    return localStorage.getItem(AUTH_STORAGE_KEYS.HOTEL_ID);
  },

  isLoggedIn(): boolean {
    return !!localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  },
};
