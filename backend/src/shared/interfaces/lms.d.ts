import { Types, Document } from "mongoose";
import {
  CourseBadge,
  CourseStatus,
  CourseDifficulty,
  EnrollmentStatus,
  QuestionType,
  ContentBlockType,
  AssessmentStatus,
} from "../enums/lms.enum";

// ─── Category ────────────────────────────────────────────
export interface ICategory {
  name: string;
  slug: string;
  description?: string;
  icon?: string | null;
  hotel: Types.ObjectId;
  isActive: boolean;
  sortOrder: number;
}

export interface ICategoryDoc extends ICategory, Document {
  createdAt: Date;
  updatedAt: Date;
}

// ─── Course ──────────────────────────────────────────────
export interface ICourse {
  title: string;
  slug: string;
  category: Types.ObjectId;
  hotel: Types.ObjectId;
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
  createdBy?: Types.ObjectId | null;
  publishedAt?: Date | null;
}

export interface ICourseDoc extends ICourse, Document {
  createdAt: Date;
  updatedAt: Date;
}

// ─── Module ──────────────────────────────────────────────
export interface IModule {
  course: Types.ObjectId;
  hotel: Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  orderIndex: number;
  totalLessons: number;
  totalQuizQuestions: number;
  isActive: boolean;
  estimatedDurationMinutes: number;
}

export interface IModuleDoc extends IModule, Document {
  createdAt: Date;
  updatedAt: Date;
}

// ─── Lesson / Lecture ────────────────────────────────────
export interface ILessonStep {
  stepNumber: number;
  text: string;
}

export interface IContentBlock {
  blockType: ContentBlockType;
  content: string;
  caption?: string;
  orderIndex: number;
  metadata?: Record<string, any>;
}

export interface ILecture {
  module: Types.ObjectId;
  course: Types.ObjectId;
  hotel: Types.ObjectId;
  title: string;
  slug: string;
  orderIndex: number;
  difficulty: CourseDifficulty;
  content: string;
  steps: ILessonStep[];
  keyFigures: string[];
  contentBlocks: IContentBlock[];
  isActive: boolean;
  estimatedDurationMinutes: number;
}

export interface ILectureDoc extends ILecture, Document {
  createdAt: Date;
  updatedAt: Date;
}

// ─── Assessment (Quiz) ──────────────────────────────────
export interface IAssessment {
  module: Types.ObjectId;
  course: Types.ObjectId;
  hotel: Types.ObjectId;
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
}

export interface IAssessmentDoc extends IAssessment, Document {
  createdAt: Date;
  updatedAt: Date;
}

// ─── Assessment Question ─────────────────────────────────
export interface IQuestionOption {
  optionId: string;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface IAssessmentQuestion {
  assessment: Types.ObjectId;
  module: Types.ObjectId;
  course: Types.ObjectId;
  hotel: Types.ObjectId;
  questionText: string;
  questionType: QuestionType;
  options: IQuestionOption[];
  correctOrder: string[];
  explanation?: string;
  orderIndex: number;
  points: number;
  isActive: boolean;
}

export interface IAssessmentQuestionDoc extends IAssessmentQuestion, Document {
  createdAt?: Date;
  updatedAt?: Date;
}

// ─── Assessment Attempt ──────────────────────────────────
export interface IAttemptAnswer {
  question: Types.ObjectId;
  selectedOptionIds: string[];
  isCorrect: boolean;
  pointsEarned: number;
}

export interface IAssessmentAttempt {
  user: Types.ObjectId;
  assessment: Types.ObjectId;
  module: Types.ObjectId;
  course: Types.ObjectId;
  hotel: Types.ObjectId;
  attemptNumber: number;
  answers: IAttemptAnswer[];
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  passed: boolean;
  startedAt: Date;
  completedAt?: Date | null;
  timeTakenSeconds: number;
}

export interface IAssessmentAttemptDoc extends IAssessmentAttempt, Document {
  createdAt: Date;
  updatedAt: Date;
}

// ─── Enrollment ──────────────────────────────────────────
export interface IEnrollment {
  user: Types.ObjectId;
  course: Types.ObjectId;
  hotel: Types.ObjectId;
  status: EnrollmentStatus;
  enrolledAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  progressPercentage: number;
  completedModules: Types.ObjectId[];
  completedLectures: Types.ObjectId[];
  lastAccessedModule?: Types.ObjectId | null;
  lastAccessedLecture?: Types.ObjectId | null;
  lastAccessedAt?: Date | null;
  certificateUrl?: string | null;
  certificateIssuedAt?: Date | null;
}

export interface IEnrollmentDoc extends IEnrollment, Document {
  createdAt: Date;
  updatedAt: Date;
}

// ─── Certificate ─────────────────────────────────────────
export interface ICertificate {
  user: Types.ObjectId;
  course: Types.ObjectId;
  enrollment: Types.ObjectId;
  hotel: Types.ObjectId;
  certificateNumber: string;
  issueDate: Date;
  expiryDate?: Date | null;
  templateUrl?: string | null;
  certificateUrl: string;
  metadata?: Record<string, any>;
}

export interface ICertificateDoc extends ICertificate, Document {
  createdAt: Date;
  updatedAt: Date;
}

// ─── Query / Filter Types ────────────────────────────────
export interface ICourseFilters {
  hotel: Types.ObjectId | string;
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

export interface IModuleFilters {
  course: string;
  hotel: Types.ObjectId | string;
  isActive?: boolean;
}

export interface ILectureFilters {
  module: string;
  course?: string;
  hotel: Types.ObjectId | string;
  isActive?: boolean;
}

export interface IEnrollmentFilters {
  user?: string;
  course?: string;
  hotel: Types.ObjectId | string;
  status?: EnrollmentStatus;
  page?: number;
  limit?: number;
}

export interface IAssessmentAttemptFilters {
  user?: string;
  assessment?: string;
  module?: string;
  course?: string;
  hotel: Types.ObjectId | string;
  passed?: boolean;
  page?: number;
  limit?: number;
}