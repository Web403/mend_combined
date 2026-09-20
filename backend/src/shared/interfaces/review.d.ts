import { Types } from "mongoose";
import { ReviewRelationship, ReviewType, RevieweeRef, UserRole } from "../enums";

export interface IReview {
  id: string;

  /**
   * The reviewer — always the authenticated user. Never taken from the request
   * body.
   */
  userId: Types.ObjectId;
  /** Snapshot of the reviewer's role at creation time. */
  postedBy: UserRole;

  /**
   * Who / what is being reviewed. Points at `User` or `Hotel` depending on
   * `revieweeRef`. Absent on documents created before the relationship model
   * was introduced.
   */
  revieweeId?: Types.ObjectId;
  revieweeRef?: RevieweeRef;
  /** Snapshot of the reviewee's role when `revieweeRef === "User"`. */
  revieweeRole?: UserRole;
  /** Authoritative reviewer → reviewee discriminator. */
  reviewRelationship?: ReviewRelationship;

  // ── Context ────────────────────────────────────────────────────────────────
  hotelId: Types.ObjectId;
  gigId?: Types.ObjectId;
  jobId?: Types.ObjectId;
  /**
   * The gig assignment (Booking) that justifies a gig-scoped review — the
   * auditable proof that the reviewer and reviewee actually worked together.
   */
  bookingId?: Types.ObjectId;
  reviewType: ReviewType;

  // ── Payload ────────────────────────────────────────────────────────────────
  rating?: number;
  feedbackRating?: number;
  review?: string;
  feedbackReview?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * The authenticated identity a review operation is performed as.
 * Built exclusively from the JWT by the controller — a client can never supply
 * or override any of these values.
 */
export interface ReviewActor {
  id: string;
  role?: UserRole;
  hotelId?: string;
  roles?: string[];
}

/** Client-supplied part of a create request (identity excluded on purpose). */
export interface CreateReviewInput {
  reviewRelationship?: ReviewRelationship;
  revieweeId?: string;
  hotelId?: string;
  gigId?: string;
  jobId?: string;
  rating?: unknown;
  review?: unknown;
  feedbackRating?: unknown;
  feedbackReview?: unknown;
  reviewType?: ReviewType;
}

/** Result of resolving + validating a review request against the rule table. */
export interface ResolvedReviewContext {
  reviewRelationship: ReviewRelationship;
  reviewType: ReviewType;
  userId: Types.ObjectId;
  postedBy: UserRole;
  revieweeId: Types.ObjectId;
  revieweeRef: RevieweeRef;
  revieweeRole?: UserRole;
  hotelId: Types.ObjectId;
  gigId?: Types.ObjectId;
  bookingId?: Types.ObjectId;
  jobId?: Types.ObjectId;
  rating?: number;
  review?: string;
  feedbackRating?: number;
  feedbackReview?: string;
}

export interface ReviewListOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  filters?: ReviewListFilters;
}

export interface ReviewListFilters {
  reviewType?: ReviewType;
  reviewRelationship?: ReviewRelationship;
  rating?: number;
  feedbackRating?: number;
  postedBy?: UserRole;
  revieweeRole?: UserRole;
  gigId?: string;
  hotelId?: string;
}

export interface HotelRatingSummaryBucket {
  reviewRelationship: ReviewRelationship | "LEGACY";
  totalReviews: number;
  averageRating: number | null;
}

export interface HotelRatingSummary {
  hotelId: string;
  totalReviews: number;
  ratedReviews: number;
  averageRating: number | null;
  /** Count of reviews per star value, keys "1".."5". */
  distribution: Record<string, number>;
  byRelationship: HotelRatingSummaryBucket[];
}
