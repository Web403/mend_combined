import { api } from "@/lib/api";
import type {
  Category,
  Course,
  Module,
  Lecture,
  LectureNavigation,
  Assessment,
  AssessmentQuestion,
  AssessmentAttempt,
  Enrollment,
  Certificate,
  CourseStatus,
  CourseDifficulty,
  CourseBadge,
  QuestionType,
  EnrollmentStatus,
  ContentBlockType,
  Paginated,
} from "@/types/lms";

// ── Categories ──────────────────────────────────────────
export const categoriesApi = {
  list: () => api.get<any, Category[]>("/lms/categories"),
  get: (id: string) => api.get<any, Category>(`/lms/categories/${id}`),
  create: (data: Partial<Category>) => api.post<any, Category>("/lms/categories", data),
  update: (id: string, data: Partial<Category>) => api.patch<any, Category>(`/lms/categories/${id}`, data),
  remove: (id: string) => api.delete<any, { success: boolean }>(`/lms/categories/${id}`),
};

// ── Courses ─────────────────────────────────────────────
export interface CourseFilters {
  category?: string;
  status?: CourseStatus;
  difficulty?: CourseDifficulty;
  badge?: CourseBadge;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const coursesApi = {
  list: (filters: CourseFilters = {}) => api.get<any, Paginated<Course>>("/lms/courses", { params: filters }),
  get: (id: string) => api.get<any, Course>(`/lms/courses/${id}`),
  getBySlug: (slug: string) => api.get<any, Course>(`/lms/courses/slug/${slug}`),
  create: (data: Partial<Course>) => api.post<any, Course>("/lms/courses", data),
  update: (id: string, data: Partial<Course>) => api.patch<any, Course>(`/lms/courses/${id}`, data),
  publish: (id: string) => api.patch<any, Course>(`/lms/courses/${id}/publish`),
  archive: (id: string) => api.patch<any, Course>(`/lms/courses/${id}/archive`),
  remove: (id: string) => api.delete<any, { success: boolean }>(`/lms/courses/${id}`),
};

// ── Modules ─────────────────────────────────────────────
export const modulesApi = {
  listByCourse: (courseId: string) => api.get<any, Module[]>(`/lms/courses/${courseId}/modules`),
  get: (id: string) => api.get<any, Module>(`/lms/modules/${id}`),
  create: (data: { courseId: string; title: string; description?: string; estimatedDurationMinutes?: number }) =>
    api.post<any, Module>("/lms/modules", data),
  update: (id: string, data: Partial<Module>) => api.patch<any, Module>(`/lms/modules/${id}`, data),
  reorder: (courseId: string, moduleOrders: { moduleId: string; orderIndex: number }[]) =>
    api.patch<any, { success: boolean }>(`/lms/courses/${courseId}/modules/reorder`, { moduleOrders }),
  remove: (id: string) => api.delete<any, { success: boolean }>(`/lms/modules/${id}`),
};

// ── Lectures ────────────────────────────────────────────
export const lecturesApi = {
  listByModule: (moduleId: string) => api.get<any, Lecture[]>(`/lms/modules/${moduleId}/lectures`),
  get: (id: string) => api.get<any, LectureNavigation>(`/lms/lectures/${id}`),
  create: (data: Partial<Lecture> & { module: string; course: string; title: string; content: string }) =>
    api.post<any, Lecture>("/lms/lectures", data),
  update: (id: string, data: Partial<Lecture>) => api.patch<any, Lecture>(`/lms/lectures/${id}`, data),
  reorder: (moduleId: string, lectureOrders: { lectureId: string; orderIndex: number }[]) =>
    api.patch<any, { success: boolean }>(`/lms/modules/${moduleId}/lectures/reorder`, { lectureOrders }),
  remove: (id: string) => api.delete<any, { success: boolean }>(`/lms/lectures/${id}`),
};

// ── Assessments ─────────────────────────────────────────
export const assessmentsApi = {
  get: (id: string, includeQuestions = true) =>
    api.get<any, Assessment>(`/lms/assessments/${id}`, { params: { includeQuestions } }),
  getByModule: (moduleId: string) => api.get<any, Assessment>(`/lms/modules/${moduleId}/assessment`),
  create: (data: {
    moduleId: string;
    courseId: string;
    title: string;
    passingPercentage?: number;
    maxAttempts?: number;
    timeLimitMinutes?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showExplanationAfterSubmit?: boolean;
  }) => api.post<any, Assessment>("/lms/assessments", data),
  update: (id: string, data: Partial<Assessment>) => api.patch<any, Assessment>(`/lms/assessments/${id}`, data),
  remove: (id: string) => api.delete<any, { success: boolean }>(`/lms/assessments/${id}`),
};

// ── Questions ───────────────────────────────────────────
export const questionsApi = {
  list: (assessmentId: string) => api.get<any, AssessmentQuestion[]>(`/lms/assessments/${assessmentId}/questions`),
  add: (data: {
    assessmentId: string;
    questionText: string;
    questionType?: QuestionType;
    options: { text: string; isCorrect: boolean }[];
    correctOrder?: string[];
    explanation?: string;
    points?: number;
  }) => api.post<any, AssessmentQuestion>("/lms/assessments/questions", data),
  addBulk: (
    assessmentId: string,
    questions: {
      questionText: string;
      questionType?: QuestionType;
      options: { text: string; isCorrect: boolean }[];
      correctOrder?: string[];
      explanation?: string;
      points?: number;
    }[]
  ) => api.post<any, AssessmentQuestion[]>(`/lms/assessments/${assessmentId}/questions/bulk`, { questions }),
  update: (id: string, data: Partial<AssessmentQuestion>) =>
    api.patch<any, AssessmentQuestion>(`/lms/assessments/questions/${id}`, data),
  remove: (id: string) => api.delete<any, { success: boolean }>(`/lms/assessments/questions/${id}`),
};

// ── Quiz Taking (Learner) ───────────────────────────────
export const quizApi = {
  start: (assessmentId: string) =>
    api.post<any, { assessment: Assessment; questions: any[]; attemptNumber: number }>(
      `/lms/assessments/${assessmentId}/start`,
      {}
    ),
  submit: (data: { assessmentId: string; answers: { questionId: string; selectedOptionIds: string[] }[] }) =>
    api.post<any, AssessmentAttempt>("/lms/assessments/submit", data),
  attempt: (attemptId: string) => api.get<any, AssessmentAttempt>(`/lms/assessments/attempts/${attemptId}`),
  myAttempts: (assessmentId: string) =>
    api.get<any, { attempts: AssessmentAttempt[]; total: number }>(`/lms/assessments/${assessmentId}/my-attempts`),
};

// ── Enrollments ─────────────────────────────────────────
export const enrollmentsApi = {
  apply: (courseId: string) => api.post<any, Enrollment>(`/lms/courses/${courseId}/apply`, {}),
  approve: (id: string) => api.patch<any, Enrollment>(`/lms/enrollments/${id}/approve`, {}),
  start: (courseId: string) => api.post<any, Enrollment>(`/lms/courses/${courseId}/start`, {}),
  completeLecture: (lectureId: string) => api.post<any, Enrollment>(`/lms/lectures/${lectureId}/complete`, {}),
  myEnrollments: (status?: EnrollmentStatus, page = 1, limit = 20) =>
    api.get<any, Paginated<Enrollment>>("/lms/enrollments/me", { params: { status, page, limit } }),
  get: (id: string) => api.get<any, Enrollment>(`/lms/enrollments/${id}`),
  byCourse: (courseId: string, status?: EnrollmentStatus, page = 1, limit = 20) =>
    api.get<any, Paginated<Enrollment>>(`/lms/courses/${courseId}/enrollments`, { params: { status, page, limit } }),
  drop: (courseId: string) => api.post<any, Enrollment>(`/lms/courses/${courseId}/drop`, {}),
};

// ── Certificates ────────────────────────────────────────
export const certificatesApi = {
  byUser: (userId: string) => api.get<any, Certificate[]>(`/certificates/user/${userId}`),
  byNumber: (certNumber: string) => api.get<any, Certificate>(`/certificates/${certNumber}`),
};

// re-export the enum-like union types for convenience
export type { ContentBlockType };
