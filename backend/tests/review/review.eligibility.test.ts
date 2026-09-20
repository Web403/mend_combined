/**
 * Unit tests — review eligibility and relationship validation.
 *
 * Covers the full matrix required by the specification:
 *   • every legitimate reviewer → reviewee relationship (§30 table 1)
 *   • every illegitimate combination (§30 table 2)
 *   • gig completion gating (§11)
 *   • client-supplied ids that cannot be used as proof (§28, §35)
 *   • duplicate detection (§18)
 *   • relationship inference for clients that do not name one explicitly
 *
 * The engine depends only on `ReviewDataGateway`, so these run against an
 * in-memory world with no database.
 */

import {
  ReviewEligibilityService,
  REVIEW_RELATIONSHIP_RULES,
} from "../../src/modules/review/review.eligibility";
import { ReviewError } from "../../src/modules/review/review.error";
import type { ReviewUserRecord } from "../../src/modules/review/review.gateway";
import {
  BookingStatus,
  RevieweeRef,
  ReviewRelationship,
  ReviewType,
  UserRole,
  UserStatus,
} from "../../src/shared/enums";
import type { CreateReviewInput, ReviewActor } from "../../src/shared/interfaces";
import {
  booking,
  createFakeGateway,
  emptyWorld,
  gig,
  hotel,
  oid,
  user,
  type FakeWorld,
} from "../helpers/fake-gateway";

// ── Harness ───────────────────────────────────────────────────────────────────

function serviceFor(world: FakeWorld, existingReview: unknown = null) {
  return new ReviewEligibilityService({
    gateway: createFakeGateway(world),
    findExistingReview: async () => existingReview,
  });
}

const actorOf = (reviewer: ReviewUserRecord): ReviewActor => ({
  id: reviewer._id,
  role: reviewer.role,
  roles: [reviewer.role],
  hotelId: reviewer.hotelId ?? undefined,
});

/** Runs a case and returns either the resolved context or the ReviewError. */
async function attempt(
  world: FakeWorld,
  reviewer: ReviewUserRecord,
  input: CreateReviewInput,
  existingReview: unknown = null,
) {
  try {
    return { ok: true as const, context: await serviceFor(world, existingReview).validateReviewEligibility(actorOf(reviewer), input) };
  } catch (error) {
    return { ok: false as const, error: error as ReviewError };
  }
}

async function expectRejection(
  world: FakeWorld,
  reviewer: ReviewUserRecord,
  input: CreateReviewInput,
  code: string,
  existingReview: unknown = null,
) {
  const result = await attempt(world, reviewer, input, existingReview);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toBeInstanceOf(ReviewError);
    expect(result.error.code).toBe(code);
  }
  return result;
}

// ── Shared world ──────────────────────────────────────────────────────────────

function buildWorld() {
  const world = emptyWorld();

  const hotelA = hotel({ name: "Hotel A" });
  const hotelB = hotel({ name: "Hotel B" });
  world.hotels.push(hotelA, hotelB);

  const hrA = user(UserRole.HR, hotelA);
  const adminA = user(UserRole.ADMIN, hotelA);
  const managerA = user(UserRole.MANAGER, hotelA);
  const employeeA = user(UserRole.EMPLOYEE, hotelA);
  const hrB = user(UserRole.HR, hotelB);
  const managerB = user(UserRole.MANAGER, hotelB);
  const employeeB = user(UserRole.EMPLOYEE, hotelB);
  const student = user(UserRole.STUDENT, null);
  const professional = user(UserRole.PROFESSIONAL, null);
  const otherStudent = user(UserRole.STUDENT, null);
  world.users.push(
    hrA,
    adminA,
    managerA,
    employeeA,
    hrB,
    managerB,
    employeeB,
    student,
    professional,
    otherStudent,
  );

  // A finished gig at hotel A that the student completed.
  const gigA = gig(hotelA, { postedBy: managerA._id });
  world.gigs.push(gigA);
  const completedBooking = booking(gigA, student, BookingStatus.COMPLETED);
  world.bookings.push(completedBooking);

  // A gig at hotel A the other student is merely confirmed for (not completed).
  const gigPending = gig(hotelA);
  world.gigs.push(gigPending);
  world.bookings.push(booking(gigPending, otherStudent, BookingStatus.CONFIRMED));

  // A gig belonging to hotel B.
  const gigB = gig(hotelB);
  world.gigs.push(gigB);

  return {
    world,
    hotelA,
    hotelB,
    hrA,
    adminA,
    managerA,
    employeeA,
    hrB,
    managerB,
    employeeB,
    student,
    professional,
    otherStudent,
    gigA,
    gigPending,
    gigB,
    completedBooking,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// §30 table 1 — every legitimate relationship must be allowed
// ═════════════════════════════════════════════════════════════════════════════

describe("valid review relationships", () => {
  it("HR → Employee (same hotel)", async () => {
    const f = buildWorld();
    const result = await attempt(f.world, f.hrA, {
      reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
      revieweeId: f.employeeA._id,
      rating: 4,
      review: "Consistent performance",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.reviewRelationship).toBe(ReviewRelationship.HR_TO_EMPLOYEE);
    expect(result.context.reviewType).toBe(ReviewType.EMPLOYMENT);
    expect(result.context.userId.toString()).toBe(f.hrA._id);
    expect(result.context.postedBy).toBe(UserRole.HR);
    expect(result.context.revieweeId.toString()).toBe(f.employeeA._id);
    expect(result.context.revieweeRef).toBe(RevieweeRef.USER);
    expect(result.context.revieweeRole).toBe(UserRole.EMPLOYEE);
    expect(result.context.hotelId.toString()).toBe(f.hotelA._id);
    expect(result.context.gigId).toBeUndefined();
    expect(result.context.bookingId).toBeUndefined();
  });

  it("HR → Manager (same hotel)", async () => {
    const f = buildWorld();
    const result = await attempt(f.world, f.hrA, {
      reviewRelationship: ReviewRelationship.HR_TO_MANAGER,
      revieweeId: f.managerA._id,
      rating: 5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.reviewRelationship).toBe(ReviewRelationship.HR_TO_MANAGER);
    expect(result.context.revieweeRole).toBe(UserRole.MANAGER);
    expect(result.context.hotelId.toString()).toBe(f.hotelA._id);
  });

  it("Employee → Hotel (derived from employment, not from the body)", async () => {
    const f = buildWorld();
    const result = await attempt(f.world, f.employeeA, {
      reviewRelationship: ReviewRelationship.EMPLOYEE_TO_HOTEL,
      rating: 4,
      review: "Good rota planning",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.reviewType).toBe(ReviewType.EMPLOYMENT);
    expect(result.context.hotelId.toString()).toBe(f.hotelA._id);
    // The reviewee IS the hotel the employee actually works for.
    expect(result.context.revieweeId.toString()).toBe(f.hotelA._id);
    expect(result.context.revieweeRef).toBe(RevieweeRef.HOTEL);
    expect(result.context.revieweeRole).toBeUndefined();
  });

  it("Manager → Hotel", async () => {
    const f = buildWorld();
    const result = await attempt(f.world, f.managerA, {
      reviewRelationship: ReviewRelationship.MANAGER_TO_HOTEL,
      rating: 5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.revieweeId.toString()).toBe(f.hotelA._id);
    expect(result.context.revieweeRef).toBe(RevieweeRef.HOTEL);
  });

  it("HR → Student after a COMPLETED gig", async () => {
    const f = buildWorld();
    const result = await attempt(f.world, f.hrA, {
      reviewRelationship: ReviewRelationship.HR_TO_STUDENT,
      revieweeId: f.student._id,
      gigId: f.gigA.id,
      feedbackRating: 5,
      feedbackReview: "Excellent turnout",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.reviewType).toBe(ReviewType.GIG);
    expect(result.context.hotelId.toString()).toBe(f.hotelA._id);
    expect(result.context.gigId?.toString()).toBe(f.gigA._id);
    expect(result.context.revieweeId.toString()).toBe(f.student._id);
    expect(result.context.revieweeRole).toBe(UserRole.STUDENT);
    // The auditable proof of the relationship is stored.
    expect(result.context.bookingId?.toString()).toBe(f.completedBooking._id);
  });

  it("Student → Hotel after a COMPLETED gig", async () => {
    const f = buildWorld();
    const result = await attempt(f.world, f.student, {
      reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL,
      gigId: f.gigA.id,
      rating: 5,
      review: "Well organised shift",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.hotelId.toString()).toBe(f.hotelA._id);
    expect(result.context.revieweeId.toString()).toBe(f.hotelA._id);
    expect(result.context.revieweeRef).toBe(RevieweeRef.HOTEL);
    expect(result.context.gigId?.toString()).toBe(f.gigA._id);
    expect(result.context.bookingId?.toString()).toBe(f.completedBooking._id);
  });

  it("Student → Manager after a COMPLETED gig", async () => {
    const f = buildWorld();
    const result = await attempt(f.world, f.student, {
      reviewRelationship: ReviewRelationship.STUDENT_TO_MANAGER,
      revieweeId: f.managerA._id,
      gigId: f.gigA.id,
      rating: 4,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.revieweeId.toString()).toBe(f.managerA._id);
    expect(result.context.revieweeRole).toBe(UserRole.MANAGER);
    expect(result.context.hotelId.toString()).toBe(f.hotelA._id);
  });

  it("accepts PROFESSIONAL as a gig worker too", async () => {
    const f = buildWorld();
    const gigForPro = gig(f.hotelA);
    f.world.gigs.push(gigForPro);
    f.world.bookings.push(booking(gigForPro, f.professional, BookingStatus.COMPLETED));

    const result = await attempt(f.world, f.professional, {
      reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL,
      gigId: gigForPro.id,
      rating: 3,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.postedBy).toBe(UserRole.PROFESSIONAL);
  });

  it("accepts a hotel ADMIN acting in the HR capacity, under identical checks", async () => {
    const f = buildWorld();
    const result = await attempt(f.world, f.adminA, {
      reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
      revieweeId: f.employeeA._id,
      rating: 4,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.postedBy).toBe(UserRole.ADMIN);
  });

  it("accepts the manager recorded in Gig.postedBy even without a matching hotelId", async () => {
    const f = buildWorld();
    // A manager whose membership record is missing but who demonstrably posted
    // the gig — Gig.postedBy is an authoritative association.
    const postedByManager = user(UserRole.MANAGER, null);
    f.world.users.push(postedByManager);
    const postedGig = gig(f.hotelA, { postedBy: postedByManager._id });
    f.world.gigs.push(postedGig);
    f.world.bookings.push(booking(postedGig, f.student, BookingStatus.COMPLETED));

    const result = await attempt(f.world, f.student, {
      reviewRelationship: ReviewRelationship.STUDENT_TO_MANAGER,
      revieweeId: postedByManager._id,
      gigId: postedGig.id,
      rating: 5,
    });

    expect(result.ok).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// §30 table 2 — every illegitimate combination must be rejected
// ═════════════════════════════════════════════════════════════════════════════

describe("invalid review relationships", () => {
  it("Student → Employee is rejected (no such relationship exists)", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.student,
      { revieweeId: f.employeeA._id, gigId: f.gigA.id, rating: 5 },
      "INVALID_REVIEW_RELATIONSHIP",
    );
  });

  it("Student cannot claim the HR_TO_EMPLOYEE relationship", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.student,
      {
        reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
        revieweeId: f.employeeA._id,
        rating: 5,
      },
      "FORBIDDEN_REVIEWER_ROLE",
    );
  });

  it("Employee → Student is rejected", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.employeeA,
      { revieweeId: f.student._id, rating: 1 },
      "INVALID_REVIEW_RELATIONSHIP",
    );
  });

  it("Employee cannot review an arbitrary hotel by submitting its id", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.employeeA,
      { hotelId: f.hotelB._id, rating: 1, review: "Terrible" },
      "INVALID_REVIEW_RELATIONSHIP",
    );
  });

  it("Manager cannot review an arbitrary hotel by submitting its id", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.managerA,
      { hotelId: f.hotelB._id, rating: 1 },
      "INVALID_REVIEW_RELATIONSHIP",
    );
  });

  it("Student → random hotel with no completed gig is rejected", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.student,
      {
        reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL,
        gigId: f.gigB.id,
        rating: 1,
      },
      "BOOKING_NOT_FOUND",
    );
  });

  it("Student → hotel of a gig they never finished is rejected", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.otherStudent,
      {
        reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL,
        gigId: f.gigPending.id,
        rating: 5,
      },
      "GIG_NOT_COMPLETED",
    );
  });

  it("Student → random manager not associated with the gig is rejected", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.student,
      {
        reviewRelationship: ReviewRelationship.STUDENT_TO_MANAGER,
        revieweeId: f.managerB._id,
        gigId: f.gigA.id,
        rating: 1,
      },
      "INVALID_REVIEW_RELATIONSHIP",
    );
  });

  it("Student → manager is rejected when the reviewee is not a manager at all", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.student,
      {
        reviewRelationship: ReviewRelationship.STUDENT_TO_MANAGER,
        revieweeId: f.employeeA._id,
        gigId: f.gigA.id,
        rating: 1,
      },
      "INVALID_REVIEW_RELATIONSHIP",
    );
  });

  it("HR → random student with no gig relationship is rejected", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.hrA,
      {
        reviewRelationship: ReviewRelationship.HR_TO_STUDENT,
        revieweeId: f.otherStudent._id,
        gigId: f.gigA.id,
        rating: 1,
      },
      "BOOKING_NOT_FOUND",
    );
  });

  it("HR → student for a gig belonging to another hotel is rejected", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.hrA,
      {
        reviewRelationship: ReviewRelationship.HR_TO_STUDENT,
        revieweeId: f.student._id,
        gigId: f.gigB.id,
        rating: 1,
      },
      "INVALID_REVIEW_RELATIONSHIP",
    );
  });

  it("HR of hotel B → employee of hotel A is rejected", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.hrB,
      {
        reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
        revieweeId: f.employeeA._id,
        rating: 1,
      },
      "INVALID_REVIEW_RELATIONSHIP",
    );
  });

  it("HR of hotel B → manager of hotel A is rejected", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.hrB,
      {
        reviewRelationship: ReviewRelationship.HR_TO_MANAGER,
        revieweeId: f.managerA._id,
        rating: 1,
      },
      "INVALID_REVIEW_RELATIONSHIP",
    );
  });

  it("HR → employee of a different hotel is rejected even when the HR names its own hotel", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.hrA,
      {
        reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
        revieweeId: f.employeeB._id,
        hotelId: f.hotelA._id,
        rating: 1,
      },
      "INVALID_REVIEW_RELATIONSHIP",
    );
  });

  it("Manager cannot use the HR → Employee relationship", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.managerA,
      {
        reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
        revieweeId: f.employeeA._id,
        rating: 5,
      },
      "FORBIDDEN_REVIEWER_ROLE",
    );
  });

  it("Employee cannot use the Manager → Hotel relationship", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.employeeA,
      { reviewRelationship: ReviewRelationship.MANAGER_TO_HOTEL, rating: 5 },
      "FORBIDDEN_REVIEWER_ROLE",
    );
  });

  it("a reviewer cannot review themselves", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.hrA,
      {
        reviewRelationship: ReviewRelationship.HR_TO_MANAGER,
        revieweeId: f.hrA._id,
        rating: 5,
      },
      "INVALID_REVIEW_RELATIONSHIP",
    );
  });

  it("a reviewee that does not exist is a 404", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.hrA,
      { reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE, revieweeId: oid(), rating: 5 },
      "REVIEWEE_NOT_FOUND",
    );
  });

  it("a gig that does not exist is a 404", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.student,
      { reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL, gigId: "GIG_MISSING", rating: 5 },
      "GIG_NOT_FOUND",
    );
  });

  it("a reviewer with no hotel membership cannot post an employment review", async () => {
    const f = buildWorld();
    const homelessEmployee = user(UserRole.EMPLOYEE, null);
    f.world.users.push(homelessEmployee);

    await expectRejection(
      f.world,
      homelessEmployee,
      { reviewRelationship: ReviewRelationship.EMPLOYEE_TO_HOTEL, rating: 5 },
      "NO_HOTEL_MEMBERSHIP",
    );
  });

  it("an unknown account cannot post a review", async () => {
    const f = buildWorld();
    const ghost: ReviewUserRecord = {
      _id: oid(),
      role: UserRole.HR,
      hotelId: f.hotelA._id,
    };
    // Deliberately NOT added to the world: the token claims an id the DB lacks.
    await expectRejection(
      f.world,
      ghost,
      { reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE, revieweeId: f.employeeA._id, rating: 5 },
      "REVIEWER_NOT_FOUND",
    );
  });

  it("a suspended reviewer cannot post a review", async () => {
    const f = buildWorld();
    const suspendedHr = user(UserRole.HR, f.hotelA, { status: UserStatus.SUSPENDED });
    f.world.users.push(suspendedHr);

    await expectRejection(
      f.world,
      suspendedHr,
      { reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE, revieweeId: f.employeeA._id, rating: 5 },
      "REVIEWER_SUSPENDED",
    );
  });

  it("an unauthenticated actor is rejected", async () => {
    const f = buildWorld();
    const service = serviceFor(f.world);
    await expect(
      service.validateReviewEligibility({ id: "" }, { rating: 5 }),
    ).rejects.toMatchObject({ code: "UNAUTHENTICATED", httpStatus: 401 });
  });

  it("an unsupported relationship value is rejected", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.hrA,
      { reviewRelationship: "STUDENT_TO_CEO" as ReviewRelationship, rating: 5 },
      "UNSUPPORTED_REVIEW_RELATIONSHIP",
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// §11 — completion is defined by the booking, never by assignment/pending state
// ═════════════════════════════════════════════════════════════════════════════

describe("gig completion gating", () => {
  it.each([
    ["CONFIRMED", BookingStatus.CONFIRMED],
    ["CANCELLED", BookingStatus.CANCELLED],
    ["NO_SHOW", BookingStatus.NO_SHOW],
  ])("rejects a booking in state %s", async (_label, status) => {
    const f = buildWorld();
    const worker = user(UserRole.STUDENT, null);
    f.world.users.push(worker);
    const subjectGig = gig(f.hotelA);
    f.world.gigs.push(subjectGig);
    f.world.bookings.push(booking(subjectGig, worker, status));

    await expectRejection(
      f.world,
      worker,
      { reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL, gigId: subjectGig.id, rating: 5 },
      "GIG_NOT_COMPLETED",
    );
  });

  it("accepts only COMPLETED", async () => {
    const f = buildWorld();
    const result = await attempt(f.world, f.student, {
      reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL,
      gigId: f.gigA.id,
      rating: 5,
    });
    expect(result.ok).toBe(true);
  });

  it("requires the gig even when the student names a hotel they liked", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.student,
      { reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL, hotelId: f.hotelA._id, rating: 5 },
      "REVIEW_VALIDATION_FAILED",
    );
  });

  it("applies the same completion gate to HR → Student", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.hrA,
      {
        reviewRelationship: ReviewRelationship.HR_TO_STUDENT,
        revieweeId: f.otherStudent._id,
        gigId: f.gigPending.id,
        rating: 5,
      },
      "GIG_NOT_COMPLETED",
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// §35 — client-supplied ids are hints, never proof
// ═════════════════════════════════════════════════════════════════════════════

describe("client-supplied identifiers cannot widen access", () => {
  it("rejects a student whose hotelId disagrees with the completed gig's hotel", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.student,
      {
        reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL,
        gigId: f.gigA.id,
        hotelId: f.hotelB._id,
        rating: 5,
      },
      "INVALID_REVIEW_RELATIONSHIP",
    );
  });

  it("rejects a student whose revieweeId disagrees with the gig's hotel", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.student,
      {
        reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL,
        gigId: f.gigA.id,
        revieweeId: f.hotelB._id,
        rating: 5,
      },
      "INVALID_REVIEW_RELATIONSHIP",
    );
  });

  it("ignores a revieweeRole asserted by the client and stores the real one", async () => {
    const f = buildWorld();
    const result = await attempt(f.world, f.hrA, {
      reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
      revieweeId: f.employeeA._id,
      rating: 5,
      // A client cannot promote/demote the reviewee.
      revieweeRole: UserRole.MANAGER,
    } as CreateReviewInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.revieweeRole).toBe(UserRole.EMPLOYEE);
  });

  it("ignores a reviewType asserted by the client and derives it from the rule", async () => {
    const f = buildWorld();
    const result = await attempt(f.world, f.employeeA, {
      reviewRelationship: ReviewRelationship.EMPLOYEE_TO_HOTEL,
      reviewType: ReviewType.GIG,
      rating: 5,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.reviewType).toBe(ReviewType.EMPLOYMENT);
  });

  it("malformed identifiers are a clean 400, never a driver error", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.hrA,
      {
        reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
        revieweeId: '{"$gt":""}',
        rating: 5,
      },
      "REVIEW_VALIDATION_FAILED",
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// §18 — duplicates
// ═════════════════════════════════════════════════════════════════════════════

describe("duplicate reviews", () => {
  it("rejects a second review for the same relationship and context", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.student,
      {
        reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL,
        gigId: f.gigA.id,
        rating: 4,
      },
      "DUPLICATE_REVIEW",
      { _id: oid() },
    );
  });

  it("reports the duplicate as HTTP 409", async () => {
    const f = buildWorld();
    const result = await attempt(
      f.world,
      f.student,
      { reviewRelationship: ReviewRelationship.STUDENT_TO_HOTEL, gigId: f.gigA.id, rating: 4 },
      { _id: oid() },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.httpStatus).toBe(409);
  });

  it("the duplicate key is exactly the tuple the unique index enforces", async () => {
    const f = buildWorld();
    const seen: any[] = [];
    const service = new ReviewEligibilityService({
      gateway: createFakeGateway(f.world),
      findExistingReview: async (key) => {
        seen.push(key);
        return null;
      },
    });

    await service.validateReviewEligibility(actorOf(f.hrA), {
      reviewRelationship: ReviewRelationship.HR_TO_STUDENT,
      revieweeId: f.student._id,
      gigId: f.gigA.id,
      rating: 5,
    });

    expect(seen).toHaveLength(1);
    expect(seen[0]).toEqual({
      userId: f.hrA._id,
      reviewRelationship: ReviewRelationship.HR_TO_STUDENT,
      revieweeId: f.student._id,
      hotelId: f.hotelA._id,
      gigId: f.gigA._id,
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Relationship inference — legacy clients that do not name a relationship
// ═════════════════════════════════════════════════════════════════════════════

describe("relationship inference for clients that omit reviewRelationship", () => {
  it("infers STUDENT_TO_HOTEL from a worker + gig", async () => {
    const f = buildWorld();
    const result = await attempt(f.world, f.student, { gigId: f.gigA.id, rating: 5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.reviewRelationship).toBe(ReviewRelationship.STUDENT_TO_HOTEL);
  });

  it("infers STUDENT_TO_MANAGER from a worker + gig + person reviewee", async () => {
    const f = buildWorld();
    const result = await attempt(f.world, f.student, {
      gigId: f.gigA.id,
      revieweeId: f.managerA._id,
      rating: 5,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.reviewRelationship).toBe(ReviewRelationship.STUDENT_TO_MANAGER);
  });

  it("infers EMPLOYEE_TO_HOTEL / MANAGER_TO_HOTEL from the reviewer role alone", async () => {
    const f = buildWorld();
    const employeeResult = await attempt(f.world, f.employeeA, { rating: 5 });
    const managerResult = await attempt(f.world, f.managerA, { rating: 5 });

    expect(employeeResult.ok && employeeResult.context.reviewRelationship).toBe(
      ReviewRelationship.EMPLOYEE_TO_HOTEL,
    );
    expect(managerResult.ok && managerResult.context.reviewRelationship).toBe(
      ReviewRelationship.MANAGER_TO_HOTEL,
    );
  });

  it("infers HR_TO_EMPLOYEE vs HR_TO_MANAGER from the reviewee's real role", async () => {
    const f = buildWorld();
    const toEmployee = await attempt(f.world, f.hrA, { revieweeId: f.employeeA._id, rating: 5 });
    const toManager = await attempt(f.world, f.hrA, { revieweeId: f.managerA._id, rating: 5 });

    expect(toEmployee.ok && toEmployee.context.reviewRelationship).toBe(
      ReviewRelationship.HR_TO_EMPLOYEE,
    );
    expect(toManager.ok && toManager.context.reviewRelationship).toBe(
      ReviewRelationship.HR_TO_MANAGER,
    );
  });

  it("derives the student from the gig when HR omits revieweeId and exactly one worker completed it", async () => {
    const f = buildWorld();
    const result = await attempt(f.world, f.hrA, {
      gigId: f.gigA.id,
      feedbackRating: 5,
      feedbackReview: "Great work",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.reviewRelationship).toBe(ReviewRelationship.HR_TO_STUDENT);
    expect(result.context.revieweeId.toString()).toBe(f.student._id);
    expect(result.context.bookingId?.toString()).toBe(f.completedBooking._id);
  });

  it("refuses to guess when several workers completed the same gig", async () => {
    const f = buildWorld();
    const secondStudent = user(UserRole.STUDENT, null);
    f.world.users.push(secondStudent);
    f.world.bookings.push(booking(f.gigA, secondStudent, BookingStatus.COMPLETED));

    await expectRejection(
      f.world,
      f.hrA,
      { gigId: f.gigA.id, feedbackRating: 5 },
      "REVIEW_VALIDATION_FAILED",
    );
  });

  it("reports an incomplete gig when HR omits revieweeId and nobody completed it", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.hrA,
      { gigId: f.gigPending.id, feedbackRating: 5 },
      "GIG_NOT_COMPLETED",
    );
  });

  it("requires a reviewee when HR posts an employment review", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.hrA,
      { rating: 5 },
      "REVIEW_VALIDATION_FAILED",
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// §20 / §21 — payload rules applied through the engine
// ═════════════════════════════════════════════════════════════════════════════

describe("payload validation through the eligibility engine", () => {
  it("rejects an empty review", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.employeeA,
      { reviewRelationship: ReviewRelationship.EMPLOYEE_TO_HOTEL },
      "REVIEW_VALIDATION_FAILED",
    );
  });

  it("rejects a whitespace-only review", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.employeeA,
      { reviewRelationship: ReviewRelationship.EMPLOYEE_TO_HOTEL, review: "   \n\t " },
      "REVIEW_VALIDATION_FAILED",
    );
  });

  it("rejects an out-of-range rating", async () => {
    const f = buildWorld();
    await expectRejection(
      f.world,
      f.employeeA,
      { reviewRelationship: ReviewRelationship.EMPLOYEE_TO_HOTEL, rating: 7 },
      "REVIEW_VALIDATION_FAILED",
    );
  });

  it("accepts a feedback-only payload (existing hotel-side convention)", async () => {
    const f = buildWorld();
    const result = await attempt(f.world, f.hrA, {
      reviewRelationship: ReviewRelationship.HR_TO_STUDENT,
      revieweeId: f.student._id,
      gigId: f.gigA.id,
      feedbackRating: 4,
      feedbackReview: "Punctual",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.rating).toBeUndefined();
    expect(result.context.feedbackRating).toBe(4);
    expect(result.context.feedbackReview).toBe("Punctual");
  });

  it("sanitises stored review text", async () => {
    const f = buildWorld();
    const result = await attempt(f.world, f.employeeA, {
      reviewRelationship: ReviewRelationship.EMPLOYEE_TO_HOTEL,
      rating: 5,
      review: "Good hotel <script>steal()</script>",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.context.review).toBe("Good hotel");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Rule table integrity
// ═════════════════════════════════════════════════════════════════════════════

describe("relationship rule table", () => {
  it("defines exactly the seven required relationships", () => {
    expect(Object.keys(REVIEW_RELATIONSHIP_RULES).sort()).toEqual(
      [
        ReviewRelationship.EMPLOYEE_TO_HOTEL,
        ReviewRelationship.HR_TO_EMPLOYEE,
        ReviewRelationship.HR_TO_MANAGER,
        ReviewRelationship.HR_TO_STUDENT,
        ReviewRelationship.MANAGER_TO_HOTEL,
        ReviewRelationship.STUDENT_TO_HOTEL,
        ReviewRelationship.STUDENT_TO_MANAGER,
      ].sort(),
    );
  });

  it("requires a completed booking for every gig-scoped relationship", () => {
    for (const rule of Object.values(REVIEW_RELATIONSHIP_RULES)) {
      if (rule.requiresGig) {
        expect(rule.completedBookingOf).not.toBeNull();
        expect(rule.reviewType).toBe(ReviewType.GIG);
      }
    }
  });

  it("never lets a gig-scoped review take its hotel from the reviewer", () => {
    for (const rule of Object.values(REVIEW_RELATIONSHIP_RULES)) {
      if (rule.requiresGig) {
        expect(rule.hotelSource).toBe("gig");
      }
    }
  });
});
