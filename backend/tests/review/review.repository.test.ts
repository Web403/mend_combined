/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests — the review repository's query construction.
 *
 * `ReviewModel` is replaced with spies so the exact filter objects sent to
 * MongoDB can be asserted. This is where two subtle guarantees live:
 *   • the duplicate pre-check queries the same tuple as the unique index, using
 *     `gigId: null` so employment-scoped reviews (which store no gig) match;
 *   • the legacy read paths keep their original filters, and the "feedback"
 *     path additionally matches `revieweeId` so new documents stay discoverable.
 */

import { ReviewRepository } from "../../src/modules/review/review.repository";
import { ReviewRelationship, ReviewType } from "../../src/shared/enums";

const chain = (result: any) => {
  const query: any = {
    select: jest.fn(() => query),
    sort: jest.fn(() => query),
    skip: jest.fn(() => query),
    limit: jest.fn(() => query),
    lean: jest.fn(() => query),
    then: (resolve: any) => resolve(result),
  };
  return query;
};

let ReviewModel: any;

beforeEach(() => {
  ReviewModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn().mockResolvedValue(0),
    aggregate: jest.fn().mockResolvedValue([]),
  };
  jest.resetModules();
  jest.doMock("../../src/modules/review/review.model", () => ({ ReviewModel }));
});

afterEach(() => {
  jest.resetModules();
  jest.restoreAllMocks();
});

function loadRepository(): ReviewRepository {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ReviewRepository: Repo } = require("../../src/modules/review/review.repository");
  return new Repo();
}

describe("findExistingRelationshipReview (duplicate pre-check)", () => {
  it("queries the exact tuple the unique index enforces", async () => {
    ReviewModel.findOne.mockReturnValue(chain(null));

    await loadRepository().findExistingRelationshipReview({
      userId: "user-1",
      reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL,
      revieweeId: "hotel-1",
      hotelId: "hotel-1",
      gigId: "gig-1",
    });

    expect(ReviewModel.findOne).toHaveBeenCalledWith({
      userId: "user-1",
      reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL,
      revieweeId: "hotel-1",
      hotelId: "hotel-1",
      gigId: "gig-1",
    });
  });

  it("uses gigId: null for employment-scoped reviews so absent gigs still collide", async () => {
    ReviewModel.findOne.mockReturnValue(chain(null));

    await loadRepository().findExistingRelationshipReview({
      userId: "hr-1",
      reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
      revieweeId: "employee-1",
      hotelId: "hotel-1",
    });

    expect(ReviewModel.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ gigId: null }),
    );
  });

  it("only projects the id — the pre-check must not return review content", async () => {
    const query = chain(null);
    ReviewModel.findOne.mockReturnValue(query);

    await loadRepository().findExistingRelationshipReview({
      userId: "user-1",
      reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
      revieweeId: "employee-1",
      hotelId: "hotel-1",
    });

    expect(query.select).toHaveBeenCalledWith("_id id");
    expect(query.lean).toHaveBeenCalled();
  });
});

describe("findByUserOrReviewee (legacy feedback path)", () => {
  it("matches documents where the caller is the reviewer OR the reviewee", async () => {
    ReviewModel.find.mockReturnValue(chain([]));

    await loadRepository().findByUserOrReviewee("user-1", {
      filters: { reviewType: ReviewType.GIG },
    });

    expect(ReviewModel.find).toHaveBeenCalledWith({
      reviewType: ReviewType.GIG,
      $or: [{ userId: "user-1" }, { revieweeId: "user-1" }],
    });
  });

  it("caps the page size", async () => {
    const query = chain([]);
    ReviewModel.find.mockReturnValue(query);

    await loadRepository().findByUserOrReviewee("user-1", { limit: 5000 });

    expect(query.limit).toHaveBeenCalledWith(100);
  });
});

describe("findByReviewee", () => {
  it("filters by the reviewee and optional relationship/hotel/gig", async () => {
    ReviewModel.find.mockReturnValue(chain([]));

    await loadRepository().findByReviewee("employee-1", {
      filters: {
        reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
        hotelId: "hotel-1",
        gigId: "gig-1",
      },
    });

    expect(ReviewModel.find).toHaveBeenCalledWith({
      revieweeId: "employee-1",
      reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
      hotelId: "hotel-1",
      gigId: "gig-1",
    });
    expect(ReviewModel.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ revieweeId: "employee-1" }),
    );
  });

  it("omits filters that were not supplied", async () => {
    ReviewModel.find.mockReturnValue(chain([]));

    await loadRepository().findByReviewee("employee-1", { filters: {} });

    expect(ReviewModel.find).toHaveBeenCalledWith({ revieweeId: "employee-1" });
  });
});

describe("legacy read paths keep their original filters", () => {
  it("findByUser queries reviewType + userId only", async () => {
    ReviewModel.find.mockReturnValue(chain([]));

    await loadRepository().findByUser("user-1", {
      filters: { postedBy: "STUDENT" as any, reviewType: ReviewType.GIG },
    });

    expect(ReviewModel.find).toHaveBeenCalledWith({
      reviewType: ReviewType.GIG,
      userId: "user-1",
    });
  });

  it("findByHotel queries reviewType + hotelId only", async () => {
    ReviewModel.find.mockReturnValue(chain([]));

    await loadRepository().findByHotel("hotel-1", {
      filters: { postedBy: "HR" as any, reviewType: ReviewType.GIG },
    });

    expect(ReviewModel.find).toHaveBeenCalledWith({
      reviewType: ReviewType.GIG,
      hotelId: "hotel-1",
    });
  });
});

describe("aggregateHotelRatingSummary", () => {
  it("refuses to aggregate on a malformed hotel id", async () => {
    await expect(
      loadRepository().aggregateHotelRatingSummary("not-an-id"),
    ).resolves.toEqual([]);
    expect(ReviewModel.aggregate).not.toHaveBeenCalled();
  });

  it("matches the hotel and groups by relationship, bucketing legacy documents", async () => {
    ReviewModel.aggregate.mockResolvedValue([]);

    await loadRepository().aggregateHotelRatingSummary(
      "507f1f77bcf86cd799439011",
    );

    const pipeline = ReviewModel.aggregate.mock.calls[0][0];
    expect(pipeline[0]).toEqual({
      $match: { hotelId: expect.any(Object) },
    });
    expect(pipeline[1].$group._id).toEqual({
      $ifNull: ["$reviewRelationship", "LEGACY"],
    });
  });
});
