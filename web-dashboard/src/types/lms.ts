export type Role = "admin" | "EMPLOYEE" | "instructor" | "learner";

export interface User {
  id: string;
  userId?: string;
  name: string;
  username?: string;
  email: string;
  phone?: string;
  role: Role;
  roles?: Role[];
  hotelId: string;
  userSecretId?: string;
  departmentType?: string;
  departmentRole?: string;
}

export enum CourseStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

export enum CourseDifficulty {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  PROFESSIONAL = "professional",
}

export enum CourseBadge {
  NEW = "new",
  POPULAR = "popular",
  UPDATED = "updated",
  FEATURED = "featured",
}

export enum EnrollmentStatus {
  APPLIED = "applied",
  ENROLLED = "enrolled",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  DROPPED = "dropped",
}

export enum QuestionType {
  MULTIPLE_CHOICE = "multiple_choice",
  TRUE_FALSE = "true_false",
  ORDERING = "ordering",
  MULTI_SELECT = "multi_select",
}

export enum ContentBlockType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  EMBED = "embed",
  CALLOUT = "callout",
  LIST = "list",
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string | null;
  hotel: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Module {
  _id: string;
  course: string;
  hotel: string;
  title: string;
  slug: string;
  description?: string;
  orderIndex: number;
  totalLessons: number;
  totalQuizQuestions: number;
  isActive: boolean;
  estimatedDurationMinutes: number;
  lectures?: Lecture[];
  assessment?: Assessment;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  _id: string;
  title: string;
  slug: string;
  category: Category | string;
  hotel: string;
  description?: string;
  coverImage?: string | null;
  icon?: string | null;
  totalModules: number;
  totalQuizQuestions: number;
  learningOutcomes: string[];
  tags: string[];
  badge?: CourseBadge | null;
  status: CourseStatus;
  isActive: boolean;
  sortOrder: number;
  difficulty: CourseDifficulty;
  estimatedDurationMinutes: number;
  createdBy?: string | null;
  publishedAt?: string | null;
  modules?: Module[];
  createdAt: string;
  updatedAt: string;
}

export interface ContentBlock {
  blockType: ContentBlockType;
  content: string;
  caption?: string;
  orderIndex: number;
  metadata?: Record<string, any>;
}

export interface LessonStep {
  stepNumber: number;
  text: string;
}

export interface Lecture {
  _id: string;
  module: string;
  course: string;
  hotel: string;
  title: string;
  slug: string;
  orderIndex: number;
  difficulty: CourseDifficulty;
  content: string;
  steps: LessonStep[];
  keyFigures: string[];
  contentBlocks: ContentBlock[];
  isActive: boolean;
  estimatedDurationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface LectureNavigation {
  lecture: Lecture;
  previous: Pick<Lecture, "_id" | "title"> | null;
  next: Pick<Lecture, "_id" | "title"> | null;
  currentIndex: number;
  totalLectures: number;
}

export interface QuestionOption {
  optionId: string;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface AssessmentQuestion {
  _id: string;
  assessment: string;
  module: string;
  course: string;
  hotel: string;
  questionText: string;
  questionType: QuestionType;
  options: QuestionOption[];
  correctOrder: string[];
  explanation?: string;
  orderIndex: number;
  points: number;
  isActive: boolean;
}

export interface Assessment {
  _id: string;
  module: string;
  course: string;
  hotel: string;
  title: string;
  slug: string;
  totalQuestions: number;
  passingPercentage: number;
  maxAttempts: number;
  timeLimitMinutes: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showExplanationAfterSubmit: boolean;
  isActive: boolean;
  questions?: AssessmentQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface AttemptAnswer {
  question: string | AssessmentQuestion;
  selectedOptionIds: string[];
  isCorrect: boolean;
  pointsEarned: number;
}

export interface AssessmentAttempt {
  _id: string;
  user: string;
  assessment: string | Assessment;
  module: string;
  course: string | Course;
  hotel: string;
  attemptNumber: number;
  answers: AttemptAnswer[];
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  passed: boolean;
  startedAt: string;
  completedAt?: string | null;
  timeTakenSeconds: number;
}

export interface Enrollment {
  _id: string;
  user: { _id: string; firstName?: string; lastName?: string; email?: string; avatar?: string } | string;
  course: Course | string;
  hotel: string;
  status: EnrollmentStatus;
  enrolledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  progressPercentage: number;
  completedModules: string[];
  completedLectures: string[];
  lastAccessedModule?: string | null;
  lastAccessedLecture?: string | null;
  lastAccessedAt?: string | null;
  certificateUrl?: string | null;
  certificateIssuedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Certificate {
  _id: string;
  user: { _id: string; firstName?: string; lastName?: string; email?: string } | string;
  course: { _id: string; title: string; slug: string; coverImage?: string } | string;
  enrollment: string;
  hotel: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate?: string | null;
  certificateUrl: string;
  metadata?: Record<string, any>;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
