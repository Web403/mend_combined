// api.ts
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken, hotelId } = useAuthStore.getState();
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (hotelId) config.headers["X-Hotel-Id"] = hotelId;
  return config;
});

// Known list-endpoint array keys → normalize to `data`.
// Add to this list whenever a new paginated endpoint is introduced.
const LIST_ARRAY_KEYS = [
  "courses",
  "enrollments",
  "categories",
  "modules",
  "lectures",
  "questions",
  "certificates",
  "attempts",
];

api.interceptors.response.use(
  (response) => {
    const body = response.data;

    // Not our { success, message, data } envelope — pass through untouched
    if (!body || typeof body !== "object" || !("data" in body)) return body;

    const payload = body.data;

    // Only flatten collection envelopes. A single resource can contain populated
    // arrays (for example, a course contains `modules`) which must remain on it.
    if (payload && typeof payload === "object" && !Array.isArray(payload) && !("_id" in payload)) {
      const key = LIST_ARRAY_KEYS.find(
        (k) => Array.isArray((payload as any)[k])
      );
      if (key) {
        // { courses: [...], total, page, totalPages } → { data: [...], total, page, totalPages }
        const { [key]: list, ...rest } = payload as Record<string, any>;
        return { ...rest, data: list };
      }
    }

    return payload;
  },
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (window.location.pathname !== "/login") {
        // window.location.href = "/login";
      }
    }
    const message = error.response?.data?.message || error.message || "Request failed";
    return Promise.reject(new Error(message));
  }
);
