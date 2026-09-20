import mongoose from "mongoose";
import {
  BookingStatus,
  RevieweeRef,
  ReviewRelationship,
  ReviewType,
  UserRole,
  UserStatus,
} from "../../shared/enums";
import type {
  CreateReviewInput,
  ResolvedReviewContext,
  ReviewActor,
} from "../../shared/interfaces";
import { ReviewErrors } from "./review.error";
import {
  MongooseReviewDataGateway,
  ReviewBookingRecord,
  ReviewDataGateway,
  ReviewGigRecord,
  ReviewUserRecord,
} from "./review.gateway";
import {
  normalizeOptionalText,
  parseOptionalRating,
} from "./review.validation";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Review eligibility — the single place in the backend that decides whether a
 * reviewer may review a reviewee, and which hotel / gig / booking makes that
 * legitimate.
 *
 * Controllers and the service contain no role conditionals: everything is
 * expressed as data in REVIEW_RELATIONSHIP_RULES and executed by the validators
 * below. Role alone is never sufficient — every rule additionally requires an
 * authoritative relationship (hotel membership, or a COMPLETED gig booking)
 * resolved from the database, never from the request body.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Roles that act on behalf of a hotel organisation. */
export const HOTEL_SIDE_ROLES: UserRole[] = [UserRole.HR, UserRole.ADMIN];

/** Roles that book and work gigs through the marketplace. */
export const GIG_WORKER_ROLES: UserRole[] = [
  UserRole.STUDENT,
  UserRole.PROFESSIONAL,
];

export interface RelationshipRule {
  relationship: ReviewRelationship;
  /** Reviewer roles allowed to use this relationship. */
  reviewerRoles: UserRole[];
  revieweeRef: RevieweeRef;
  /** Required reviewee role(s) when the reviewee is a person. */
  revieweeRoles?: UserRole[];
  /** Context axis — keeps the pre-existing `reviewType` semantics intact. */
  reviewType: ReviewType;
  /** A resolved gig is mandatory. */
  requiresGig: boolean;
  /** Whose COMPLETED booking must exist for the gig: reviewer, reviewee, or none. */
  completedBookingOf: "reviewer" | "reviewee" | null;
  /** Where the authoritative hotelId comes from. */
  hotelSource: "reviewer" | "gig";
  /** The reviewer's own hotel must own the gig (hotel-side actors only). */
  reviewerMustOwnGigHotel: boolean;
  /** The reviewee is the context hotel itself (`*_TO_HOTEL`). */
  revieweeIsContextHotel: boolean;
  /** A person reviewee must belong to the context hotel. */
  revieweeMustShareContextHotel: boolean;
  /** A person reviewee must be attached to the gig (manager of the gig's hotel). */
  revieweeMustBeGigAssociated: boolean;
  /**
   * When the client omits `revieweeId`, it may be derived from the gig's
   * COMPLETED bookings — but only if exactly one exists, so the reviewee is
   * always taken from authoritative data and never guessed.
   */
  canDeriveRevieweeFromGig: boolean;
}

export const REVIEW_RELATIONSHIP_RULES: Record<
  ReviewRelationship,
  RelationshipRule
> = {
  // ── HR → Employee ──────────────────────────────────────────────────────────
  [ReviewRelationship.HR_TO_EMPLOYEE]: {
    relationship: ReviewRelationship.HR_TO_EMPLOYEE,
    reviewerRoles: HOTEL_SIDE_ROLES,
    revieweeRef: RevieweeRef.USER,
    revieweeRoles: [UserRole.EMPLOYEE],
    reviewType: ReviewType.EMPLOYMENT,
    requiresGig: false,
    completedBookingOf: null,
    hotelSource: "reviewer",
    reviewerMustOwnGigHotel: false,
    revieweeIsContextHotel: false,
    revieweeMustShareContextHotel: true,
    revieweeMustBeGigAssociated: false,
    canDeriveRevieweeFromGig: false,
  },

  // ── HR → Manager ───────────────────────────────────────────────────────────
  [ReviewRelationship.HR_TO_MANAGER]: {
    relationship: ReviewRelationship.HR_TO_MANAGER,
    reviewerRoles: HOTEL_SIDE_ROLES,
    revieweeRef: RevieweeRef.USER,
    revieweeRoles: [UserRole.MANAGER],
    reviewType: ReviewType.EMPLOYMENT,
    requiresGig: false,
    completedBookingOf: null,
    hotelSource: "reviewer",
    reviewerMustOwnGigHotel: false,
    revieweeIsContextHotel: false,
    revieweeMustShareContextHotel: true,
    revieweeMustBeGigAssociated: false,
    canDeriveRevieweeFromGig: false,
  },

  // ── HR → Student (after a COMPLETED gig) ───────────────────────────────────
  [ReviewRelationship.HR_TO_STUDENT]: {
    relationship: ReviewRelationship.HR_TO_STUDENT,
    reviewerRoles: HOTEL_SIDE_ROLES,
    revieweeRef: RevieweeRef.USER,
    revieweeRoles: GIG_WORKER_ROLES,
    reviewType: ReviewType.GIG,
    requiresGig: true,
    completedBookingOf: "reviewee",
    hotelSource: "gig",
    // HR may only review a student for a gig posted by HR's own hotel.
    reviewerMustOwnGigHotel: true,
    revieweeIsContextHotel: false,
    revieweeMustShareContextHotel: false,
    revieweeMustBeGigAssociated: false,
    canDeriveRevieweeFromGig: true,
  },

  // ── Employee → Hotel ───────────────────────────────────────────────────────
  [ReviewRelationship.EMPLOYEE_TO_HOTEL]: {
    relationship: ReviewRelationship.EMPLOYEE_TO_HOTEL,
    reviewerRoles: [UserRole.EMPLOYEE],
    revieweeRef: RevieweeRef.HOTEL,
    reviewType: ReviewType.EMPLOYMENT,
    requiresGig: false,
    completedBookingOf: null,
    // Hotel is derived from the reviewer's own membership — never from the body.
    hotelSource: "reviewer",
    reviewerMustOwnGigHotel: false,
    revieweeIsContextHotel: true,
    revieweeMustShareContextHotel: false,
    revieweeMustBeGigAssociated: false,
    canDeriveRevieweeFromGig: false,
  },

  // ── Manager → Hotel ────────────────────────────────────────────────────────
  [ReviewRelationship.MANAGER_TO_HOTEL]: {
    relationship: ReviewRelationship.MANAGER_TO_HOTEL,
    reviewerRoles: [UserRole.MANAGER],
    revieweeRef: RevieweeRef.HOTEL,
    reviewType: ReviewType.EMPLOYMENT,
    requiresGig: false,
    completedBookingOf: null,
    hotelSource: "reviewer",
    reviewerMustOwnGigHotel: false,
    revieweeIsContextHotel: true,
    revieweeMustShareContextHotel: false,
    revieweeMustBeGigAssociated: false,
    canDeriveRevieweeFromGig: false,
  },

  // ── Student → Hotel (after a COMPLETED gig) ────────────────────────────────
  [ReviewRelationship.STUDENT_TO_HOTEL]: {
    relationship: ReviewRelationship.STUDENT_TO_HOTEL,
    reviewerRoles: GIG_WORKER_ROLES,
    revieweeRef: RevieweeRef.HOTEL,
    reviewType: ReviewType.GIG,
    requiresGig: true,
    completedBookingOf: "reviewer",
    // Hotel is derived from the verified booking/gig — never from the body.
    hotelSource: "gig",
    reviewerMustOwnGigHotel: false,
    revieweeIsContextHotel: true,
    revieweeMustShareContextHotel: false,
    revieweeMustBeGigAssociated: false,
    canDeriveRevieweeFromGig: false,
  },

  // ── Student → Manager (after a COMPLETED gig) ──────────────────────────────
  [ReviewRelationship.STUDENT_TO_MANAGER]: {
    relationship: ReviewRelationship.STUDENT_TO_MANAGER,
    reviewerRoles: GIG_WORKER_ROLES,
    revieweeRef: RevieweeRef.USER,
    revieweeRoles: [UserRole.MANAGER, UserRole.ADMIN],
    reviewType: ReviewType.GIG,
    requiresGig: true,
    completedBookingOf: "reviewer",
    hotelSource: "gig",
    reviewerMustOwnGigHotel: false,
    revieweeIsContextHotel: false,
    revieweeMustShareContextHotel: false,
    revieweeMustBeGigAssociated: true,
    canDeriveRevieweeFromGig: false,
  },
};

/** Everything the engine needs to reach a verdict, injected for testability. */
export interface ReviewEligibilityDeps {
  gateway: ReviewDataGateway;
  /** Duplicate pre-check wired to the repository by `ReviewService`. */
  findExistingReview: (key: DuplicateReviewKey) => Promise<unknown | null>;
}

/** The tuple the partial unique index enforces at database level. */
export interface DuplicateReviewKey {
  userId: string;
  reviewRelationship: ReviewRelationship;
  revieweeId: string;
  hotelId: string;
  gigId?: string;
}

export class ReviewEligibilityService {
  private readonly gateway: ReviewDataGateway;
  private readonly findExistingReview: ReviewEligibilityDeps["findExistingReview"];

  constructor(deps?: Partial<ReviewEligibilityDeps>) {
    this.gateway = deps?.gateway ?? new MongooseReviewDataGateway();
    this.findExistingReview =
      deps?.findExistingReview ?? (async () => null);
  }

  // ── Entry point ─────────────────────────────────────────────────────────────

  /**
   * Resolves and validates a review request end to end, returning the fully
   * server-derived context that will be persisted.
   *
   * Every identifier in the returned object comes from the authenticated actor
   * or from a database lookup. Client-supplied `hotelId`, `gigId` and
   * `revieweeId` are treated as *hints* that must agree with the derived value,
   * otherwise the request is rejected — they are never accepted as proof.
   */
  async validateReviewEligibility(
    actor: ReviewActor,
    input: CreateReviewInput,
  ): Promise<ResolvedReviewContext> {
    if (!actor?.id) {
      throw ReviewErrors.unauthenticated();
    }

    const reviewer = await this.gateway.findUserById(String(actor.id));
    this.validateReviewerAccount(reviewer);

    const relationship = await this.resolveRelationship(input, reviewer!);
    const rule = this.getRule(relationship);

    this.validateReviewerRole(reviewer!, rule);

    const { hotelId, gig, bookingOfReviewer } =
      await this.resolveContextHotel(reviewer!, input, rule);

    const { revieweeId, revieweeRole, booking } = await this.resolveReviewee(
      reviewer!,
      input,
      rule,
      hotelId,
      gig,
      bookingOfReviewer,
    );

    const payload = this.validatePayload(input);

    const context: ResolvedReviewContext = {
      reviewRelationship: relationship,
      reviewType: rule.reviewType,
      userId: new mongoose.Types.ObjectId(reviewer!._id),
      postedBy: reviewer!.role,
      revieweeId,
      revieweeRef: rule.revieweeRef,
      revieweeRole,
      hotelId: new mongoose.Types.ObjectId(hotelId),
      gigId: gig ? new mongoose.Types.ObjectId(gig._id) : undefined,
      bookingId: booking
        ? new mongoose.Types.ObjectId(booking._id)
        : undefined,
      jobId: this.parseOptionalJobId(input.jobId),
      ...payload,
    };

    await this.validateDuplicateReview(context);

    return context;
  }

  // ── Rule lookup ─────────────────────────────────────────────────────────────

  getRule(relationship: ReviewRelationship): RelationshipRule {
    const rule = REVIEW_RELATIONSHIP_RULES[relationship];
    if (!rule) {
      throw ReviewErrors.unsupportedRelationship();
    }
    return rule;
  }

  // ── Reviewer ────────────────────────────────────────────────────────────────

  /**
   * The reviewer is loaded from the database rather than trusted from the JWT:
   * a stale token must not grant a role or a hotel membership that no longer
   * exists.
   */
  private validateReviewerAccount(
    reviewer: ReviewUserRecord | null,
  ): asserts reviewer is ReviewUserRecord {
    if (!reviewer) {
      throw ReviewErrors.reviewerNotFound();
    }
    if (reviewer.status === UserStatus.SUSPENDED) {
      throw ReviewErrors.reviewerSuspended();
    }
  }

  validateReviewerRole(reviewer: ReviewUserRecord, rule: RelationshipRule) {
    if (!rule.reviewerRoles.includes(reviewer.role)) {
      throw ReviewErrors.forbiddenReviewerRole(rule.relationship);
    }
  }

  // ── Relationship resolution ─────────────────────────────────────────────────

  /**
   * Uses the explicit relationship when the client supplies a valid one,
   * otherwise infers it from the reviewer's authoritative role plus the shape of
   * the request. Inference never widens access: the resolved relationship is
   * always re-validated against the rule table.
   */
  async resolveRelationship(
    input: CreateReviewInput,
    reviewer: ReviewUserRecord,
  ): Promise<ReviewRelationship> {
    const explicit = input.reviewRelationship;
    if (explicit) {
      if (
        !Object.values(ReviewRelationship).includes(
          explicit as ReviewRelationship,
        )
      ) {
        throw ReviewErrors.unsupportedRelationship();
      }
      return explicit as ReviewRelationship;
    }

    const role = reviewer.role;
    const hasGig = !!input.gigId;
    const hasReviewee = this.isUsableId(input.revieweeId);

    if (GIG_WORKER_ROLES.includes(role)) {
      // Student → Manager when a person is named, otherwise Student → Hotel.
      return hasReviewee
        ? ReviewRelationship.STUDENT_TO_MANAGER
        : ReviewRelationship.STUDENT_TO_HOTEL;
    }

    if (HOTEL_SIDE_ROLES.includes(role)) {
      if (hasGig) {
        return ReviewRelationship.HR_TO_STUDENT;
      }
      if (!hasReviewee) {
        throw ReviewErrors.validationFailed(
          "revieweeId is required for an HR review",
        );
      }
      // No gig: the reviewee's own role decides Employee vs Manager.
      const reviewee = await this.gateway.findUserById(
        String(input.revieweeId),
      );
      if (!reviewee) {
        throw ReviewErrors.revieweeNotFound();
      }
      return reviewee.role === UserRole.MANAGER
        ? ReviewRelationship.HR_TO_MANAGER
        : ReviewRelationship.HR_TO_EMPLOYEE;
    }

    if (role === UserRole.EMPLOYEE) {
      return ReviewRelationship.EMPLOYEE_TO_HOTEL;
    }

    if (role === UserRole.MANAGER) {
      return ReviewRelationship.MANAGER_TO_HOTEL;
    }

    throw ReviewErrors.forbiddenReviewerRole("review");
  }

  // ── Context (hotel / gig / reviewer booking) ────────────────────────────────

  /**
   * Establishes the hotel the review is about.
   *
   * `hotelSource: "reviewer"` → the reviewer's own `User.hotelId` (employment).
   * `hotelSource: "gig"`      → the hotel that owns the gig (verified booking).
   *
   * A client-supplied `hotelId` that disagrees with the derived value is
   * rejected, which is what stops "submit another hotel id" attacks.
   */
  private async resolveContextHotel(
    reviewer: ReviewUserRecord,
    input: CreateReviewInput,
    rule: RelationshipRule,
  ): Promise<{
    hotelId: string;
    gig: ReviewGigRecord | null;
    bookingOfReviewer: ReviewBookingRecord | null;
  }> {
    let gig: ReviewGigRecord | null = null;
    let hotelId: string;

    if (rule.hotelSource === "gig") {
      gig = await this.validateGig(input.gigId, rule);
      hotelId = gig.hotelId;

      if (rule.reviewerMustOwnGigHotel) {
        this.validateHotelMembership(reviewer);
        if (reviewer.hotelId !== hotelId) {
          throw ReviewErrors.invalidRelationship(
            "This gig does not belong to your hotel",
          );
        }
      }
    } else {
      this.validateHotelMembership(reviewer);
      hotelId = reviewer.hotelId!;
    }

    if (this.isUsableId(input.hotelId) && String(input.hotelId) !== hotelId) {
      throw ReviewErrors.invalidRelationship(
        "The supplied hotelId does not match the hotel this review belongs to",
      );
    }

    const hotel = await this.gateway.findHotelById(hotelId);
    if (!hotel) {
      throw ReviewErrors.hotelNotFound();
    }

    // The reviewer's own completed assignment, when the reviewer is the worker.
    const bookingOfReviewer =
      gig && rule.completedBookingOf === "reviewer"
        ? await this.validateCompletedGig(reviewer._id, gig)
        : null;

    return { hotelId, gig, bookingOfReviewer };
  }

  /** Employment / organisation membership: `User.hotelId`. */
  validateHotelMembership(reviewer: ReviewUserRecord) {
    if (!reviewer.hotelId) {
      throw ReviewErrors.noHotelMembership();
    }
  }

  private async validateGig(
    gigId: unknown,
    rule: RelationshipRule,
  ): Promise<ReviewGigRecord> {
    if (rule.requiresGig && !gigId) {
      throw ReviewErrors.validationFailed(
        `gigId is required for a ${rule.relationship} review`,
      );
    }
    const gig = await this.gateway.findGigBySecondaryId(String(gigId));
    if (!gig) {
      throw ReviewErrors.gigNotFound();
    }
    return gig;
  }

  /**
   * The completion gate.
   *
   * Completion is defined by the existing system as `Booking.status ===
   * COMPLETED` — `GigStatus` has no completed value, and CONFIRMED / CANCELLED /
   * NO_SHOW must never be accepted as completion. Missing assignment and
   * incomplete assignment are reported distinctly so a client cannot probe.
   */
  async validateCompletedGig(
    workerId: string,
    gig: ReviewGigRecord,
  ): Promise<ReviewBookingRecord> {
    const booking = await this.gateway.findBooking(workerId, gig.id);

    if (!booking) {
      throw ReviewErrors.bookingNotFound();
    }

    if (booking.status !== BookingStatus.COMPLETED) {
      throw ReviewErrors.gigNotCompleted();
    }

    return booking;
  }

  // ── Reviewee ────────────────────────────────────────────────────────────────

  private async resolveReviewee(
    reviewer: ReviewUserRecord,
    input: CreateReviewInput,
    rule: RelationshipRule,
    hotelId: string,
    gig: ReviewGigRecord | null,
    bookingOfReviewer: ReviewBookingRecord | null,
  ): Promise<{
    revieweeId: mongoose.Types.ObjectId;
    revieweeRole?: UserRole;
    booking: ReviewBookingRecord | null;
  }> {
    // ── The reviewee is the hotel itself ─────────────────────────────────────
    if (rule.revieweeIsContextHotel) {
      if (
        this.isUsableId(input.revieweeId) &&
        String(input.revieweeId) !== hotelId
      ) {
        throw ReviewErrors.invalidRelationship(
          "The supplied revieweeId does not match the hotel this review belongs to",
        );
      }
      return {
        revieweeId: new mongoose.Types.ObjectId(hotelId),
        booking: bookingOfReviewer,
      };
    }

    // ── The reviewee is a person ─────────────────────────────────────────────
    let revieweeIdRaw = this.isUsableId(input.revieweeId)
      ? String(input.revieweeId)
      : undefined;

    if (!revieweeIdRaw && rule.canDeriveRevieweeFromGig && gig) {
      revieweeIdRaw = await this.deriveRevieweeFromGig(gig, reviewer);
    }

    if (!revieweeIdRaw) {
      throw ReviewErrors.validationFailed(
        `revieweeId is required for a ${rule.relationship} review`,
      );
    }

    const reviewee = await this.gateway.findUserById(revieweeIdRaw);
    if (!reviewee) {
      throw ReviewErrors.revieweeNotFound();
    }

    if (reviewee._id === reviewer._id) {
      throw ReviewErrors.invalidRelationship("You cannot review yourself");
    }

    this.validateRevieweeRole(reviewee, rule);

    if (rule.revieweeMustShareContextHotel) {
      this.validateEmploymentRelationship(reviewee, hotelId, rule);
    }

    if (rule.revieweeMustBeGigAssociated && gig) {
      this.validateManagerRelationship(reviewee, gig, rule);
    }

    // HR → Student: the student must have a COMPLETED booking on this gig.
    const booking =
      rule.completedBookingOf === "reviewee"
        ? await this.validateCompletedGig(reviewee._id, gig!)
        : bookingOfReviewer;

    return {
      revieweeId: new mongoose.Types.ObjectId(reviewee._id),
      revieweeRole: reviewee.role,
      booking,
    };
  }

  validateRevieweeRole(reviewee: ReviewUserRecord, rule: RelationshipRule) {
    if (!rule.revieweeRoles || rule.revieweeRoles.includes(reviewee.role)) {
      return;
    }
    throw ReviewErrors.invalidRelationship(
      `A ${rule.relationship} review cannot target a user with the role ${reviewee.role}`,
    );
  }

  /**
   * HR → Employee / HR → Manager: the reviewee must be a member of the very
   * same hotel the reviewer acts for. An HR user of hotel A can never review
   * staff of hotel B.
   */
  validateEmploymentRelationship(
    reviewee: ReviewUserRecord,
    hotelId: string,
    rule: RelationshipRule,
  ) {
    if (!reviewee.hotelId) {
      throw ReviewErrors.invalidRelationship(
        "The review target is not linked to any hotel",
      );
    }
    if (reviewee.hotelId !== hotelId) {
      throw ReviewErrors.invalidRelationship(
        `The review target does not belong to your hotel, so a ${rule.relationship} review is not allowed`,
      );
    }
  }

  /**
   * Student → Manager: the manager must actually be attached to the gig the
   * student completed. `Gig.postedBy` is accepted as a direct link; otherwise
   * the manager must be employed by the hotel that owns the gig. A manager of an
   * unrelated hotel is always rejected.
   */
  validateManagerRelationship(
    reviewee: ReviewUserRecord,
    gig: ReviewGigRecord,
    rule: RelationshipRule,
  ) {
    const postedTheGig =
      !!gig.postedBy &&
      mongoose.isValidObjectId(gig.postedBy) &&
      gig.postedBy === reviewee._id;

    const employedByGigHotel = reviewee.hotelId === gig.hotelId;

    if (!postedTheGig && !employedByGigHotel) {
      throw ReviewErrors.invalidRelationship(
        `That manager was not associated with this gig, so a ${rule.relationship} review is not allowed`,
      );
    }
  }

  /**
   * Derives the student from the gig's COMPLETED bookings when a hotel-side
   * client omits `revieweeId`. Only an unambiguous single match is accepted —
   * anything else must name the student explicitly.
   */
  private async deriveRevieweeFromGig(
    gig: ReviewGigRecord,
    reviewer: ReviewUserRecord,
  ): Promise<string | undefined> {
    const completed = await this.gateway.findCompletedBookingsForGig(
      gig.id,
      reviewer.hotelId ?? gig.hotelId,
    );

    if (completed.length === 0) {
      throw ReviewErrors.gigNotCompleted();
    }
    if (completed.length > 1) {
      throw ReviewErrors.validationFailed(
        "revieweeId is required: this gig has more than one completed worker",
      );
    }

    return completed[0].workerId;
  }

  // ── Payload ─────────────────────────────────────────────────────────────────

  /**
   * Rating/comment validation. At least one of the four payload fields must
   * carry content, so an empty submission is rejected rather than stored.
   */
  validatePayload(input: CreateReviewInput) {
    const rating = parseOptionalRating(input.rating, "rating");
    const feedbackRating = parseOptionalRating(
      input.feedbackRating,
      "feedbackRating",
    );
    const review = normalizeOptionalText(input.review, "review");
    const feedbackReview = normalizeOptionalText(
      input.feedbackReview,
      "feedbackReview",
    );

    if (
      rating === undefined &&
      feedbackRating === undefined &&
      review === undefined &&
      feedbackReview === undefined
    ) {
      throw ReviewErrors.validationFailed(
        "A review must include a rating, a comment, or both",
      );
    }

    return { rating, feedbackRating, review, feedbackReview };
  }

  // ── Duplicates ──────────────────────────────────────────────────────────────

  /**
   * Application-level pre-check that produces a friendly 409. The authoritative
   * guarantee is the partial unique index in `review.model.ts`, which also wins
   * the race when two identical requests arrive concurrently (the resulting
   * E11000 is mapped to the same 409 by `ReviewService`).
   */
  async validateDuplicateReview(context: ResolvedReviewContext) {
    const key: DuplicateReviewKey = {
      userId: context.userId.toString(),
      reviewRelationship: context.reviewRelationship,
      revieweeId: context.revieweeId.toString(),
      hotelId: context.hotelId.toString(),
      gigId: context.gigId?.toString(),
    };

    const existing = await this.findExistingReview(key);
    if (existing) {
      throw ReviewErrors.duplicateReview();
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private isUsableId(value: unknown): boolean {
    return (
      typeof value === "string" &&
      value.trim().length > 0 &&
      mongoose.isValidObjectId(value)
    );
  }

  /**
   * `jobId` is part of the existing schema (JOB-context reviews) and is kept as
   * an optional pass-through, but it never contributes to authorization.
   */
  private parseOptionalJobId(
    value: unknown,
  ): mongoose.Types.ObjectId | undefined {
    if (!this.isUsableId(value)) return undefined;
    return new mongoose.Types.ObjectId(String(value));
  }
}
