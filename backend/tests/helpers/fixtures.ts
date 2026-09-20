/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Shared fixtures for the review tests.
 *
 * Builds a small, explicit world — two hotels, hotel staff (HR / manager /
 * employee), gig workers, gigs and bookings — so every test states exactly which
 * relationship it is exercising instead of depending on hidden setup.
 */

import mongoose from "mongoose";
import { signToken } from "../../src/core/utils/jwt.helper";
import { env } from "../../src/config/env";
import { BookingStatus, UserRole } from "../../src/shared/enums";
import { createMemoryModel, MemoryModel } from "./memory-db";
import {
  RevieweeRef,
  ReviewRelationship,
  ReviewType,
  UserRole as UserRoleEnum,
} from "../../src/shared/enums";

export const newId = () => new mongoose.Types.ObjectId();
export const idString = () => newId().toString();

// ── Model doubles ─────────────────────────────────────────────────────────────

export const UserModel: MemoryModel = createMemoryModel("User", "users", {
  required: ["email", "role"],
  enums: { role: Object.values(UserRoleEnum) },
});

export const HotelModel: MemoryModel = createMemoryModel("Hotel", "hotels", {
  required: ["name"],
});

export const GigModel: MemoryModel = createMemoryModel("Gig", "gigs", {
  required: ["id", "hotelId", "title"],
});

export const BookingModel: MemoryModel = createMemoryModel("Booking", "bookings", {
  required: ["id", "gigId", "workerId"],
  enums: { status: Object.values(BookingStatus) },
  uniqueIndexes: [{ name: "gigId_1_workerId_1", fields: ["gigId", "workerId"] }],
});

/**
 * The review double reproduces the production index declarations, including the
 * partial unique index that prevents duplicate reviews — so the concurrency test
 * really is testing the constraint, not a stub.
 */
export const ReviewModel: MemoryModel = createMemoryModel("Review", "reviews", {
  required: ["id", "userId", "hotelId", "reviewType", "postedBy"],
  enums: {
    reviewType: Object.values(ReviewType),
    postedBy: Object.values(UserRoleEnum),
    reviewRelationship: Object.values(ReviewRelationship),
    revieweeRef: Object.values(RevieweeRef),
  },
  timestamps: true,
  uniqueIndexes: [
    { name: "id_1", fields: ["id"] },
    {
      name: "uniq_review_relationship",
      fields: ["userId", "reviewRelationship", "revieweeId", "hotelId", "gigId"],
      partialFieldExists: "reviewRelationship",
    },
  ],
});

export function resetWorld() {
  UserModel.reset();
  HotelModel.reset();
  GigModel.reset();
  BookingModel.reset();
  ReviewModel.reset();
}

// ── Domain builders ───────────────────────────────────────────────────────────

export function makeHotel(name = "Hotel A") {
  const hotel = { _id: newId(), id: `HTL_${name.replace(/\s+/g, "")}`, name };
  HotelModel.insertRaw(hotel);
  return hotel;
}

export function makeUser(
  role: UserRole,
  hotel: { _id: mongoose.Types.ObjectId } | null,
  overrides: Record<string, any> = {},
) {
  const user = {
    _id: newId(),
    id: `user_${Math.random().toString(36).slice(2, 10)}`,
    email: `${role.toLowerCase()}_${Math.random().toString(36).slice(2, 8)}@mend.test`,
    role,
    hotelId: hotel ? hotel._id : undefined,
    status: "ACTIVE",
    profile: { firstName: "Test", lastName: role },
    ...overrides,
  };
  UserModel.insertRaw(user);
  return user;
}

export function makeGig(
  hotel: { _id: mongoose.Types.ObjectId },
  overrides: Record<string, any> = {},
) {
  const gig = {
    _id: newId(),
    id: `GIG_${Math.random().toString(36).slice(2, 10)}`,
    hotelId: hotel._id,
    title: "Banquet service",
    department: "Food & Beverage",
    slots: 2,
    filledSlots: 1,
    startAt: new Date(Date.now() - 86_400_000 * 2),
    endAt: new Date(Date.now() - 86_400_000),
    rateAmount: 500,
    rateUnit: "HOURLY",
    status: "CLOSED",
    postedBy: null as string | null,
    employmentType: "Gig",
    ...overrides,
  };
  GigModel.insertRaw(gig);
  return gig;
}

export function makeBooking(
  gig: { id: string; hotelId: mongoose.Types.ObjectId },
  worker: { _id: mongoose.Types.ObjectId },
  status: BookingStatus = BookingStatus.COMPLETED,
  overrides: Record<string, any> = {},
) {
  const booking = {
    _id: newId(),
    id: `BKG_${Math.random().toString(36).slice(2, 10)}`,
    hotelId: gig.hotelId,
    gigId: gig.id,
    gigHotelId: gig.hotelId,
    workerId: worker._id,
    status,
    confirmedAt: new Date(Date.now() - 86_400_000 * 3),
    completedAt: status === BookingStatus.COMPLETED ? new Date() : undefined,
    ...overrides,
  };
  BookingModel.insertRaw(booking);
  return booking;
}

/** Signs a token shaped exactly like `AuthService.login` produces. */
export function tokenFor(user: {
  _id: mongoose.Types.ObjectId;
  role: UserRole;
  hotelId?: mongoose.Types.ObjectId;
}): string {
  return signToken(
    {
      sub: user._id.toString(),
      roles: [user.role],
      departmentType: undefined,
      departmentRole: undefined,
      hotelId: user.hotelId ? user.hotelId.toString() : undefined,
    },
    env.JWT_SECRET,
    "15m" as any,
  );
}

/** Signs a token for a hotel account (`sub` is the hotel id, role "HOTEL"). */
export function hotelTokenFor(hotel: { _id: mongoose.Types.ObjectId }): string {
  return signToken(
    { sub: hotel._id.toString(), roles: ["HOTEL"] },
    env.JWT_SECRET,
    "15m" as any,
  );
}
