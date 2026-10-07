import mongoose from "mongoose";
import { BookingStatus, GigStatus } from "../../src/shared/enums";
import { BookingService } from "../../src/modules/gigs/booking.service";

describe("BookingService two-way gig ratings", () => {
  function setup() {
    const hotelId = new mongoose.Types.ObjectId();
    const workerId = new mongoose.Types.ObjectId();
    const organizerId = new mongoose.Types.ObjectId();
    const booking: any = {
      id: "BKG_1",
      hotelId,
      gigId: "GIG_1",
      gigHotelId: hotelId,
      workerId,
      status: BookingStatus.CONFIRMED,
      confirmedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const gig: any = {
      id: "GIG_1",
      hotelId,
      postedBy: organizerId.toString(),
      status: GigStatus.CLOSED,
      startAt: new Date(Date.now() - 60_000),
      endAt: new Date(Date.now() - 1_000),
    };
    const bookingRepo: any = {
      findById: async (id: string) => (id === booking.id ? booking : null),
      update: async (_id: string, data: any) => {
        Object.assign(booking, data);
        booking.updatedAt = new Date();
        return booking;
      },
      findByGig: async () => ({ bookings: [booking], total: 1 }),
      findByWorker: async () => ({ bookings: [booking], total: 1 }),
    };
    const gigRepo: any = {
      findById: async (id: string) => (id === gig.id ? gig : null),
      findByIdAndHotel: async (_hotel: string, id: string) => (id === gig.id ? gig : null),
      incrementFilledSlots: async () => gig,
      update: async () => gig,
    };
    return {
      service: new BookingService({ bookingRepo, gigRepo }),
      booking,
      hotelId,
      workerId,
      organizerId,
    };
  }

  it("keeps event-manager booking actions scoped to their own postings", async () => {
    const { service, booking, hotelId } = setup();
    await expect(
      service.completeBooking(
        new mongoose.Types.ObjectId().toString(),
        hotelId.toString(),
        booking.id,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("marks a new completion as requiring the freelancer's caterer rating", async () => {
    const { service, booking, hotelId, organizerId } = setup();
    const completed = await service.completeBooking(
      organizerId.toString(),
      hotelId.toString(),
      booking.id,
    );
    expect(completed.status).toBe(BookingStatus.COMPLETED);
    expect(completed.workerRatingRequired).toBe(true);
  });

  it("lets only the assigned freelancer rate the caterer once after completion", async () => {
    const { service, booking, workerId } = setup();
    booking.status = BookingStatus.COMPLETED;
    booking.workerRatingRequired = true;

    await expect(
      service.rateOrganizer(new mongoose.Types.ObjectId().toString(), booking.id, 5),
    ).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.rateOrganizer(workerId.toString(), booking.id, 6)).rejects.toMatchObject({
      statusCode: 400,
    });

    const result = await service.rateOrganizer(
      workerId.toString(),
      booking.id,
      5,
      "Well-organized event",
    );
    expect(result.workerRating).toBe(5);
    expect(result.workerReview).toBe("Well-organized event");
    await expect(service.rateOrganizer(workerId.toString(), booking.id, 4)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("scopes organizer ratings to the booking's tenant", async () => {
    const { service, booking, hotelId } = setup();
    booking.status = BookingStatus.COMPLETED;

    await expect(
      service.rateBooking(
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString(),
        booking.id,
        4,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });

    const rating = await service.rateBooking(
      new mongoose.Types.ObjectId().toString(),
      hotelId.toString(),
      booking.id,
      4,
      undefined,
      true,
    );
    expect(rating.rating).toBe(4);
  });
});
