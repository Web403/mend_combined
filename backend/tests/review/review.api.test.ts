/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Integration tests — the real HTTP layer.
 *
 * These run the actual Express app (`createApp`) with the real JWT
 * `authMiddleware`, `tenantMiddleware`, controller, service, eligibility engine,
 * repository and data gateway. Only the five Mongoose models the review module
 * reads/writes are replaced by an in-memory double (no MongoDB server is
 * reachable from this environment), and that double reproduces the production
 * unique/partial index so duplicate and race-condition behaviour is real.
 *
 * Covered:
 *   • all seven legitimate relationships over HTTP (§32)
 *   • malicious / spoofed payloads (§28)
 *   • concurrent duplicate submissions (§29)
 *   • regression: every pre-existing endpoint keeps its contract (§33)
 */

import request from "supertest";

jest.mock("../../src/modules/users/user.model", () => ({
  UserModel: require("../helpers/fixtures").UserModel,
}));
jest.mock("../../src/modules/hotel/hotel.model", () => ({
  HotelModel: require("../helpers/fixtures").HotelModel,
}));
jest.mock("../../src/modules/gigs/gig.model", () => ({
  GigModel: require("../helpers/fixtures").GigModel,
}));
jest.mock("../../src/modules/gigs/booking.model", () => ({
  BookingModel: require("../helpers/fixtures").BookingModel,
}));
jest.mock("../../src/modules/review/review.model", () => ({
  ReviewModel: require("../helpers/fixtures").ReviewModel,
  REVIEW_RATING_MIN: 1,
  REVIEW_RATING_MAX: 5,
}));

import { createApp } from "../../src/app";
import { ROUTE_PREFIX } from "../../src/shared/constants";
import { BookingStatus, ReviewRelationship, UserRole } from "../../src/shared/enums";
import {
  HotelModel,
  ReviewModel,
  hotelTokenFor,
  makeBooking,
  makeGig,
  makeHotel,
  makeUser,
  newId,
  resetWorld,
  tokenFor,
} from "../helpers/fixtures";

const app = createApp();
const REVIEW = `${ROUTE_PREFIX}/review`;

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Legacy-shaped review document, exactly as the module stored them before. */
function seedLegacyReview(fields: Record<string, any>) {
  return ReviewModel.insertRaw({
    id: `review_legacy_${Math.random().toString(36).slice(2, 8)}`,
    reviewType: "GIG",
    ...fields,
  });
}

let world: any;

beforeEach(() => {
  resetWorld();

  const hotelA = makeHotel("Hotel A");
  const hotelB = makeHotel("Hotel B");

  const hrA = makeUser(UserRole.HR, hotelA);
  const managerA = makeUser(UserRole.MANAGER, hotelA);
  const employeeA = makeUser(UserRole.EMPLOYEE, hotelA);
  const hrB = makeUser(UserRole.HR, hotelB);
  const employeeB = makeUser(UserRole.EMPLOYEE, hotelB);
  const student = makeUser(UserRole.STUDENT, null);
  const secondStudent = makeUser(UserRole.STUDENT, null);

  const gigA = makeGig(hotelA, { postedBy: managerA._id.toString() });
  const completedBooking = makeBooking(gigA, student, BookingStatus.COMPLETED);

  const gigPending = makeGig(hotelA);
  const pendingBooking = makeBooking(gigPending, secondStudent, BookingStatus.CONFIRMED);

  const gigB = makeGig(hotelB);

  world = {
    hotelA,
    hotelB,
    hrA,
    managerA,
    employeeA,
    hrB,
    employeeB,
    student,
    secondStudent,
    gigA,
    gigPending,
    gigB,
    completedBooking,
    pendingBooking,
    hrAToken: tokenFor(hrA as any),
    managerAToken: tokenFor(managerA as any),
    employeeAToken: tokenFor(employeeA as any),
    hrBToken: tokenFor(hrB as any),
    employeeBToken: tokenFor(employeeB as any),
    studentToken: tokenFor(student as any),
    secondStudentToken: tokenFor(secondStudent as any),
    hotelAToken: hotelTokenFor(hotelA),
  };
});

// ═════════════════════════════════════════════════════════════════════════════
// Authentication
// ═════════════════════════════════════════════════════════════════════════════

describe("authentication", () => {
  it("rejects an anonymous review submission with 401", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .send({ hotelId: world.hotelA._id.toString(), rating: 5 });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects a forged token with 401", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth("not.a.jwt"))
      .send({ rating: 5 });

    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// §32 — the seven legitimate relationships over HTTP
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /review/create-review — legitimate relationships", () => {
  it("HR → Employee", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.hrAToken))
      .send({
        reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
        revieweeId: world.employeeA._id.toString(),
        rating: 4,
        review: "Reliable and punctual",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Review added");
    expect(res.body.data.reviewRelationship).toBe(ReviewRelationship.HR_TO_EMPLOYEE);
    expect(res.body.data.reviewType).toBe("EMPLOYMENT");
    expect(res.body.data.hotelId).toBe(world.hotelA._id.toString());
    expect(res.body.data.revieweeId).toBe(world.employeeA._id.toString());
    expect(res.body.data.userId).toBe(world.hrA._id.toString());
    expect(res.body.data.postedBy).toBe(UserRole.HR);
  });

  it("HR → Manager", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.hrAToken))
      .send({
        reviewRelationship: ReviewRelationship.HR_TO_MANAGER,
        revieweeId: world.managerA._id.toString(),
        rating: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.revieweeRole).toBe(UserRole.MANAGER);
  });

  it("Employee → Hotel", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.employeeAToken))
      .send({ rating: 4, review: "Supportive management" });

    expect(res.status).toBe(201);
    expect(res.body.data.reviewRelationship).toBe(ReviewRelationship.EMPLOYEE_TO_HOTEL);
    expect(res.body.data.revieweeId).toBe(world.hotelA._id.toString());
    expect(res.body.data.revieweeRef).toBe("Hotel");
    expect(res.body.data.hotelId).toBe(world.hotelA._id.toString());
  });

  it("Manager → Hotel", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.managerAToken))
      .send({ rating: 5 });

    expect(res.status).toBe(201);
    expect(res.body.data.reviewRelationship).toBe(ReviewRelationship.MANAGER_TO_HOTEL);
    expect(res.body.data.revieweeId).toBe(world.hotelA._id.toString());
  });

  it("HR → Student after a completed gig, storing the booking that proves it", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.hrAToken))
      .send({
        gigId: world.gigA.id,
        revieweeId: world.student._id.toString(),
        feedbackRating: 5,
        feedbackReview: "Excellent turnout",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.reviewRelationship).toBe(ReviewRelationship.HR_TO_STUDENT);
    expect(res.body.data.reviewType).toBe("GIG");
    expect(res.body.data.gigId).toBe(world.gigA._id.toString());
    expect(res.body.data.bookingId).toBe(world.completedBooking._id.toString());
    expect(res.body.data.hotelId).toBe(world.hotelA._id.toString());
    expect(res.body.data.userId).toBe(world.hrA._id.toString());
  });

  it("Student → Hotel after a completed gig", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.studentToken))
      .send({ gigId: world.gigA.id, rating: 5, review: "Great team" });

    expect(res.status).toBe(201);
    expect(res.body.data.reviewRelationship).toBe(ReviewRelationship.STUDENT_TO_HOTEL);
    expect(res.body.data.revieweeId).toBe(world.hotelA._id.toString());
    expect(res.body.data.bookingId).toBe(world.completedBooking._id.toString());
  });

  it("Student → Manager after a completed gig", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.studentToken))
      .send({
        gigId: world.gigA.id,
        revieweeId: world.managerA._id.toString(),
        rating: 4,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.reviewRelationship).toBe(ReviewRelationship.STUDENT_TO_MANAGER);
    expect(res.body.data.revieweeId).toBe(world.managerA._id.toString());
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// §28 — malicious requests must be rejected
// ═════════════════════════════════════════════════════════════════════════════

describe("POST /review/create-review — unauthorized attempts", () => {
  it("a student cannot review a hotel they never worked for", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.studentToken))
      .send({ gigId: world.gigB.id, rating: 1 });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/assignment/i);
  });

  it("a student cannot review a hotel for a gig that is merely confirmed", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.secondStudentToken))
      .send({ gigId: world.gigPending.id, rating: 5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/completed/i);
  });

  it("a student cannot review a manager who was not on their gig", async () => {
    const otherManager = makeUser(UserRole.MANAGER, world.hotelB);
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.studentToken))
      .send({
        gigId: world.gigA.id,
        revieweeId: otherManager._id.toString(),
        rating: 1,
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/not associated with this gig/i);
  });

  it("an HR user cannot review a student of another hotel's gig", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.hrAToken))
      .send({ gigId: world.gigB.id, revieweeId: world.student._id.toString(), rating: 1 });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/does not belong to your hotel/i);
  });

  it("an HR user cannot review staff of an unrelated hotel", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.hrBToken))
      .send({
        reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
        revieweeId: world.employeeA._id.toString(),
        rating: 1,
      });

    expect(res.status).toBe(403);
  });

  it("an employee cannot redirect their review to a different hotel", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.employeeAToken))
      .send({ hotelId: world.hotelB._id.toString(), rating: 1 });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/does not match the hotel/i);
  });

  it("a student cannot redirect a gig review to a different hotel", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.studentToken))
      .send({
        gigId: world.gigA.id,
        hotelId: world.hotelB._id.toString(),
        rating: 5,
      });

    expect(res.status).toBe(403);
  });

  it("a student cannot impersonate HR by supplying userId/postedBy in the body", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.studentToken))
      .send({
        reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
        revieweeId: world.employeeA._id.toString(),
        userId: world.hrA._id.toString(),
        postedBy: UserRole.HR,
        rating: 1,
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/role is not allowed/i);
  });

  it("a body-supplied userId can never replace the token identity", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.employeeAToken))
      .send({
        userId: world.hrA._id.toString(),
        postedBy: UserRole.HR,
        revieweeId: world.student._id.toString(),
        reviewRelationship: ReviewRelationship.HR_TO_STUDENT,
        rating: 5,
      });

    expect(res.status).toBe(403);
    // Nothing was written on behalf of somebody else.
    expect(ReviewModel.docs.some((doc: any) => doc.userId === world.hrA._id)).toBe(false);
  });

  it("an employee cannot review a student", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.employeeAToken))
      .send({ revieweeId: world.student._id.toString(), rating: 1 });

    expect(res.status).toBe(403);
  });

  it("a manager cannot use the HR relationship", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.managerAToken))
      .send({
        reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
        revieweeId: world.employeeA._id.toString(),
        rating: 5,
      });

    expect(res.status).toBe(403);
  });

  it("a token for a non-existent user cannot create a review", async () => {
    const ghostToken = tokenFor({
      _id: newId(),
      role: UserRole.HR,
      hotelId: world.hotelA._id,
    } as any);

    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(ghostToken))
      .send({ revieweeId: world.employeeA._id.toString(), rating: 5 });

    expect(res.status).toBe(403);
  });

  it("rejects an invalid rating with 400 rather than storing it", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.employeeAToken))
      .send({ rating: 9 });

    expect(res.status).toBe(400);
    expect(ReviewModel.docs).toHaveLength(0);
  });

  it("rejects a string rating that is not a whole number", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.employeeAToken))
      .send({ rating: "4.5" });

    expect(res.status).toBe(400);
  });

  it("rejects an empty review body", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.employeeAToken))
      .send({ review: "    " });

    expect(res.status).toBe(400);
  });

  it("rejects a NoSQL-injection revieweeId with 400", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.hrAToken))
      .send({
        reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
        revieweeId: { $gt: "" },
        rating: 5,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).not.toMatch(/CastError|Mongo/);
  });

  it("strips script payloads before storing review text", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.employeeAToken))
      .send({ rating: 5, review: "Great hotel <script>alert('xss')</script>" });

    expect(res.status).toBe(201);
    expect(res.body.data.review).toBe("Great hotel");
    expect(JSON.stringify(res.body.data)).not.toMatch(/<script>/i);
  });

  it("does not leak internal error details on unexpected failures", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.hrAToken))
      .send({
        reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
        revieweeId: world.employeeA._id.toString(),
        // Rating type that passes JSON but fails validation.
        rating: [5],
      });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, message: expect.any(String), data: null });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// §18 / §29 — duplicates and races
// ═════════════════════════════════════════════════════════════════════════════

describe("duplicate protection", () => {
  const employeeReview = () => ({ rating: 4, review: "Good hotel" });

  it("rejects a second identical review with 409", async () => {
    const first = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.employeeAToken))
      .send(employeeReview());
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.employeeAToken))
      .send({ ...employeeReview(), rating: 1 });
    expect(second.status).toBe(409);
    expect(ReviewModel.docs).toHaveLength(1);
  });

  it("allows the same reviewer to review a different hotel", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.employeeBToken))
      .send(employeeReview());
    expect(res.status).toBe(201);
    expect(res.body.data.hotelId).toBe(world.hotelB._id.toString());
  });

  it("allows one student to review both the hotel and the manager for the same gig", async () => {
    const hotelReview = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.studentToken))
      .send({ gigId: world.gigA.id, rating: 5 });
    const managerReview = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.studentToken))
      .send({
        gigId: world.gigA.id,
        revieweeId: world.managerA._id.toString(),
        rating: 4,
      });

    expect(hotelReview.status).toBe(201);
    expect(managerReview.status).toBe(201);
    expect(ReviewModel.docs).toHaveLength(2);
  });

  it("survives two simultaneous identical submissions — exactly one succeeds", async () => {
    const [first, second] = await Promise.all([
      request(app)
        .post(`${REVIEW}/create-review`)
        .set(auth(world.studentToken))
        .send({ gigId: world.gigA.id, rating: 5 }),
      request(app)
        .post(`${REVIEW}/create-review`)
        .set(auth(world.studentToken))
        .send({ gigId: world.gigA.id, rating: 5 }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
    expect(ReviewModel.docs).toHaveLength(1);
  });

  it("survives simultaneous HR feedback for the same student and gig", async () => {
    const payload = {
      gigId: world.gigA.id,
      revieweeId: world.student._id.toString(),
      feedbackRating: 5,
    };

    const [first, second] = await Promise.all([
      request(app).post(`${REVIEW}/create-review`).set(auth(world.hrAToken)).send(payload),
      request(app).post(`${REVIEW}/create-review`).set(auth(world.hrAToken)).send(payload),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 409]);
    expect(ReviewModel.docs).toHaveLength(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// §33 — regression: pre-existing endpoints keep their contract
// ═════════════════════════════════════════════════════════════════════════════

describe("regression — existing review endpoints", () => {
  beforeEach(() => {
    // A legacy student gig review, shaped exactly as the old code stored it.
    seedLegacyReview({
      userId: world.student._id,
      postedBy: UserRole.STUDENT,
      hotelId: world.hotelA._id,
      gigId: world.gigA._id,
      rating: 5,
      review: "Legacy student review",
    });
    // A legacy hotel-side feedback document.
    seedLegacyReview({
      userId: world.hrA._id,
      postedBy: UserRole.HR,
      hotelId: world.hotelA._id,
      gigId: world.gigA._id,
      feedbackRating: 4,
      feedbackReview: "Legacy HR feedback",
    });
  });

  it("GET /get-user-posted-gig-reviews still returns the caller's gig reviews", async () => {
    const res = await request(app)
      .get(`${REVIEW}/get-user-posted-gig-reviews`)
      .set(auth(world.studentToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].review).toBe("Legacy student review");
  });

  it("GET /get-user-feedback-gig-reviews still returns feedback about the caller", async () => {
    const res = await request(app)
      .get(`${REVIEW}/get-user-feedback-gig-reviews`)
      .set(auth(world.studentToken));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /get-user-feedback-gig-reviews surfaces NEW HR feedback via revieweeId", async () => {
    await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.hrAToken))
      .send({
        gigId: world.gigA.id,
        revieweeId: world.student._id.toString(),
        feedbackRating: 5,
        feedbackReview: "New format feedback",
      });

    const res = await request(app)
      .get(`${REVIEW}/get-user-feedback-gig-reviews`)
      .set(auth(world.studentToken));

    expect(res.status).toBe(200);
    const texts = res.body.data.map((doc: any) => doc.feedbackReview);
    expect(texts).toContain("New format feedback");
  });

  it("GET /get-gig-reviews-for-hotel is scoped to the caller's own hotel", async () => {
    const res = await request(app)
      .get(`${REVIEW}/get-gig-reviews-for-hotel`)
      .set(auth(world.hrAToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    for (const doc of res.body.data) {
      expect(doc.hotelId).toBe(world.hotelA._id.toString());
    }
  });

  it("GET /get-gig-reviews-for-hotel cannot be pointed at another hotel via X-Hotel-Id", async () => {
    const res = await request(app)
      .get(`${REVIEW}/get-gig-reviews-for-hotel`)
      .set(auth(world.hrAToken))
      .set("X-Hotel-Id", world.hotelB._id.toString());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((doc: any) => doc.hotelId === world.hotelA._id.toString())).toBe(
      true,
    );
  });

  it("GET /get-gig-review-posted-by-hotel keeps working", async () => {
    const res = await request(app)
      .get(`${REVIEW}/get-gig-review-posted-by-hotel`)
      .set(auth(world.hrAToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it("GET /get-hotels-with-reviews keeps grouping reviews per hotel", async () => {
    const res = await request(app)
      .get(`${REVIEW}/get-hotels-with-reviews`)
      .set(auth(world.studentToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].hotelName).toBe("Hotel A");
    expect(res.body.data[0].reviews).toHaveLength(2);
  });

  it("GET /get-hotels-with-reviews still honours the search query", async () => {
    const res = await request(app)
      .get(`${REVIEW}/get-hotels-with-reviews?search=ZZZ-no-match`)
      .set(auth(world.studentToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("empty result sets keep the pre-existing 404 NO_REVIEWS contract", async () => {
    resetWorld();
    const res = await request(app)
      .get(`${REVIEW}/get-user-posted-gig-reviews`)
      .set(auth(world.studentToken));

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("No reviews found");
  });

  it("legacy documents stay readable and are untouched by the new unique index", async () => {
    // Two legacy documents with an identical (userId, hotelId, gigId) tuple would
    // break a non-partial unique index; the partial index excludes them.
    seedLegacyReview({
      userId: world.student._id,
      postedBy: UserRole.STUDENT,
      hotelId: world.hotelA._id,
      gigId: world.gigA._id,
      rating: 3,
    });

    const res = await request(app)
      .get(`${REVIEW}/get-user-posted-gig-reviews`)
      .set(auth(world.studentToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(
      ReviewModel.docs.every((doc: any) => doc.reviewRelationship === undefined),
    ).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// New read endpoints
// ═════════════════════════════════════════════════════════════════════════════

describe("GET /review/get-user-received-reviews", () => {
  it("returns reviews where the caller is the reviewee", async () => {
    await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.hrAToken))
      .send({
        reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
        revieweeId: world.employeeA._id.toString(),
        rating: 4,
        review: "Solid quarter",
      });

    const res = await request(app)
      .get(`${REVIEW}/get-user-received-reviews`)
      .set(auth(world.employeeAToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].review).toBe("Solid quarter");
    expect(res.body.meta.total).toBe(1);
  });

  it("cannot be used to read reviews written about somebody else", async () => {
    await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.hrAToken))
      .send({
        reviewRelationship: ReviewRelationship.HR_TO_EMPLOYEE,
        revieweeId: world.employeeA._id.toString(),
        rating: 4,
      });

    const res = await request(app)
      .get(
        `${REVIEW}/get-user-received-reviews?revieweeId=${world.employeeA._id.toString()}`,
      )
      .set(auth(world.hrBToken));

    expect(res.status).toBe(404);
  });

  it("filters by relationship when asked", async () => {
    await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.hrAToken))
      .send({
        reviewRelationship: ReviewRelationship.HR_TO_STUDENT,
        revieweeId: world.student._id.toString(),
        gigId: world.gigA.id,
        feedbackRating: 5,
      });

    const match = await request(app)
      .get(
        `${REVIEW}/get-user-received-reviews?reviewRelationship=${ReviewRelationship.HR_TO_STUDENT}`,
      )
      .set(auth(world.studentToken));
    const noMatch = await request(app)
      .get(
        `${REVIEW}/get-user-received-reviews?reviewRelationship=${ReviewRelationship.HR_TO_EMPLOYEE}`,
      )
      .set(auth(world.studentToken));

    expect(match.status).toBe(200);
    expect(match.body.data).toHaveLength(1);
    expect(noMatch.status).toBe(404);
  });

  it("ignores an unknown relationship filter value", async () => {
    await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.hrAToken))
      .send({
        reviewRelationship: ReviewRelationship.HR_TO_STUDENT,
        revieweeId: world.student._id.toString(),
        gigId: world.gigA.id,
        feedbackRating: 5,
      });

    const res = await request(app)
      .get(`${REVIEW}/get-user-received-reviews?reviewRelationship=BOGUS`)
      .set(auth(world.studentToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe("GET /review/get-hotel-rating-summary", () => {
  it("computes the average, total and distribution without storing anything", async () => {
    await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.employeeAToken))
      .send({ rating: 4 });
    await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.managerAToken))
      .send({ rating: 5 });
    await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.studentToken))
      .send({ gigId: world.gigA.id, rating: 3 });

    const before = HotelModel.docs.map((doc: any) => ({ ...doc }));

    const res = await request(app)
      .get(`${REVIEW}/get-hotel-rating-summary`)
      .set(auth(world.employeeAToken));

    expect(res.status).toBe(200);
    expect(res.body.data.totalReviews).toBe(3);
    expect(res.body.data.ratedReviews).toBe(3);
    expect(res.body.data.averageRating).toBe(4);
    expect(res.body.data.distribution).toEqual({ "1": 0, "2": 0, "3": 1, "4": 1, "5": 1 });
    expect(res.body.data.byRelationship).toHaveLength(3);

    // Read-only: the Hotel documents are byte-for-byte unchanged.
    expect(HotelModel.docs).toEqual(before);
  });

  it("defaults to the caller's own hotel and accepts an explicit hotelId", async () => {
    await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.employeeBToken))
      .send({ rating: 2 });

    const own = await request(app)
      .get(`${REVIEW}/get-hotel-rating-summary`)
      .set(auth(world.employeeBToken));
    const explicit = await request(app)
      .get(`${REVIEW}/get-hotel-rating-summary?hotelId=${world.hotelB._id.toString()}`)
      .set(auth(world.studentToken));

    expect(own.body.data.hotelId).toBe(world.hotelB._id.toString());
    expect(explicit.body.data.hotelId).toBe(world.hotelB._id.toString());
    expect(explicit.body.data.averageRating).toBe(2);
  });

  it("returns a zeroed summary for a hotel with no reviews", async () => {
    const res = await request(app)
      .get(`${REVIEW}/get-hotel-rating-summary?hotelId=${world.hotelB._id.toString()}`)
      .set(auth(world.studentToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totalReviews: 0,
      ratedReviews: 0,
      averageRating: null,
    });
  });

  it("404s for a hotel that does not exist", async () => {
    const res = await request(app)
      .get(`${REVIEW}/get-hotel-rating-summary?hotelId=${newId().toString()}`)
      .set(auth(world.studentToken));

    expect(res.status).toBe(404);
  });

  it("returns 404 for a malformed hotelId instead of leaking a driver error", async () => {
    const res = await request(app)
      .get(`${REVIEW}/get-hotel-rating-summary?hotelId=not-an-id`)
      .set(auth(world.studentToken));

    expect(res.status).toBe(404);
    expect(res.body.message).not.toMatch(/CastError|Mongo/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Cross-tenant scoping on hotel-owned reads
// ═════════════════════════════════════════════════════════════════════════════

describe("hotel-scoped reads cannot widen to every hotel", () => {
  /**
   * `hotelId` is optional in the repository filter and Mongoose strips
   * `undefined` values when casting, so an unscoped caller would otherwise
   * receive every hotel's reviews. Both hotels have data here to prove it.
   */
  beforeEach(() => {
    seedLegacyReview({
      userId: world.student._id,
      postedBy: UserRole.STUDENT,
      hotelId: world.hotelA._id,
      gigId: world.gigA._id,
      rating: 5,
      review: "Hotel A review",
    });
    seedLegacyReview({
      userId: world.secondStudent._id,
      postedBy: UserRole.STUDENT,
      hotelId: world.hotelB._id,
      gigId: world.gigB._id,
      rating: 2,
      review: "Hotel B review",
    });
  });

  it.each([
    ["get-gig-reviews-for-hotel"],
    ["get-gig-review-posted-by-hotel"],
  ])("GET /%s rejects a caller with no hotel membership (403, not a leak)", async (path) => {
    const res = await request(app).get(`${REVIEW}/${path}`).set(auth(world.studentToken));

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
    expect(res.body.message).toMatch(/hotel context/i);
  });

  it.each([["get-gig-reviews-for-hotel"], ["get-gig-review-posted-by-hotel"]])(
    "GET /%s returns only the caller's own hotel",
    async (path) => {
      const res = await request(app).get(`${REVIEW}/${path}`).set(auth(world.hrAToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].review).toBe("Hotel A review");
    },
  );
});

// ═════════════════════════════════════════════════════════════════════════════
// Hotel-account scoping
// ═════════════════════════════════════════════════════════════════════════════

describe("hotel account tokens", () => {
  it("scopes hotel reads to the hotel the token belongs to", async () => {
    seedLegacyReview({
      userId: world.student._id,
      postedBy: UserRole.STUDENT,
      hotelId: world.hotelA._id,
      gigId: world.gigA._id,
      rating: 5,
    });
    seedLegacyReview({
      userId: world.secondStudent._id,
      postedBy: UserRole.STUDENT,
      hotelId: world.hotelB._id,
      gigId: world.gigB._id,
      rating: 2,
    });

    const res = await request(app)
      .get(`${REVIEW}/get-gig-reviews-for-hotel`)
      .set(auth(world.hotelAToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].hotelId).toBe(world.hotelA._id.toString());
  });

  it("cannot post reviews: a hotel account is not a User", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.hotelAToken))
      .send({ rating: 5 });

    expect(res.status).toBe(403);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Data integrity of what is persisted
// ═════════════════════════════════════════════════════════════════════════════

describe("persisted review integrity", () => {
  it("answers who / whom / why / where / when for a gig review", async () => {
    await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.studentToken))
      .send({ gigId: world.gigA.id, rating: 5, review: "Well run shift" });

    const doc = ReviewModel.docs[0];
    expect(doc.userId.toString()).toBe(world.student._id.toString()); // who
    expect(doc.revieweeId.toString()).toBe(world.hotelA._id.toString()); // whom
    expect(doc.reviewRelationship).toBe(ReviewRelationship.STUDENT_TO_HOTEL); // why
    expect(doc.bookingId.toString()).toBe(world.completedBooking._id.toString()); // why (proof)
    expect(doc.hotelId.toString()).toBe(world.hotelA._id.toString()); // where
    expect(doc.gigId.toString()).toBe(world.gigA._id.toString()); // where
    expect(doc.rating).toBe(5); // what
    expect(doc.review).toBe("Well run shift"); // what
    expect(doc.createdAt).toBeInstanceOf(Date); // when
    expect(doc.updatedAt).toBeInstanceOf(Date);
  });

  it("does not persist undefined optional fields", async () => {
    await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.employeeAToken))
      .send({ rating: 4 });

    const doc = ReviewModel.docs[0];
    expect("gigId" in doc).toBe(false);
    expect("bookingId" in doc).toBe(false);
    expect("jobId" in doc).toBe(false);
    expect("revieweeRole" in doc).toBe(false);
  });

  it("stores a client jobId as a pass-through without letting it affect authorization", async () => {
    const jobId = newId();
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.employeeAToken))
      .send({ rating: 4, jobId: jobId.toString() });

    expect(res.status).toBe(201);
    expect(res.body.data.jobId).toBe(jobId.toString());
    expect(res.body.data.reviewType).toBe("EMPLOYMENT");
  });

  it("drops a malformed jobId rather than casting it into a query", async () => {
    const res = await request(app)
      .post(`${REVIEW}/create-review`)
      .set(auth(world.employeeAToken))
      .send({ rating: 4, jobId: "not-an-id" });

    expect(res.status).toBe(201);
    expect(res.body.data.jobId).toBeUndefined();
  });
});
