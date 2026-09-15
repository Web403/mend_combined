// ─────────────────────────────────────────────────────────────────────────────
// shared/interfaces/recruitment.d.ts
// ─────────────────────────────────────────────────────────────────────────────

import { IBaseDocument } from "./base.types";
import {
  JobStatus,
  JobDepartment,
  EmploymentType,
  ApplicationStatus,
  CertificationLevel,
} from "../enums/recruitment";
import { Types } from "mongoose";

// ── Mongoose Document Shapes ──────────────────────────────────────────────────

/**
 * A job posting created by a hotel (FR53, FR54).
 * Extends the existing stub with full fields.
 */
export interface IJob extends IBaseDocument {
  // ── Core ──────────────────────────────────────────────────────────────────
  title: string;
  description: string;
  department: JobDepartment;
  employmentType: EmploymentType;
  vacancies: number;

  // ── Compliance display fields (FR54) ──────────────────────────────────────
  /** Human-readable shift policy e.g. "Max 10 hours/day, 5 days/week" */
  shiftPolicy: string;
  /** Human-readable recovery policy e.g. "Minimum 14 hours between shifts" */
  recoveryPolicy: string;
  /** Minimum Mend certification level required to apply */
  certificationRequired: CertificationLevel;

  // ── Requirements ──────────────────────────────────────────────────────────
  requiredSkills: string[];
  experienceRequired: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;

  // ── Status & audit ────────────────────────────────────────────────────────
  status: JobStatus;
  /** ISO date string — when the posting expires */
  expiresAt?: Date;
  postedBy: string;   // userId of the HR/Admin who posted
  /** Denormalized count for fast reads */
  applicationCount: number;
  /** Reason stored when a job is blocked (FR59, FR61) */
  blockReason?: string;
}

/**
 * A candidate's application to a job (FR55).
 */
export interface IApplication extends IBaseDocument {
  jobId: string;
  /** hotelId of the hotel that posted the job */
  jobHotelId: string;
  /** userId of the applicant */
  applicantId: Types.ObjectId;
  status: ApplicationStatus;
  /** Optional cover note from the candidate */
  coverNote?: string;
  /** Recruiter's internal notes — never exposed to the candidate */
  recruiterNotes?: string;
  /** 0–100 ranking score computed from passport data (FR57) */
  rankScore: number;
  /** Star rating given by the recruiter after hire (FR58) */
  rating?: number;
  appliedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

export interface CreateJobDto {
  title: string;
  description: string;
  department: JobDepartment;
  employmentType: EmploymentType;
  vacancies: number;
  shiftPolicy: string;
  recoveryPolicy: string;
  certificationRequired: CertificationLevel;
  requiredSkills?: string[];
  experienceRequired?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  expiresAt?: string;
}

export interface UpdateJobDto {
  title?: string;
  description?: string;
  department?: JobDepartment;
  employmentType?: EmploymentType;
  vacancies?: number;
  shiftPolicy?: string;
  recoveryPolicy?: string;
  certificationRequired?: CertificationLevel;
  requiredSkills?: string[];
  experienceRequired?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  expiresAt?: string;
}

export interface ApplyJobDto {
  coverNote?: string;
}

export interface ReviewApplicationDto {
  status: ApplicationStatus;
  recruiterNotes?: string;
}

export interface RateApplicationDto {
  rating: number; // 1–5
}

// ── Query Options ─────────────────────────────────────────────────────────────

export interface JobListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: JobListFilters;
}

export interface JobListFilters {
  status?: JobStatus;
  department?: JobDepartment;
  employmentType?: EmploymentType;
  certificationRequired?: CertificationLevel;
  search?: string;
}

export interface ApplicationListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: ApplicationListFilters;
}

export interface ApplicationListFilters {
  status?: ApplicationStatus;
  jobId?: string;
  applicantId?: string;
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

export interface JobResponseDto {
  id: string;
  hotelId: Types.ObjectId;
  title: string;
  description: string;
  department: JobDepartment;
  employmentType: EmploymentType;
  vacancies: number;
  shiftPolicy: string;
  recoveryPolicy: string;
  certificationRequired: CertificationLevel;
  requiredSkills: string[];
  experienceRequired: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  status: JobStatus;
  expiresAt?: string;
  postedBy: string;
  applicationCount: number;
  blockReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationResponseDto {
  id: string;
  hotelId: Types.ObjectId;
  jobId: string;
  jobHotelId: string;
  applicantId: Types.ObjectId;
  status: ApplicationStatus;
  coverNote?: string;
  /** Only visible to recruiters */
  recruiterNotes?: string;
  rankScore: number;
  rating?: number;
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}
