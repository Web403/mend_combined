// ─────────────────────────────────────────────────────────────────────────────
// src/context/AuthContext.tsx
// Provides authentication state + actions to the entire app.
// Handles:
//   - Login (admin and user flows)
//   - Silent token refresh via axios response interceptor
//   - Logout
//   - Persisting auth across page reloads (localStorage)
// ─────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import axios from "axios";
import { AuthAPI, TokenStorage } from "../api/auth.api";
import type { AuthUser, LoginPayload } from "../types/auth";

// ── Context shape ─────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean; // true while validating stored token on first mount
  adminLogin: (payload: LoginPayload) => Promise<void>;
  userLogin: (payload: LoginPayload, hotelId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Decode JWT payload (no signature verification — server validates) ──────────

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split(".")[1];
    if (!base64) return null;
    return JSON.parse(atob(base64.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload["exp"] !== "number") return true;
  // Add 30s buffer so we refresh slightly before actual expiry
  return payload["exp"] * 1000 < Date.now() + 30_000;
}

function buildUserFromToken(token: string, hotelId?: string | null): AuthUser | null {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const roles = (payload["roles"] as string[]) ?? [];
  return {
    email: (payload["email"] as string) ?? "",
    role: roles[0] ?? "UNKNOWN",
    hotelId: (payload["hotelId"] as string) ?? hotelId ?? undefined,
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Used by the axios interceptor to avoid refresh loop
  const isRefreshing = useRef(false);
  const refreshSubscribers = useRef<Array<(token: string) => void>>([]);

  // ── Restore session from localStorage on mount ──────────────────────────────

  useEffect(() => {
    const token = TokenStorage.getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    if (!isTokenExpired(token)) {
      setUser(buildUserFromToken(token, TokenStorage.getHotelId()));
      setIsLoading(false);
      return;
    }

    // Token is expired — try silent refresh
    const refreshToken = TokenStorage.getRefreshToken();
    if (!refreshToken) {
      TokenStorage.clear();
      setIsLoading(false);
      return;
    }

    AuthAPI.refresh(refreshToken)
      .then(({ accessToken }) => {
        TokenStorage.save({ accessToken, refreshToken });
        setUser(buildUserFromToken(accessToken, TokenStorage.getHotelId()));
      })
      .catch(() => TokenStorage.clear())
      .finally(() => setIsLoading(false));
  }, []);

  // ── Axios response interceptor: 401 → silent refresh → retry ────────────────

  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response?.status !== 401 ||
          originalRequest._retried ||
          originalRequest.url?.includes("/auth/") ||
          originalRequest.url?.includes("/admin/login")
        ) {
          return Promise.reject(error);
        }

        originalRequest._retried = true;

        if (isRefreshing.current) {
          // Queue request until refresh completes
          return new Promise((resolve) => {
            refreshSubscribers.current.push((newToken: string) => {
              originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
              resolve(axios(originalRequest));
            });
          });
        }

        isRefreshing.current = true;
        const refreshToken = TokenStorage.getRefreshToken();

        if (!refreshToken) {
          handleLogout();
          return Promise.reject(error);
        }

        try {
          const { accessToken } = await AuthAPI.refresh(refreshToken);
          TokenStorage.save({ accessToken, refreshToken });
          setUser(buildUserFromToken(accessToken, TokenStorage.getHotelId()));

          // Flush queued requests
          refreshSubscribers.current.forEach((cb) => cb(accessToken));
          refreshSubscribers.current = [];

          originalRequest.headers["Authorization"] = `Bearer ${accessToken}`;
          return axios(originalRequest);
        } catch {
          handleLogout();
          return Promise.reject(error);
        } finally {
          isRefreshing.current = false;
        }
      }
    );

    return () => axios.interceptors.response.eject(interceptorId);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────────

  const adminLogin = useCallback(async (payload: LoginPayload) => {
    const tokens = await AuthAPI.adminLogin(payload);
    TokenStorage.save(tokens);
    setUser(buildUserFromToken(tokens.accessToken));
  }, []);

  const userLogin = useCallback(
    async (payload: LoginPayload, hotelId: string) => {
      const tokens = await AuthAPI.userLogin(payload, hotelId);
      TokenStorage.save(tokens, hotelId);
      setUser(buildUserFromToken(tokens.accessToken, hotelId));
    },
    []
  );

  const handleLogout = useCallback(() => {
    TokenStorage.clear();
    setUser(null);
  }, []);

  const logout = useCallback(async () => {
    // Best-effort server logout — doesn't block local clear
    const sessionId = TokenStorage.getRefreshToken();
    if (sessionId) AuthAPI.logout(sessionId).catch(() => {});
    handleLogout();
  }, [handleLogout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        adminLogin,
        userLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
