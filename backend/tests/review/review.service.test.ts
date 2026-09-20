/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests — the review service layer.
 *
 * Focuses on what the service itself owns:
 *   • translating driver/schema failures into the module's error vocabulary
 *     without leaking internals (including the E11000 race path → 409)
 *   • passing the authenticated actor straight through to the eligibility engine
 *   • the pure mapping from aggregation rows to the hotel rating summary
 *   • read-path behaviour (404 contract, filters)
 */

import mongoose from "mongoose";
import {
  ReviewService,
  mapHotelRatingSummary,
} from "../../src/modules/review/review.service";
import { ReviewRepository } from "../../src/modules/review/review.repository";
import { ReviewEligibilityService } from "../../src/modules/review/review.eligibility";
import { MongooseReviewDataGateway } from "../../src/modules/review/review.gateway";
import { ReviewError } from "../../src/modules/review/review.error";
import {
  RevieweeRef,
  ReviewRelationship,
  ReviewType,
  UserRole,
} from "../../src/shared/enums";
import type {
  ResolvedReviewContext,
  ReviewActor,
} from "../../src/shared/interfaces";

const oid = () => new mongoose.Types.ObjectId();

const actor: ReviewActor = {
  id: "507f1f77bcf86cd799439011",
  role: UserRole.EMPLOYEE,
  roles: [UserRole.EMPLOYEE],
  hotelId: "507f1f77bcf86cd799439012",
};

function resolvedContext(
  overrides: Partial<ResolvedReviewContext> = {},
): ResolvedReviewContext {
  return {
    reviewRelationship: ReviewRelationship.EMPLOYEE_TO_HOTEL,
    reviewType: ReviewType.EMPLOYMENT,
    userId: oid(),
    postedBy: UserRole.EMPLOYEE,
    revieweeId: oid(),
    revieweeRef: RevieweeRef.HOTEL,
    hotelId: oid(),
    rating: 4,
    review: "Good hotel",
    ...overrides,
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("ReviewService.createReview", () => {
  it("hands the authenticated actor and only the client content to the engine", async () => {
    const context = resolvedContext();
    const validate = jest
      .spyOn(ReviewEligibilityService.prototype, "validateReviewEligibility")
      .mockResolvedValue(context);
    jest.spyOn(ReviewRepository.prototype, "create").mockResolvedValue({} as any);

    const service = new ReviewService();
    const input = { rating: 4, review: "Good hotel", userId: "attacker" } as any;
    await service.createReview(actor, input);

    expect(validate).toHaveBeenCalledTimes(1);
    expect(validate.mock.calls[0][0]).toBe(actor);
    expect(validate.mock.calls[0][1]).toBe(input);
  });

  it("persists exactly the server-derived context", async () => {
    const context = resolvedContext();
    jest
      .spyOn(ReviewEligibilityService.prototype, "validateReviewEligibility")
      .mockResolvedValue(context);
    const create = jest
      .spyOn(ReviewRepository.prototype, "create")
      .mockResolvedValue({} as any);

    await new ReviewService().createReview(actor, { rating: 4 });

    const persisted = create.mock.calls[0][0] as any;
    expect(persisted.userId).toBe(context.userId);
    expect(persisted.revieweeId).toBe(context.revieweeId);
    expect(persisted.revieweeRef).toBe(RevieweeRef.HOTEL);
    expect(persisted.reviewRelationship).toBe(ReviewRelationship.EMPLOYEE_TO_HOTEL);
    expect(persisted.hotelId).toBe(context.hotelId);
    expect(persisted.reviewType).toBe(ReviewType.EMPLOYMENT);
    expect(persisted.postedBy).toBe(UserRole.EMPLOYEE);
    expect(persisted.id).toMatch(/^review_/);
  });
});

describe("ReviewService — persistence error mapping", () => {
  async function createFailingWith(error: any) {
    jest
      .spyOn(ReviewEligibilityService.prototype, "validateReviewEligibility")
      .mockResolvedValue(resolvedContext());
    jest.spyOn(ReviewRepository.prototype, "create").mockRejectedValue(error);

    return new ReviewService().createReview(actor, { rating: 4 });
  }

  it("maps a duplicate-key error from a lost race to 409 DUPLICATE_REVIEW", async () => {
    const e11000: any = new Error(
      "E11000 duplicate key error collection: mend.reviews index: uniq_review_relationship",
    );
    e11000.code = 11000;
    e11000.name = "MongoServerError";
    e11000.keyPattern = { userId: 1, reviewRelationship: 1 };

    await expect(createFailingWith(e11000)).rejects.toMatchObject({
      code: "DUPLICATE_REVIEW",
      httpStatus: 409,
    });
  });

  it("maps a schema validation failure to 400 without leaking the schema", async () => {
    const validationError: any = new Error("Review validation failed");
    validationError.name = "ValidationError";
    validationError.errors = { rating: { message: "Path `rating` (9) is more than maximum allowed value (5)." } };

    await expect(createFailingWith(validationError)).rejects.toMatchObject({
      code: "REVIEW_VALIDATION_FAILED",
      httpStatus: 400,
    });
  });

  it("maps a cast failure to 400 rather than a driver message", async () => {
    const castError: any = new Error(
      'Cast to ObjectId failed for value "{"$gt":""}" at path "revieweeId"',
    );
    castError.name = "CastError";

    const error = await createFailingWith(castError).catch((e) => e);
    expect(error).toBeInstanceOf(ReviewError);
    expect(error.httpStatus).toBe(400);
    expect(error.message).not.toMatch(/\$gt|CastError/);
  });

  it("maps an unexpected failure to a generic 500", async () => {
    const error = await createFailingWith(new Error("socket hang up")).catch((e) => e);
    expect(error).toBeInstanceOf(ReviewError);
    expect(error.httpStatus).toBe(500);
    expect(error.message).toBe("Unable to save the review");
    expect(error.message).not.toMatch(/socket hang up/);
  });

  it("passes a ReviewError through untouched", async () => {
    const original = new ReviewError("DUPLICATE_REVIEW", "You have already submitted this review", 409);
    await expect(createFailingWith(original)).rejects.toBe(original);
  });
});

describe("mapHotelRatingSummary", () => {
  it("returns a zeroed summary when there are no rows", () => {
    expect(mapHotelRatingSummary("hotel-1", [])).toEqual({
      hotelId: "hotel-1",
      totalReviews: 0,
      ratedReviews: 0,
      averageRating: null,
      distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
      byRelationship: [],
    });
  });

  it("aggregates across relationships and buckets legacy documents separately", () => {
    const summary = mapHotelRatingSummary("hotel-1", [
      {
        _id: ReviewRelationship.EMPLOYEE_TO_HOTEL,
        totalReviews: 2,
        ratedReviews: 2,
        ratingSum: 9,
        ratings: [4, 5],
      },
      {
        _id: "LEGACY",
        totalReviews: 3,
        ratedReviews: 2,
        ratingSum: 7,
        ratings: [3, 4, null],
      },
    ]);

    expect(summary.totalReviews).toBe(5);
    expect(summary.ratedReviews).toBe(4);
    expect(summary.averageRating).toBe(4); // (4+5+3+4) / 4
    expect(summary.distribution).toEqual({ "1": 0, "2": 0, "3": 1, "4": 2, "5": 1 });
    expect(summary.byRelationship).toEqual([
      { reviewRelationship: ReviewRelationship.EMPLOYEE_TO_HOTEL, totalReviews: 2, averageRating: 4.5 },
      { reviewRelationship: "LEGACY", totalReviews: 3, averageRating: 3.5 },
    ]);
  });

  it("ignores unrated reviews in the average but still counts them", () => {
    const summary = mapHotelRatingSummary("hotel-1", [
      {
        _id: ReviewRelationship.STUDENT_TO_HOTEL,
        totalReviews: 4,
        ratedReviews: 1,
        ratingSum: 5,
        ratings: [5, null, null, undefined as any],
      },
    ]);

    expect(summary.totalReviews).toBe(4);
    expect(summary.ratedReviews).toBe(1);
    expect(summary.averageRating).toBe(5);
  });

  it("rounds the average to two decimals", () => {
    const summary = mapHotelRatingSummary("hotel-1", [
      {
        _id: ReviewRelationship.MANAGER_TO_HOTEL,
        totalReviews: 3,
        ratedReviews: 3,
        ratingSum: 13,
        ratings: [4, 4, 5],
      },
    ]);

    expect(summary.averageRating).toBe(4.33);
  });

  it("tolerates a null/undefined row set", () => {
    expect(mapHotelRatingSummary("hotel-1", undefined as any).totalReviews).toBe(0);
  });
});

describe("ReviewService.getHotelRatingSummary", () => {
  it("rejects a hotel that does not exist", async () => {
    jest.spyOn(MongooseReviewDataGateway.prototype, "findHotelById").mockResolvedValue(null);

    await expect(new ReviewService().getHotelRatingSummary("missing")).rejects.toMatchObject({
      code: "HOTEL_NOT_FOUND",
      httpStatus: 404,
    });
  });

  it("queries by the resolved hotel id, not by raw client input", async () => {
    jest
      .spyOn(MongooseReviewDataGateway.prototype, "findHotelById")
      .mockResolvedValue({ _id: "resolved-hotel-id", name: "Hotel A" });
    const aggregate = jest
      .spyOn(ReviewRepository.prototype, "aggregateHotelRatingSummary")
      .mockResolvedValue([]);

    await new ReviewService().getHotelRatingSummary("whatever-the-client-sent");

    expect(aggregate).toHaveBeenCalledWith("resolved-hotel-id");
  });
});

describe("ReviewService.getUserReceivedReviews", () => {
  it("keeps the module's 404 contract when the caller has no reviews", async () => {
    jest
      .spyOn(ReviewRepository.prototype, "findByReviewee")
      .mockResolvedValue({ reviews: [], total: 0 });

    await expect(
      new ReviewService().getUserReceivedReviews("some-user"),
    ).rejects.toMatchObject({ code: "NO_REVIEWS", httpStatus: 404 });
  });

  it("passes the relationship and hotel filters through", async () => {
    const findByReviewee = jest
      .spyOn(ReviewRepository.prototype, "findByReviewee")
      .mockResolvedValue({ reviews: [{ id: "review_1" }] as any, total: 1 });

    await new ReviewService().getUserReceivedReviews("some-user", {
      reviewRelationship: ReviewRelationship.HR_TO_STUDENT,
      hotelId: "hotel-1",
    });

    expect(findByReviewee).toHaveBeenCalledWith("some-user", {
      filters: {
        reviewRelationship: ReviewRelationship.HR_TO_STUDENT,
        hotelId: "hotel-1",
      },
    });
  });
});

describe("ReviewService — duplicate pre-check wiring", () => {
  it("consults the repository before writing, using the index tuple", async () => {
    const context = resolvedContext({
      reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL,
      gigId: oid(),
    });
    jest
      .spyOn(ReviewEligibilityService.prototype, "validateReviewEligibility")
      .mockImplementation(async function (this: any, _actor: any, _input: any) {
        // Exercise the real duplicate check with the stubbed repository.
        await this.validateDuplicateReview(context);
        return context;
      });
    const findExisting = jest
      .spyOn(ReviewRepository.prototype, "findExistingRelationshipReview")
      .mockResolvedValue({ _id: oid(), id: "review_existing" } as any);

    await expect(
      new ReviewService().createReview(actor, { rating: 4 }),
    ).rejects.toMatchObject({ code: "DUPLICATE_REVIEW", httpStatus: 409 });

    expect(findExisting).toHaveBeenCalledWith({
      userId: context.userId.toString(),
      reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL,
      revieweeId: context.revieweeId.toString(),
      hotelId: context.hotelId.toString(),
      gigId: context.gigId!.toString(),
    });
  });
});

describe("ReviewService — hotel-scoped reads must never widen", () => {
  /**
   * Mongoose strips `undefined` from query filters, so an unscoped
   * `findByHotel(undefined)` would return every hotel's reviews. The guard turns
   * that into a 403 instead.
   */
  it.each([
    ["getGigReviewsForHotel", "getGigReviewsForHotel"],
    ["getGigReviewsPostedByHotel", "getGigReviewsPostedByHotel"],
  ])("%s rejects an empty hotel scope with 403", async (_label, method) => {
    const findByHotel = jest.spyOn(ReviewRepository.prototype, "findByHotel");

    await expect(
      (new ReviewService() as any)[method](undefined as unknown as string),
    ).rejects.toMatchObject({ code: "NO_HOTEL_SCOPE", httpStatus: 403 });
    await expect(
      (new ReviewService() as any)[method](""),
    ).rejects.toMatchObject({ code: "NO_HOTEL_SCOPE" });

    expect(findByHotel).not.toHaveBeenCalled();
  });

  it("still queries by the resolved hotel when a scope exists", async () => {
    const findByHotel = jest
      .spyOn(ReviewRepository.prototype, "findByHotel")
      .mockResolvedValue([{ id: "review_1" }] as any);

    await new ReviewService().getGigReviewsForHotel("hotel-1");

    expect(findByHotel).toHaveBeenCalledWith("hotel-1", expect.any(Object));
  });
});

describe("ReviewService — legacy read paths are unchanged", () => {
  it("getUserPostedGigReviews still queries by the reviewer only", async () => {
    const findByUser = jest
      .spyOn(ReviewRepository.prototype, "findByUser")
      .mockResolvedValue([{ id: "review_1" }] as any);

    await new ReviewService().getUserPostedGigReviews("user-1");

    expect(findByUser).toHaveBeenCalledWith("user-1", {
      filters: { postedBy: UserRole.STUDENT, reviewType: ReviewType.GIG },
    });
  });

  it("getUserFeedbackGigReviews now also matches reviews about the caller", async () => {
    const findByUserOrReviewee = jest
      .spyOn(ReviewRepository.prototype, "findByUserOrReviewee")
      .mockResolvedValue([{ id: "review_1" }] as any);

    await new ReviewService().getUserFeedbackGigReviews("user-1");

    expect(findByUserOrReviewee).toHaveBeenCalledWith("user-1", {
      filters: { postedBy: UserRole.MANAGER, reviewType: ReviewType.GIG },
    });
  });

  it("hotel read paths keep throwing NO_REVIEWS when empty", async () => {
    jest.spyOn(ReviewRepository.prototype, "findByHotel").mockResolvedValue([] as any);

    await expect(
      new ReviewService().getGigReviewsForHotel("hotel-1"),
    ).rejects.toMatchObject({ code: "NO_REVIEWS" });
    await expect(
      new ReviewService().getGigReviewsPostedByHotel("hotel-1"),
    ).rejects.toMatchObject({ code: "NO_REVIEWS" });
  });
});
