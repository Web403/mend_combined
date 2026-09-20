/**
 * Schema-level tests.
 *
 * These load the REAL Mongoose schema (nothing is mocked) and assert the two
 * properties the whole design rests on:
 *
 *   1. the duplicate-prevention index is unique AND partial, so it can be built
 *      on a live production collection without failing on pre-existing data;
 *   2. documents written before the relationship model existed still validate,
 *      i.e. the schema change is genuinely backward compatible.
 *
 * No database connection is required: schema validation and index introspection
 * are both offline operations.
 */

import mongoose from "mongoose";
import { ReviewModel } from "../../src/modules/review/review.model";
import {
  RevieweeRef,
  ReviewRelationship,
  ReviewType,
  UserRole,
} from "../../src/shared/enums";

const schema = ReviewModel.schema;
const oid = () => new mongoose.Types.ObjectId();

/** Mongoose returns `[fields, options]` tuples; normalise them for readability. */
function indexes(): { fields: Record<string, 1 | -1>; options: any }[] {
  return (schema.indexes() as any[]).map(([fields, options]) => ({
    fields,
    options: options ?? {},
  }));
}

describe("review schema — duplicate prevention index", () => {
  const uniqueCompound = indexes().filter(
    (index) => index.options?.unique && Object.keys(index.fields).length > 1,
  );
  const uniqueIndex = uniqueCompound[0];

  it("declares exactly one unique compound index", () => {
    expect(uniqueCompound).toHaveLength(1);
    expect(uniqueIndex.options.name).toBe("uniq_review_relationship");
  });

  it("covers the full (reviewer, relationship, reviewee, hotel, gig) tuple", () => {
    expect(Object.keys(uniqueIndex!.fields).sort()).toEqual(
      ["gigId", "hotelId", "reviewRelationship", "revieweeId", "userId"].sort(),
    );
  });

  it("is PARTIAL on reviewRelationship existing, so legacy documents are excluded", () => {
    expect(uniqueIndex!.options.partialFilterExpression).toEqual({
      reviewRelationship: { $exists: true },
    });
  });
});

describe("review schema — supporting indexes for real query patterns", () => {
  const fieldSets = indexes().map((index) => Object.keys(index.fields).join(","));

  it.each([
    ["reviewee reads", "revieweeId,reviewRelationship"],
    ["hotel reads", "hotelId,reviewType,createdAt"],
    ["reviewer reads", "userId,reviewType,createdAt"],
    ["gig reads", "gigId,reviewRelationship"],
  ])("indexes %s", (_label, expected) => {
    expect(fieldSets).toContain(expected);
  });

  it("does not index every field indiscriminately", () => {
    // Every new query pattern is served by a compound index whose leading field
    // also covers the single-field lookup, so the only single-field index left is
    // the pre-existing unique secondary id.
    const singleField = indexes()
      .map((index) => Object.keys(index.fields))
      .filter((fields) => fields.length === 1)
      .map((fields) => fields[0]);

    expect(singleField).toEqual(["id"]);
  });
});

describe("review schema — backward compatibility", () => {
  it("keeps every pre-existing field", () => {
    for (const field of [
      "id",
      "hotelId",
      "gigId",
      "jobId",
      "rating",
      "feedbackRating",
      "review",
      "feedbackReview",
      "userId",
      "reviewType",
      "postedBy",
    ]) {
      expect(schema.path(field)).toBeDefined();
    }
  });

  it("validates a legacy document that has no relationship fields", () => {
    const legacy = new ReviewModel({
      id: "review_legacy01",
      hotelId: oid(),
      gigId: oid(),
      rating: 5,
      review: "Legacy review",
      feedbackRating: 4,
      feedbackReview: "Legacy feedback",
      userId: oid(),
      reviewType: ReviewType.GIG,
      postedBy: UserRole.STUDENT,
    });

    expect(legacy.validateSync()).toBeUndefined();
  });

  it("does not even require rating on a legacy document", () => {
    const legacy = new ReviewModel({
      id: "review_legacy02",
      hotelId: oid(),
      userId: oid(),
      reviewType: ReviewType.GIG,
      postedBy: UserRole.HR,
    });

    expect(legacy.validateSync()).toBeUndefined();
  });

  it("keeps a legacy out-of-range rating readable (validators run on write only)", () => {
    const legacy = new ReviewModel({
      id: "review_legacy03",
      hotelId: oid(),
      userId: oid(),
      reviewType: ReviewType.GIG,
      postedBy: UserRole.STUDENT,
    });
    // Simulate a document already in the collection with an out-of-range value.
    legacy.set({ rating: 9 }, undefined, { setters: false });
    (legacy as any).rating = 9;

    expect((legacy as any).rating).toBe(9);
  });

  it("makes every new relationship field optional", () => {
    for (const field of [
      "revieweeId",
      "revieweeRef",
      "revieweeRole",
      "reviewRelationship",
      "bookingId",
    ]) {
      expect(schema.path(field)).toBeDefined();
      expect((schema.path(field) as any).isRequired).toBeFalsy();
    }
  });
});

describe("review schema — new relationship fields", () => {
  it("validates a fully populated relationship-aware document", () => {
    const review = new ReviewModel({
      id: "review_new01",
      userId: oid(),
      postedBy: UserRole.HR,
      revieweeId: oid(),
      revieweeRef: RevieweeRef.USER,
      revieweeRole: UserRole.STUDENT,
      reviewRelationship: ReviewRelationship.HR_TO_STUDENT,
      hotelId: oid(),
      gigId: oid(),
      bookingId: oid(),
      reviewType: ReviewType.GIG,
      feedbackRating: 5,
      feedbackReview: "Completed the shift well",
    });

    expect(review.validateSync()).toBeUndefined();
  });

  it("points revieweeId at User or Hotel through refPath", () => {
    expect((schema.path("revieweeId") as any).options.refPath).toBe("revieweeRef");
  });

  it("constrains reviewRelationship to the seven supported values", () => {
    const invalid = new ReviewModel({
      id: "review_new02",
      userId: oid(),
      postedBy: UserRole.HR,
      hotelId: oid(),
      reviewType: ReviewType.GIG,
      reviewRelationship: "STUDENT_TO_CEO",
    });

    expect(invalid.validateSync()).toBeTruthy();
  });

  it("accepts the new EMPLOYMENT review type alongside GIG and JOB", () => {
    for (const reviewType of [ReviewType.GIG, ReviewType.JOB, ReviewType.EMPLOYMENT]) {
      const doc = new ReviewModel({
        id: `review_${reviewType}`,
        userId: oid(),
        postedBy: UserRole.EMPLOYEE,
        hotelId: oid(),
        reviewType,
      });
      expect(doc.validateSync()).toBeUndefined();
    }
  });

  it("rejects an unknown review type so existing semantics cannot drift", () => {
    const doc = new ReviewModel({
      id: "review_bad_type",
      userId: oid(),
      postedBy: UserRole.EMPLOYEE,
      hotelId: oid(),
      reviewType: "ANYTHING",
    });
    expect(doc.validateSync()).toBeTruthy();
  });
});

describe("review schema — rating bounds", () => {
  it("enforces the existing 1–5 convention at the schema level", () => {
    const path = schema.path("rating") as any;
    expect(path.options.min).toBe(1);
    expect(path.options.max).toBe(5);

    const feedbackPath = schema.path("feedbackRating") as any;
    expect(feedbackPath.options.min).toBe(1);
    expect(feedbackPath.options.max).toBe(5);
  });

  it.each([0, 6, -1])("rejects the out-of-range rating %s", (rating) => {
    const doc = new ReviewModel({
      id: `review_rating_${rating}`,
      userId: oid(),
      postedBy: UserRole.EMPLOYEE,
      hotelId: oid(),
      reviewType: ReviewType.EMPLOYMENT,
      rating,
    });
    expect(doc.validateSync()).toBeTruthy();
  });
});

describe("review schema — timestamps", () => {
  it("records when a review was created, which the repository already sorted by", () => {
    expect((schema.options as any).timestamps).toBe(true);

    const doc = new ReviewModel({
      id: "review_ts",
      userId: oid(),
      postedBy: UserRole.EMPLOYEE,
      hotelId: oid(),
      reviewType: ReviewType.EMPLOYMENT,
    });
    expect(doc.validateSync()).toBeUndefined();
  });
});
