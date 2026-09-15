// ─────────────────────────────────────────────────────────────────────────────
// src/api/lms.api.ts
// ─────────────────────────────────────────────────────────────────────────────

import axios from "axios";
import type {
  ApiResponse, Course, CourseWithLectures, Lecture, PaginationMeta,
  CreateCoursePayload, UpdateCoursePayload, CreateLecturePayload,
  UpdateLecturePayload, CourseStatus, CourseFilters,
} from "../types/lms";
import { AUTH_STORAGE_KEYS } from "../types/auth";

const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_BASE_URL ?? "http://localhost:3000/api/v1",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
  const hotelId = localStorage.getItem(AUTH_STORAGE_KEYS.HOTEL_ID);
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  if (hotelId) config.headers["X-Tenant-Id"] = hotelId;
  return config;
});

function unwrap<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success || response.data.data === null) {
    throw new Error(response.data.message ?? "Request failed");
  }
  return response.data.data as T;
}

export const CourseAPI = {
  async list(filters: CourseFilters = {}): Promise<{ courses: Course[]; meta: PaginationMeta }> {
    const params: Record<string, string | number> = {};
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.category) params.category = filters.category;
    if (filters.page) params.page = filters.page;
    params.limit = filters.limit ?? 25;
    const res = await api.get<ApiResponse<Course[]>>("/lms/courses", { params });
    if (!res.data.success || res.data.data === null) throw new Error(res.data.message ?? "Request failed");
    return { courses: res.data.data, meta: res.data.meta as PaginationMeta };
  },
  async getById(id: string): Promise<Course> {
    return unwrap(await api.get<ApiResponse<Course>>(`/lms/courses/${id}`));
  },
  async getFull(id: string): Promise<CourseWithLectures> {
    return unwrap(await api.get<ApiResponse<CourseWithLectures>>(`/lms/courses/${id}/full`));
  },
  async create(payload: CreateCoursePayload): Promise<Course> {
    return unwrap(await api.post<ApiResponse<Course>>("/lms/courses", payload));
  },
  async update(id: string, payload: UpdateCoursePayload): Promise<Course> {
    return unwrap(await api.put<ApiResponse<Course>>(`/lms/courses/${id}`, payload));
  },
  async updateStatus(id: string, status: CourseStatus): Promise<Course> {
    return unwrap(await api.patch<ApiResponse<Course>>(`/lms/courses/${id}/status`, { status }));
  },
  async delete(id: string): Promise<void> {
    await api.delete(`/lms/courses/${id}`);
  },
};

export const LectureAPI = {
  async list(courseId: string): Promise<Lecture[]> {
    return unwrap(await api.get<ApiResponse<Lecture[]>>(`/lms/courses/${courseId}/lectures`));
  },
  async getById(courseId: string, id: string): Promise<Lecture> {
    return unwrap(await api.get<ApiResponse<Lecture>>(`/lms/courses/${courseId}/lectures/${id}`));
  },
  async create(courseId: string, payload: CreateLecturePayload): Promise<Lecture> {
    return unwrap(await api.post<ApiResponse<Lecture>>(`/lms/courses/${courseId}/lectures`, payload));
  },
  async update(courseId: string, id: string, payload: UpdateLecturePayload): Promise<Lecture> {
    return unwrap(await api.put<ApiResponse<Lecture>>(`/lms/courses/${courseId}/lectures/${id}`, payload));
  },
  async delete(courseId: string, id: string): Promise<void> {
    await api.delete(`/lms/courses/${courseId}/lectures/${id}`);
  },
  async reorder(courseId: string, orderedIds: string[]): Promise<Lecture[]> {
    return unwrap(await api.patch<ApiResponse<Lecture[]>>(`/lms/courses/${courseId}/lectures/reorder`, { orderedIds }));
  },
};
