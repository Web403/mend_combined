// ─────────────────────────────────────────────────────────────────────────────
// shared/interfaces/gigs.d.ts
// ─────────────────────────────────────────────────────────────────────────────

import { IBaseDocument } from "./base.types";
import {
  GigStatus,
  BookingStatus,
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
  rating?: number;
  confirmedAt: Date;
  cancelledAt?: Date;
  completedAt?: Date;
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
  shiftPolicy?: string;
  recoveryPolicy?: string;
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
  rating?: number;
  confirmedAt: string;
  cancelledAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
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
