import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, User } from "@/types/lms";

interface AuthState {
  user: User | null;
  activeRole: Role | null;
  accessToken: string | null;
  refreshToken: string | null;
  hotelId: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string | null, hotelId: string) => void;
  setActiveRole: (role: Role) => void;
  setTokens: (accessToken: string, refreshToken: string | null) => void;
  logout: () => void;
}

// Hardcoded credentials in env (Vite only exposes VITE_-prefixed vars).
// Format: VITE_USER_ADMIN=admin@mend.com:password:HOTEL_ID
// Format: VITE_USER_INSTRUCTOR=instructor@mend.com:password:HOTEL_ID
// Format: VITE_USER_LEARNER=learner@mend.com:password:HOTEL_ID
// Note: With real API authentication, these are no longer used.
// Kept for backward compatibility if needed.

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      activeRole: null,
      accessToken: null,
      refreshToken: null,
      hotelId: null,
      setAuth: (user, accessToken, refreshToken, hotelId) => set({ user, activeRole: user.role, accessToken, refreshToken, hotelId }),
      setActiveRole: (activeRole) => set({ activeRole }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      logout: () => set({ user: null, activeRole: null, accessToken: null, refreshToken: null, hotelId: null }),
    }),
    { name: "lms-auth" }
  )
);
