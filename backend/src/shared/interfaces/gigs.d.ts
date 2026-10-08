// ─────────────────────────────────────────────────────────────────────────────
// shared/interfaces/gigs.d.ts
// ─────────────────────────────────────────────────────────────────────────────

import { IBaseDocument } from "./base.types";
import {
  GigStatus,
  BookingStatus,
  GigApplicationStatus,
  RateUnit,
  JobDepartment,
  CertificationLevel,
  EmploymentType,
} from "../enums/recruitment";
import { Types } from "mongoose";

// ── Mongoose Document Shapes ──────────────────────────────────────────────────

/**
 * A short-term, time-bound work engagement posted by a Hotel.
 * Requirements: 1.1–1.10, 15.3, 17.1
 */
export interface IGig extends IBaseDocument {
  title: string;
  description: string;
  department: JobDepartment;
  slots: number;
  filledSlots: number;
  startAt: Date;
  endAt: Date;
  rateAmount: number;
  rateUnit: RateUnit;
  certificationRequired: CertificationLevel;
  requiredSkills: string[];
  status: GigStatus;
  postedBy: string;
  bookingCount: number;
  blockReason?: string;
  employmentType: EmploymentType;
}

/**
 * A record linking one Worker to one Gig.
 * Requirements: 2.1–2.4, 17.2–17.5
 */
export interface IBooking extends IBaseDocument {
  gigId: string;
  /** hotelId of the hotel that posted the gig */
  gigHotelId: Types.ObjectId;
  /** userId of the worker who booked the gig */
  workerId: Types.ObjectId;
  status: BookingStatus;
  cancelReason?: string;
  /** Rating given by the caterer / event manager to the freelancer. */
  rating?: number;
  ratingReview?: string;
  /** Rating the freelancer must submit for the caterer after completion. */
  workerRating?: number;
  workerReview?: string;
  workerRatingAt?: Date;
  /** False on legacy bookings; true for newly completed gigs. */
  workerRatingRequired?: boolean;
  /** Links the booking to the approved application that created it. */
  applicationId?: string;
  confirmedAt: Date;
  cancelledAt?: Date;
  completedAt?: Date;
}

/** A freelancer's application to one gig. */
export interface IGigApplication extends IBaseDocument {
  gigId: string;
  gigHotelId: Types.ObjectId;
  /** Identity of the gig poster; preference/block actions are scoped to them. */
  organizerId: string;
  applicantId: Types.ObjectId;
  status: GigApplicationStatus;
  coverNote?: string;
  recruiterNotes?: string;
  appliedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  bookingId?: string;
  /** Snapshot of the organizer's vote; used to rank applicants. */
  priorityVote: -1 | 0 | 1;
  isBlocked: boolean;
  blockReason?: string;
}

/** Organizer-specific freelancer reputation and block state. */
export interface IGigFreelancerPreference extends IBaseDocument {
  organizerId: string;
  hotelId: Types.ObjectId;
  workerId: Types.ObjectId;
  vote: -1 | 0 | 1;
  isBlocked: boolean;
  blockReason?: string;
  blockedAt?: Date;
  blockedBy?: string;
}

// ── Request DTOs ──────────────────────────────────────────────────────────────

export interface CreateGigDto {
  title: string;
  description: string;
  department: JobDepartment;
  slots: number;
  startAt: string;
  endAt: string;
  rateAmount: number;
  rateUnit: RateUnit;
  certificationRequired?: CertificationLevel;
  requiredSkills?: string[];
}

export interface ApplyToGigDto {
  coverNote?: string;
}

export interface ReviewGigApplicationDto {
  recruiterNotes?: string;
}

export interface VoteGigFreelancerDto {
  vote: -1 | 0 | 1;
}

export interface BlockGigFreelancerDto {
  reason: string;
}

export interface UpdateGigDto {
  title?: string;
  description?: string;
  department?: JobDepartment;
  slots?: number;
  startAt?: string;
  endAt?: string;
  rateAmount?: number;
  rateUnit?: RateUnit;
  certificationRequired?: CertificationLevel;
  requiredSkills?: string[];
}

export interface BookGigDto {
  gigId: string;
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

export interface GigResponseDto {
  id: string;
  hotelId: Types.ObjectId;
  title: string;
  description: string;
  department: JobDepartment;
  slots: number;
  filledSlots: number;
  startAt: string;
  endAt: string;
  rateAmount: number;
  rateUnit: RateUnit;
  certificationRequired: CertificationLevel;
  requiredSkills: string[];
  status: GigStatus;
  postedBy: string;
  bookingCount: number;
  blockReason?: string;
  employmentType: EmploymentType;
  createdAt: string;
  updatedAt: string;
}

export interface BookingResponseDto {
  id: string;
  hotelId: Types.ObjectId;
  gigId: string;
  gigHotelId: Types.ObjectId;
  workerId: Types.ObjectId;
  status: BookingStatus;
  cancelReason?: string;
  /** Caterer / event manager's rating of the freelancer. */
  rating?: number;
  ratingReview?: string;
  /** Freelancer's rating of the caterer, required for new completed gigs. */
  workerRating?: number;
  workerReview?: string;
  workerRatingAt?: string;
  workerRatingRequired: boolean;
  applicationId?: string;
  confirmedAt: string;
  cancelledAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GigApplicationResponseDto {
  id: string;
  hotelId: Types.ObjectId;
  gigId: string;
  gigHotelId: Types.ObjectId;
  applicantId: Types.ObjectId | Record<string, unknown>;
  status: GigApplicationStatus;
  coverNote?: string;
  recruiterNotes?: string;
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  bookingId?: string;
  priorityVote: -1 | 0 | 1;
  isBlocked: boolean;
  blockReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GigFreelancerPreferenceResponseDto {
  workerId: Types.ObjectId;
  vote: -1 | 0 | 1;
  isBlocked: boolean;
  blockReason?: string;
  blockedAt?: string;
}

// ── Query Options ─────────────────────────────────────────────────────────────

export interface GigListFilters {
  status?: GigStatus;
  department?: JobDepartment;
  certificationRequired?: CertificationLevel;
  startAfter?: Date;
  startBefore?: Date;
}

export interface GigListOptions {
  page?: number;
  limit?: number;
  filters?: GigListFilters;
}

export interface BookingListFilters {
  status?: BookingStatus;
  gigId?: string;
  workerId?: string;
}

export interface BookingListOptions {
  page?: number;
  limit?: number;
  filters?: BookingListFilters;
}

export interface GigApplicationListFilters {
  status?: GigApplicationStatus;
  applicantId?: string;
}

export interface GigApplicationListOptions {
  page?: number;
  limit?: number;
  filters?: GigApplicationListFilters;
}
