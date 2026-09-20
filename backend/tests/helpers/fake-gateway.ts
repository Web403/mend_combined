/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * In-memory `ReviewDataGateway` used by the eligibility unit tests.
 *
 * The eligibility engine depends only on this narrow read seam, so the business
 * rules can be asserted exhaustively without any database.
 */

import { BookingStatus, UserRole } from "../../src/shared/enums";
import type {
  ReviewBookingRecord,
  ReviewDataGateway,
  ReviewGigRecord,
  ReviewHotelRecord,
  ReviewUserRecord,
} from "../../src/modules/review/review.gateway";

export interface FakeWorld {
  users: ReviewUserRecord[];
  hotels: ReviewHotelRecord[];
  gigs: ReviewGigRecord[];
  bookings: ReviewBookingRecord[];
}

export function emptyWorld(): FakeWorld {
  return { users: [], hotels: [], gigs: [], bookings: [] };
}

export function createFakeGateway(world: FakeWorld): ReviewDataGateway {
  return {
    async findUserById(userId: string) {
      return world.users.find((user) => user._id === String(userId)) ?? null;
    },
    async findHotelById(hotelId: string) {
      return world.hotels.find((hotel) => hotel._id === String(hotelId)) ?? null;
    },
    async findGigBySecondaryId(gigId: string) {
      return (
        world.gigs.find((gig) => gig.id === gigId || gig._id === gigId) ?? null
      );
    },
    async findBooking(workerId: string, gigSecondaryId: string) {
      return (
        world.bookings.find(
          (booking) =>
            String(booking.workerId) === String(workerId) &&
            booking.gigId === gigSecondaryId,
        ) ?? null
      );
    },
    async findCompletedBookingsForGig(gigSecondaryId: string, hotelId?: string) {
      return world.bookings.filter(
        (booking) =>
          booking.gigId === gigSecondaryId &&
          booking.status === BookingStatus.COMPLETED &&
          (!hotelId || String(booking.gigHotelId) === String(hotelId)),
      );
    },
  };
}

// ── Record builders ───────────────────────────────────────────────────────────

let counter = 0;
export const oid = () => `507f1f77bcf86cd79943${String(++counter).padStart(4, "0")}`;

export function hotel(overrides: Partial<ReviewHotelRecord> = {}): ReviewHotelRecord {
  return { _id: oid(), name: "Test Hotel", isActive: true, ...overrides };
}

export function user(
  role: UserRole,
  hotelRecord: ReviewHotelRecord | null,
  overrides: Partial<ReviewUserRecord> = {},
): ReviewUserRecord {
  return {
    _id: oid(),
    role,
    hotelId: hotelRecord ? hotelRecord._id : null,
    ...overrides,
  };
}

export function gig(
  hotelRecord: ReviewHotelRecord,
  overrides: Partial<ReviewGigRecord> = {},
): ReviewGigRecord {
  return {
    _id: oid(),
    id: `GIG_${Math.random().toString(36).slice(2, 8)}`,
    hotelId: hotelRecord._id,
    postedBy: null,
    ...overrides,
  };
}

export function booking(
  gigRecord: ReviewGigRecord,
  worker: ReviewUserRecord,
  status: BookingStatus = BookingStatus.COMPLETED,
  overrides: Partial<ReviewBookingRecord> = {},
): ReviewBookingRecord {
  return {
    _id: oid(),
    id: `BKG_${Math.random().toString(36).slice(2, 8)}`,
    gigId: gigRecord.id,
    gigHotelId: gigRecord.hotelId,
    workerId: worker._id,
    status,
    completedAt: status === BookingStatus.COMPLETED ? new Date() : null,
    ...overrides,
  };
}
