import mongoose from "mongoose";
import { BookingModel } from "../gigs/booking.model";
import { GigModel } from "../gigs/gig.model";
import { HotelModel } from "../hotel/hotel.model";
import { UserModel } from "../users/user.model";
import { BookingStatus, UserRole, UserStatus } from "../../shared/enums";

/**
 * Lean projections of the authoritative records the eligibility engine needs.
 *
 * The review module deliberately does NOT introduce any new relationship
 * concept: `Booking` already *is* the gig assignment, `User.hotelId` already
 * *is* the employment / organisation membership, and `Gig.hotelId` already
 * links a gig to a hotel. This gateway is a read-only seam over those existing
 * documents so the business rules can be unit-tested without a database.
 */

export interface ReviewUserRecord {
  _id: string;
  role: UserRole;
  hotelId: string | null;
  status?: UserStatus;
}

export interface ReviewHotelRecord {
  _id: string;
  name?: string;
  isActive?: boolean;
}

export interface ReviewGigRecord {
  /** Mongo _id — what `Review.gigId` stores. */
  _id: string;
  /** Secondary public id (`GIG_xxx`) — what clients send and `Booking.gigId` stores. */
  id: string;
  hotelId: string;
  postedBy?: string | null;
}

export interface ReviewBookingRecord {
  _id: string;
  id: string;
  gigId: string;
  gigHotelId: string;
  workerId: string;
  status: BookingStatus;
  completedAt?: Date | null;
}

export interface ReviewDataGateway {
  findUserById(userId: string): Promise<ReviewUserRecord | null>;
  findHotelById(hotelId: string): Promise<ReviewHotelRecord | null>;
  /** Resolves the secondary `GIG_xxx` id used by clients and by `Booking.gigId`. */
  findGigBySecondaryId(gigId: string): Promise<ReviewGigRecord | null>;
  /** Any booking for (worker, gig) regardless of status — lets us tell "never assigned" from "not completed". */
  findBooking(workerId: string, gigSecondaryId: string): Promise<ReviewBookingRecord | null>;
  /** All COMPLETED bookings for a gig, optionally scoped to one hotel. */
  findCompletedBookingsForGig(
    gigSecondaryId: string,
    hotelId?: string,
  ): Promise<ReviewBookingRecord[]>;
}

const toIdString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  return String(value);
};

export class MongooseReviewDataGateway implements ReviewDataGateway {
  async findUserById(userId: string): Promise<ReviewUserRecord | null> {
    if (!mongoose.isValidObjectId(userId)) return null;

    const user = await UserModel.findById(userId)
      .select("_id role hotelId status")
      .lean();
    if (!user) return null;

    return {
      _id: String(user._id),
      role: user.role as UserRole,
      hotelId: toIdString((user as any).hotelId),
      status: (user as any).status as UserStatus | undefined,
    };
  }

  async findHotelById(hotelId: string): Promise<ReviewHotelRecord | null> {
    if (!mongoose.isValidObjectId(hotelId)) return null;

    const hotel = await HotelModel.findById(hotelId)
      .select("_id name isActive")
      .lean();
    if (!hotel) return null;

    return {
      _id: String(hotel._id),
      name: (hotel as any).name,
      isActive: (hotel as any).isActive,
    };
  }

  async findGigBySecondaryId(gigId: string): Promise<ReviewGigRecord | null> {
    if (!gigId) return null;

    // Clients (and `Booking.gigId`) reference gigs by their secondary id.
    const query = mongoose.isValidObjectId(gigId)
      ? { $or: [{ id: gigId }, { _id: new mongoose.Types.ObjectId(gigId) }] }
      : { id: gigId };

    const gig = await GigModel.findOne(query)
      .select("_id id hotelId postedBy")
      .lean();
    if (!gig) return null;

    return {
      _id: String(gig._id),
      id: (gig as any).id,
      hotelId: String((gig as any).hotelId),
      postedBy: toIdString((gig as any).postedBy),
    };
  }

  async findBooking(
    workerId: string,
    gigSecondaryId: string,
  ): Promise<ReviewBookingRecord | null> {
    if (!mongoose.isValidObjectId(workerId) || !gigSecondaryId) return null;

    const booking = await BookingModel.findOne({
      gigId: gigSecondaryId,
      workerId: new mongoose.Types.ObjectId(workerId),
    })
      .select("_id id gigId gigHotelId workerId status completedAt")
      .lean();
    if (!booking) return null;

    return this.mapBooking(booking);
  }

  async findCompletedBookingsForGig(
    gigSecondaryId: string,
    hotelId?: string,
  ): Promise<ReviewBookingRecord[]> {
    if (!gigSecondaryId) return [];

    const query: Record<string, unknown> = {
      gigId: gigSecondaryId,
      status: BookingStatus.COMPLETED,
    };
    if (hotelId && mongoose.isValidObjectId(hotelId)) {
      query.gigHotelId = new mongoose.Types.ObjectId(hotelId);
    }

    const bookings = await BookingModel.find(query)
      .select("_id id gigId gigHotelId workerId status completedAt")
      .limit(100)
      .lean();

    return bookings.map((booking) => this.mapBooking(booking));
  }

  private mapBooking(booking: any): ReviewBookingRecord {
    return {
      _id: String(booking._id),
      id: booking.id,
      gigId: String(booking.gigId),
      gigHotelId: String(booking.gigHotelId),
      workerId: String(booking.workerId),
      status: booking.status as BookingStatus,
      completedAt: booking.completedAt ?? null,
    };
  }
}
