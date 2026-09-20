// ─────────────────────────────────────────────────────────────────────────────
// scripts/migrate-reviews.ts
//
// Verification / optional backfill for the review relationship model.
//
// The schema change is ADDITIVE: `revieweeId`, `revieweeRef`, `revieweeRole`,
// `reviewRelationship` and `bookingId` are all optional, `timestamps` only adds
// fields to new writes, and the duplicate-prevention index is PARTIAL on
// `reviewRelationship` existing — so documents written before this change stay
// valid, readable and outside the unique index. No migration is required for the
// system to keep working.
//
// This script therefore defaults to REPORT-ONLY:
//
//   npm run migrate:reviews              → report + create missing indexes
//   npm run migrate:reviews -- --no-index → report only, touch nothing
//   npm run migrate:reviews -- --backfill → additionally backfill the subset of
//                                           legacy documents whose reviewer and
//                                           relationship are unambiguous
//
// The backfill is deliberately narrow. It only touches documents where the
// reviewer is provably the stored `userId` (worker-authored gig reviews) AND the
// relationship can be re-verified against a COMPLETED booking. It never changes
// `rating`, `review`, `feedbackRating`, `feedbackReview`, `userId`, `hotelId`,
// `gigId`, and it never deletes a document. Hotel-side legacy documents cannot
// be attributed to a reviewer with certainty, so they are reported and left
// exactly as they are.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import { env } from "../config/env";
import { BookingModel } from "../modules/gigs/booking.model";
import { GigModel } from "../modules/gigs/gig.model";
import { ReviewModel } from "../modules/review/review.model";
import {
  BookingStatus,
  RevieweeRef,
  ReviewRelationship,
  ReviewType,
  UserRole,
} from "../shared/enums";

const WORKER_ROLES: string[] = [UserRole.STUDENT, UserRole.PROFESSIONAL];

interface Report {
  total: number;
  relationshipAware: number;
  legacy: number;
  legacyByPostedBy: Record<string, number>;
  backfillCandidates: number;
  backfilled: number;
  skippedUnverifiable: number;
  indexes: string[];
}

async function buildReport(): Promise<Omit<Report, "indexes">> {
  const [total, relationshipAware, byPostedBy] = await Promise.all([
    ReviewModel.countDocuments({}),
    ReviewModel.countDocuments({ reviewRelationship: { $exists: true } }),
    ReviewModel.aggregate([
      { $match: { reviewRelationship: { $exists: false } } },
      { $group: { _id: { $ifNull: ["$postedBy", "UNKNOWN"] }, count: { $sum: 1 } } },
    ]),
  ]);

  const legacyByPostedBy: Record<string, number> = {};
  for (const row of byPostedBy) {
    legacyByPostedBy[String(row._id)] = row.count;
  }

  return {
    total,
    relationshipAware,
    legacy: total - relationshipAware,
    legacyByPostedBy,
    backfillCandidates: 0,
    backfilled: 0,
    skippedUnverifiable: 0,
  };
}

async function ensureIndexes(): Promise<string[]> {
  // createIndexes() only adds what is missing — it never drops an existing index.
  await ReviewModel.createIndexes();
  const existing = await ReviewModel.collection.indexes();
  return existing.map((index: any) => String(index.name));
}

/**
 * Backfills only worker-authored gig reviews, and only when a COMPLETED booking
 * still proves the relationship.
 */
async function backfill(apply: boolean): Promise<{
  candidates: number;
  backfilled: number;
  skipped: number;
}> {
  const legacyWorkerReviews = await ReviewModel.find({
    reviewRelationship: { $exists: false },
    reviewType: ReviewType.GIG,
    postedBy: { $in: WORKER_ROLES },
    userId: { $exists: true, $ne: null },
    gigId: { $exists: true, $ne: null },
    hotelId: { $exists: true, $ne: null },
  })
    .select("_id userId hotelId gigId postedBy")
    .limit(5000)
    .lean();

  let backfilled = 0;
  let skipped = 0;

  for (const review of legacyWorkerReviews as any[]) {
    const gig = await GigModel.findById(review.gigId).select("_id id hotelId").lean();
    if (!gig) {
      skipped += 1;
      continue;
    }

    // The hotel recorded on the review must still be the hotel that owned the gig.
    if (String((gig as any).hotelId) !== String(review.hotelId)) {
      skipped += 1;
      continue;
    }

    const booking = await BookingModel.findOne({
      gigId: (gig as any).id,
      workerId: review.userId,
      status: BookingStatus.COMPLETED,
    })
      .select("_id")
      .lean();

    if (!booking) {
      skipped += 1;
      continue;
    }

    if (apply) {
      await ReviewModel.updateOne(
        { _id: review._id, reviewRelationship: { $exists: false } },
        {
          $set: {
            reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL,
            revieweeId: review.hotelId,
            revieweeRef: RevieweeRef.HOTEL,
            bookingId: (booking as any)._id,
          },
        },
      );
    }
    backfilled += 1;
  }

  return { candidates: legacyWorkerReviews.length, backfilled, skipped };
}

const run = async () => {
  const args = process.argv.slice(2);
  const applyBackfill = args.includes("--backfill");
  const manageIndexes = !args.includes("--no-index");

  await mongoose.connect(env.MONGO_URI);
  console.log("✅ DB connected");

  const report = await buildReport();

  console.log("\n── Review collection ─────────────────────────────────");
  console.log(`  total documents        : ${report.total}`);
  console.log(`  relationship-aware     : ${report.relationshipAware}`);
  console.log(`  legacy (untouched)     : ${report.legacy}`);
  console.log("  legacy by postedBy     :");
  for (const [role, count] of Object.entries(report.legacyByPostedBy)) {
    console.log(`    - ${role.padEnd(14)}: ${count}`);
  }

  const result = await backfill(applyBackfill);
  console.log("\n── Backfill (worker-authored gig reviews) ────────────");
  console.log(`  mode                   : ${applyBackfill ? "APPLY" : "DRY RUN"}`);
  console.log(`  candidates             : ${result.candidates}`);
  console.log(`  ${applyBackfill ? "backfilled" : "would backfill"}       : ${result.backfilled}`);
  console.log(`  unverifiable (skipped) : ${result.skipped}`);
  console.log(
    "  hotel-side legacy docs : left untouched (reviewer cannot be attributed with certainty)",
  );

  if (manageIndexes) {
    const indexes = await ensureIndexes();
    console.log("\n── Indexes ───────────────────────────────────────────");
    for (const name of indexes) {
      console.log(`  - ${name}`);
    }
  } else {
    console.log("\n── Indexes ───────────────────────────────────────────");
    console.log("  skipped (--no-index)");
  }

  console.log("\n🎉 Review migration check completed successfully");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (error) => {
  console.error("❌ Review migration check failed:", error?.message ?? error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
