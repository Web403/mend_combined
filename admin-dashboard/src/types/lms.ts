// ─────────────────────────────────────────────────────────────────────────────
// src/types/lms.ts — mirrors shared/interfaces/lms.d.ts from backend
// ─────────────────────────────────────────────────────────────────────────────

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type CourseCategory =
  | "Food & Beverage"
  | "Housekeeping"
  | "Front Office"
  | "Compliance"
  | "Safety"
  | "Leadership"
  | "Customer Service"
  | "Other";

export const COURSE_STATUSES: CourseStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
export const COURSE_CATEGORIES: CourseCategory[] = [
  "Food & Beverage",
  "Housekeeping",
  "Front Office",
  "Compliance",
  "Safety",
  "Leadership",
  "Customer Service",
  "Other",
];

export interface Course {
  id: string;
  hotelId: string;
  title: string;
  description: string;
  category: CourseCategory;
  thumbnailUrl?: string;
  createdBy: string;
  status: CourseStatus;
  lectureCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lecture {
  id: string;
  hotelId: string;
  courseId: string;
  title: string;
  description?: string;
  videoUrl: string;
  duration: number; // seconds
  notes?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseWithLectures extends Course {
  lectures: Lecture[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  meta?: PaginationMeta;
}

// Form DTOs
export interface CreateCoursePayload {
  title: string;
  description: string;
  category: CourseCategory;
  thumbnailUrl?: string;
  createdBy: string;
}

export interface UpdateCoursePayload {
  title?: string;
  description?: string;
  category?: CourseCategory;
  thumbnailUrl?: string;
}

export interface CreateLecturePayload {
  title: string;
  description?: string;
  videoUrl: string;
  duration: number;
  notes?: string;
}

export interface UpdateLecturePayload {
  title?: string;
  description?: string;
  videoUrl?: string;
  duration?: number;
  notes?: string;
}

export interface CourseFilters {
  status?: CourseStatus | "";
  category?: CourseCategory | "";
  search?: string;
  page?: number;
  limit?: number;
}
