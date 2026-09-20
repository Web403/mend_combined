import { Response } from "express";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../core/utils/ApiResponse";
import { getString } from "../../core/utils/string.helper";
import { ReviewRelationship, UserRole } from "../../shared/enums";
import { AuthRole } from "../../shared/enums/common";
import type { CreateReviewInput, ReviewActor } from "../../shared/interfaces";
import { ReviewService } from "./review.service";

const service = new ReviewService();

/**
 * Builds the review actor exclusively from the verified JWT.
 *
 * Nothing here can be influenced by the request body: the previous controller
 * spread `req.body` *after* the token-derived identity, which let any client
 * claim an arbitrary `userId` / `postedBy`. That override is gone.
 */
function toActor(req: AuthenticatedRequest): ReviewActor {
  return {
    id: String(req.user?.id ?? ""),
    roles: req.user?.roles ?? [],
    role: req.user?.roles?.[0] as UserRole | undefined,
    hotelId: req.user?.hotelId,
  };
}

/**
 * Copies only the client-controlled *content* of a create request.
 *
 * An explicit allowlist (rather than a body spread) is what stops mass
 * assignment of `userId`, `postedBy`, `revieweeRef`, `bookingId`, `id` and any
 * future privileged field.
 */
function toCreateInput(body: any): CreateReviewInput {
  return {
    reviewRelationship: getString(body?.reviewRelationship) as
      | ReviewRelationship
      | undefined,
    revieweeId: getString(body?.revieweeId),
    hotelId: getString(body?.hotelId),
    gigId: getString(body?.gigId),
    jobId: getString(body?.jobId),
    rating: body?.rating,
    review: body?.review,
    feedbackRating: body?.feedbackRating,
    feedbackReview: body?.feedbackReview,
    reviewType: getString(body?.reviewType) as any,
  };
}

/**
 * Resolves the hotel scope for hotel-owned reads.
 *
 * Derived from the token: a hotel staff user is scoped to `User.hotelId`, and a
 * hotel account (whose JWT subject *is* the hotel) is scoped to itself. A
 * client-supplied `X-Hotel-Id` can never widen that scope.
 */
function resolveHotelScope(req: AuthenticatedRequest): string | undefined {
  const roles = req.user?.roles ?? [];
  if (roles.includes(AuthRole.HOTEL)) {
    return req.user?.id;
  }
  return req.user?.hotelId;
}

/**
 * Maps any thrown value onto the module's HTTP contract without leaking
 * internals: known 4xx messages are returned verbatim, everything else becomes a
 * generic 500.
 */
function respondWithError(res: Response, error: any): Response {
  const status =
    typeof error?.httpStatus === "number"
      ? error.httpStatus
      : typeof error?.statusCode === "number"
        ? error.statusCode
        : 500;

  const message =
    status >= 500
      ? "Unable to process the review request"
      : error?.message || "Request failed";

  return res.status(status).json(errorResponse(message));
}

export class ReviewController {
  async createReview(req: AuthenticatedRequest, res: Response) {
    try {
      const review = await service.createReview(
        toActor(req),
        toCreateInput(req.body),
      );
      return res.status(201).json(successResponse(review, "Review added"));
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  async getUserPostedGigReviews(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id as string;

      const reviews = await service.getUserPostedGigReviews(userId);

      return res.status(200).json(successResponse(reviews));
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  async getUserFeedbackGigReviews(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id as string;

      const reviews = await service.getUserFeedbackGigReviews(userId);

      return res.status(200).json(successResponse(reviews));
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  async getGigReviewsForHotel(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId = resolveHotelScope(req) as string;

      const reviews = await service.getGigReviewsForHotel(hotelId);

      return res.status(200).json(successResponse(reviews));
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  async getHotelsWithReviews(
    req: AuthenticatedRequest,
    res: Response
) {
    try {
        const searchQuery = req.query.search as string | undefined;

        const reviews = await service.getHotelsWithReviews(searchQuery);

        return res.status(200).json(successResponse(reviews));
    } catch (error: any) {
        return respondWithError(res, error);
    }
}

  async getGigReviewsPostedByHotel(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId = resolveHotelScope(req) as string;
      const reviews = await service.getGigReviewsPostedByHotel(hotelId);
      return res.status(200).json(successResponse(reviews));
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  /**
   * GET /review/get-user-received-reviews
   *
   * Reviews where the *caller* is the reviewee. The subject id always comes from
   * the token, so one user cannot read the reviews written about another.
   */
  async getUserReceivedReviews(req: AuthenticatedRequest, res: Response) {
    try {
      const revieweeId = req.user?.id as string;
      const relationship = getString(req.query.reviewRelationship) as
        | ReviewRelationship
        | undefined;
      const hotelId = getString(req.query.hotelId);

      const result = await service.getUserReceivedReviews(revieweeId, {
        reviewRelationship:
          relationship &&
          Object.values(ReviewRelationship).includes(relationship)
            ? relationship
            : undefined,
        hotelId,
      });

      return res
        .status(200)
        .json(
          successResponse(result.reviews, "Success", {
            total: result.total,
          }),
        );
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }

  /**
   * GET /review/get-hotel-rating-summary
   *
   * Aggregate hotel rating (average, total, 1–5 distribution, split by
   * relationship). Contains no personal data and no individual review content,
   * so it is readable for any existing hotel — workers need it to compare
   * hotels. Defaults to the caller's own hotel.
   */
  async getHotelRatingSummary(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId =
        getString(req.query.hotelId) ?? resolveHotelScope(req) ?? "";

      const summary = await service.getHotelRatingSummary(hotelId);

      return res.status(200).json(successResponse(summary));
    } catch (error: any) {
      return respondWithError(res, error);
    }
  }
}
