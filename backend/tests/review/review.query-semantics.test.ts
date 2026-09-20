/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Query-semantics tests.
 *
 * These lock down *why* the hotel-scope guard in `ReviewService` exists, by
 * asserting the behaviour of the real Mongoose query caster — and confirming the
 * in-memory double used by the integration tests reproduces it, so the whole
 * suite cannot silently drift away from production semantics.
 */

import mongoose from "mongoose";
import { ReviewModel } from "../../src/modules/review/review.model";
import { createMemoryModel, matches } from "../helpers/memory-db";

const oid = () => new mongoose.Types.ObjectId();

describe("Mongoose drops undefined filter values (real behaviour)", () => {
  it("removes an undefined hotelId from the cast filter, widening the query", () => {
    const query: any = ReviewModel.find({
      reviewType: "GIG",
      hotelId: undefined,
    });
    query.cast(ReviewModel);

    // This is the leak: the hotelId predicate disappears entirely.
    expect(query.getFilter()).toEqual({ reviewType: "GIG" });
  });

  it("keeps an explicit null, which matches documents with no value", () => {
    const query: any = ReviewModel.find({ gigId: null });
    query.cast(ReviewModel);

    expect(Object.keys(query.getFilter())).toContain("gigId");
  });
});

describe("the in-memory double reproduces that behaviour", () => {
  const Review = createMemoryModel("ReviewDouble", "reviews_double", {
    timestamps: true,
  });

  beforeEach(() => Review.reset());

  it("ignores undefined filter values exactly like Mongoose", async () => {
    Review.insertRaw({ id: "a", reviewType: "GIG", hotelId: oid() });
    Review.insertRaw({ id: "b", reviewType: "GIG", hotelId: oid() });

    const unscoped = await Review.find({ reviewType: "GIG", hotelId: undefined });
    expect(unscoped).toHaveLength(2);

    const scoped = await Review.find({
      reviewType: "GIG",
      hotelId: unscoped[0].hotelId,
    });
    expect(scoped).toHaveLength(1);
  });

  it("matches null against a missing field, as the duplicate pre-check relies on", () => {
    expect(matches({ userId: "u1" }, { userId: "u1", gigId: null })).toBe(true);
    expect(matches({ userId: "u1", gigId: null }, { gigId: null })).toBe(true);
    expect(matches({ userId: "u1", gigId: oid() }, { gigId: null })).toBe(false);
  });
});
