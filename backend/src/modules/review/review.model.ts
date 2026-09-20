import mongoose, { model, Schema } from "mongoose";
import { IReview } from "../../shared/interfaces";
import {
    RevieweeRef,
    ReviewRelationship,
    ReviewType,
    UserRole,
} from "../../shared/enums";

/**
 * Rating convention shared with the rest of the codebase
 * (`Booking.rating`, `Application.rating`, `BookingService.rateBooking`).
 */
export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;

/**
 * A single, generic review document.
 *
 * The collection intentionally stays generic: who is reviewing is
 * `userId` + `postedBy`, who is being reviewed is `revieweeId` + `revieweeRef`
 * (+ `revieweeRole` for people), and `reviewRelationship` names the direction.
 * Context is `hotelId` / `gigId` / `jobId` / `bookingId` + `reviewType`.
 *
 * All relationship fields are OPTIONAL so documents written before the
 * relationship model existed remain valid and readable — nothing is migrated,
 * rewritten or invalidated.
 */
const ReviewSchema = new Schema<IReview>(
    {
        id: { type: String, required: true, unique: true },

        // ── Reviewer (always derived from the authenticated token) ───────────
        // Indexed as the leading field of the unique tuple and of
        // { userId, reviewType, createdAt } — no separate single-field index.
        userId: {
            type: mongoose.Types.ObjectId,
            ref: "User",
            required: true,
        },
        postedBy: {
            type: String,
            enum: Object.values(UserRole),
            required: true,
        },

        // ── Reviewee ─────────────────────────────────────────────────────────
        // Indexed as the leading field of { revieweeId, reviewRelationship }.
        revieweeId: {
            type: mongoose.Types.ObjectId,
            refPath: "revieweeRef",
        },
        revieweeRef: { type: String, enum: Object.values(RevieweeRef) },
        revieweeRole: { type: String, enum: Object.values(UserRole) },
        // reviewRelationship is covered by the unique tuple and by the
        // { revieweeId, reviewRelationship } / { gigId, reviewRelationship }
        // compounds, so it is not indexed on its own.
        reviewRelationship: {
            type: String,
            enum: Object.values(ReviewRelationship),
        },

        // ── Context ──────────────────────────────────────────────────────────
        // Indexed as the leading field of { hotelId, reviewType, createdAt }.
        hotelId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Hotel",
        },
        gigId: { type: mongoose.Schema.Types.ObjectId, ref: "Gig" },
        jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job" },
        /** The Booking (gig assignment) that authorises a gig-scoped review. */
        bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
        reviewType: {
            type: String,
            enum: Object.values(ReviewType),
            required: true,
        },

        // ── Payload ──────────────────────────────────────────────────────────
        rating: {
            type: Number,
            min: REVIEW_RATING_MIN,
            max: REVIEW_RATING_MAX,
        },
        feedbackRating: {
            type: Number,
            min: REVIEW_RATING_MIN,
            max: REVIEW_RATING_MAX,
        },
        review: { type: String },
        feedbackReview: { type: String },
    },
    // Additive: existing documents simply carry no createdAt/updatedAt.
    { timestamps: true },
);

/**
 * One review per (reviewer, relationship, reviewee, hotel, gig).
 *
 * Covers every duplicate rule the product needs:
 *   HR + Employee | HR + Manager | Employee + Hotel | Manager + Hotel
 *   HR + Gig + Student | Student + Gig + Hotel | Student + Gig + Manager
 *
 * The index is PARTIAL on `reviewRelationship` existing so that documents
 * written before this field existed are excluded entirely. That makes the index
 * safe to build on a live production collection (pre-existing duplicates cannot
 * fail the build) and guarantees no historical review is invalidated.
 *
 * A duplicate loses the race → MongoDB E11000 → mapped to HTTP 409 by the
 * service, so concurrent identical submissions cannot both succeed.
 */
ReviewSchema.index(
    {
        userId: 1,
        reviewRelationship: 1,
        revieweeId: 1,
        hotelId: 1,
        gigId: 1,
    },
    {
        unique: true,
        name: "uniq_review_relationship",
        partialFilterExpression: { reviewRelationship: { $exists: true } },
    },
);

// "Reviews about me" — the reviewee side of the relationship.
ReviewSchema.index({ revieweeId: 1, reviewRelationship: 1 });

// Existing read paths: findByHotel / findByUser, both sorted by createdAt desc.
ReviewSchema.index({ hotelId: 1, reviewType: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, reviewType: 1, createdAt: -1 });

// Gig-scoped lookups (all reviews for one gig, hotel dashboard views).
ReviewSchema.index({ gigId: 1, reviewRelationship: 1 });

export const ReviewModel = model<IReview>("Review", ReviewSchema);
