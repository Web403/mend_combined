import mongoose from "mongoose";
import {
  BookingStatus,
  GigApplicationStatus,
  GigStatus,
  UserRole,
} from "../../src/shared/enums";
import { GigApplicationService } from "../../src/modules/gigs/gig-application.service";

function makeWorld() {
  const hotelId = new mongoose.Types.ObjectId();
  const organizerA = new mongoose.Types.ObjectId().toString();
  const organizerB = new mongoose.Types.ObjectId().toString();
  const gigA: any = {
    id: "GIG_A",
    hotelId,
    title: "Event server",
    postedBy: organizerA,
    status: GigStatus.OPEN,
    slots: 1,
    filledSlots: 0,
    startAt: new Date(Date.now() + 86_400_000),
    endAt: new Date(Date.now() + 172_800_000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const gigB: any = {
    ...gigA,
    id: "GIG_B",
    postedBy: organizerB,
    slots: 2,
  };
  const gigs = [gigA, gigB];
  const applications: any[] = [];
  const preferences = new Map<string, any>();
  const bookings: any[] = [];
  const outstandingRatings = new Set<string>();
  const applicantRoles = new Map<string, string>();

  const preferenceKey = (organizerId: string, workerId: string) =>
    `${organizerId}:${workerId}`;

  const gigRepo: any = {
    findById: async (id: string) => gigs.find((gig) => gig.id === id) ?? null,
    findByIdAndHotel: async (hotel: string, id: string) =>
      gigs.find((gig) => gig.id === id && String(gig.hotelId) === hotel) ?? null,
    reserveSlot: async (id: string, capacity: number) => {
      const gig = gigs.find((item) => item.id === id);
      if (!gig || gig.status !== GigStatus.OPEN || gig.filledSlots >= capacity) return null;
      gig.filledSlots += 1;
      return gig;
    },
    releaseSlot: async (id: string) => {
      const gig = gigs.find((item) => item.id === id);
      if (!gig || gig.filledSlots <= 0) return null;
      gig.filledSlots -= 1;
      return gig;
    },
    update: async (_hotel: string, id: string, data: any) => {
      const gig = gigs.find((item) => item.id === id);
      if (!gig) return null;
      Object.assign(gig, data);
      return gig;
    },
  };

  const applicationRepo: any = {
    create: async (data: any) => {
      const now = new Date();
      const application = {
        _id: new mongoose.Types.ObjectId(),
        createdAt: now,
        updatedAt: now,
        priorityVote: 0,
        isBlocked: false,
        ...data,
      };
      applications.push(application);
      return application;
    },
    findById: async (id: string) => applications.find((app) => app.id === id) ?? null,
    findByGigAndApplicant: async (gigId: string, applicantId: string) =>
      applications.find(
        (app) => app.gigId === gigId && String(app.applicantId) === applicantId,
      ) ?? null,
    update: async (id: string, data: any) => {
      const app = applications.find((item) => item.id === id);
      if (!app) return null;
      Object.assign(app, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)));
      app.updatedAt = new Date();
      return app;
    },
    updateIfStatus: async (id: string, status: string, data: any) => {
      const app = applications.find((item) => item.id === id && item.status === status);
      if (!app) return null;
      Object.assign(app, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)));
      app.updatedAt = new Date();
      return app;
    },
    reapplyWithdrawn: async (id: string, data: any) => {
      const app = applications.find((item) => item.id === id && item.status === GigApplicationStatus.WITHDRAWN);
      if (!app) return null;
      for (const key of ["reviewedAt", "reviewedBy", "recruiterNotes", "bookingId", "blockReason"]) delete app[key];
      Object.assign(app, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)));
      return app;
    },
    updatePendingForOrganizerAndApplicant: async (organizerId: string, applicantId: string, data: any) => {
      let count = 0;
      for (const app of applications) {
        if (
          app.organizerId === organizerId &&
          String(app.applicantId) === applicantId &&
          app.status === GigApplicationStatus.APPLIED
        ) {
          Object.assign(app, data);
          count += 1;
        }
      }
      return count;
    },
    findByGig: async (gigId: string, options: any = {}) => {
      const rows = applications
        .filter((app) => app.gigId === gigId && (!options.filters?.status || app.status === options.filters.status))
        .sort((a, b) => b.priorityVote - a.priorityVote || a.appliedAt.getTime() - b.appliedAt.getTime());
      const page = options.page ?? 1;
      const limit = options.limit ?? 25;
      return { applications: rows.slice((page - 1) * limit, page * limit), total: rows.length };
    },
    findByApplicant: async (workerId: string) => ({
      applications: applications.filter((app) => String(app.applicantId) === workerId),
      total: applications.filter((app) => String(app.applicantId) === workerId).length,
    }),
    revertApproval: async (id: string) => {
      const app = applications.find((item) => item.id === id);
      if (app) {
        app.status = GigApplicationStatus.APPLIED;
        for (const key of ["reviewedAt", "reviewedBy", "recruiterNotes", "bookingId"]) delete app[key];
      }
    },
    clearBlock: async (id: string) => {
      const app = applications.find((item) => item.id === id);
      if (!app) return null;
      app.isBlocked = false;
      delete app.blockReason;
      return app;
    },
  };

  const preferenceRepo: any = {
    find: async (organizerId: string, workerId: string) =>
      preferences.get(preferenceKey(organizerId, workerId)) ?? null,
    upsert: async (organizerId: string, tenantId: string, workerId: string, data: any) => {
      const key = preferenceKey(organizerId, workerId);
      const current = preferences.get(key) ?? {
        organizerId,
        hotelId: new mongoose.Types.ObjectId(tenantId),
        workerId: new mongoose.Types.ObjectId(workerId),
        vote: 0,
        isBlocked: false,
      };
      Object.assign(current, data);
      preferences.set(key, current);
      return current;
    },
    clearBlock: async (organizerId: string, workerId: string) => {
      const preference = preferences.get(preferenceKey(organizerId, workerId));
      if (!preference?.isBlocked) return null;
      preference.isBlocked = false;
      delete preference.blockReason;
      delete preference.blockedAt;
      delete preference.blockedBy;
      return preference;
    },
  };

  const bookingRepo: any = {
    hasOutstandingWorkerRating: async (workerId: string) => outstandingRatings.has(workerId),
    create: async (data: any) => {
      const booking = {
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      bookings.push(booking);
      return booking;
    },
    deleteByApplicationId: async (applicationId: string) => {
      const index = bookings.findIndex((booking) => booking.applicationId === applicationId);
      if (index >= 0) bookings.splice(index, 1);
    },
  };

  const service = new GigApplicationService({
    gigRepo,
    applicationRepo,
    preferenceRepo,
    bookingRepo,
    findApplicant: async (id) => ({
      role: applicantRoles.get(id) ?? UserRole.STUDENT,
      status: "ACTIVE",
    }),
  });

  return {
    service,
    hotelId,
    organizerA,
    organizerB,
    gigA,
    gigB,
    applications,
    preferences,
    bookings,
    outstandingRatings,
    applicantRoles,
  };
}

const freelancer = () => new mongoose.Types.ObjectId().toString();

describe("GigApplicationService", () => {
  it("creates a pending application and hires only after organizer approval", async () => {
    const world = makeWorld();
    const workerId = freelancer();
    const applied = await world.service.applyToGig(workerId, world.gigA.id, {
      coverNote: "Experienced event server",
    });

    expect(applied.status).toBe(GigApplicationStatus.APPLIED);
    expect(world.bookings).toHaveLength(0);
    const hired = await world.service.approveApplication(
      world.organizerA,
      String(world.hotelId),
      applied.id,
      false,
    );

    expect(hired.status).toBe(GigApplicationStatus.APPROVED);
    expect(hired.bookingId).toBeDefined();
    expect(world.bookings[0].status).toBe(BookingStatus.CONFIRMED);
    expect(world.gigA.filledSlots).toBe(1);
    expect(world.gigA.status).toBe(GigStatus.FULL);
  });

  it("reopens a withdrawn application without creating a duplicate or retaining stale review data", async () => {
    const world = makeWorld();
    const workerId = freelancer();
    const original = await world.service.applyToGig(workerId, world.gigA.id, {
      coverNote: "First attempt",
    });
    Object.assign(world.applications[0], {
      status: GigApplicationStatus.WITHDRAWN,
      reviewedAt: new Date(),
      reviewedBy: world.organizerA,
      recruiterNotes: "Old notes",
      bookingId: "BKG_OLD",
      blockReason: "Old block reason",
    });

    const resubmitted = await world.service.applyToGig(workerId, world.gigA.id, {
      coverNote: "Updated availability",
    });

    expect(resubmitted.id).toBe(original.id);
    expect(resubmitted.status).toBe(GigApplicationStatus.APPLIED);
    expect(resubmitted.coverNote).toBe("Updated availability");
    expect(world.applications).toHaveLength(1);
    expect(world.applications[0]).not.toHaveProperty("reviewedAt");
    expect(world.applications[0]).not.toHaveProperty("recruiterNotes");
    expect(world.applications[0]).not.toHaveProperty("bookingId");
    expect(world.applications[0]).not.toHaveProperty("blockReason");
  });

  it("ranks applicants by the organizer's persistent upvote/downvote", async () => {
    const world = makeWorld();
    const workerA = freelancer();
    const workerB = freelancer();
    const appA = await world.service.applyToGig(workerA, world.gigA.id);
    const appB = await world.service.applyToGig(workerB, world.gigA.id);

    await world.service.voteForFreelancer(
      world.organizerA,
      String(world.hotelId),
      appB.id,
      1,
      false,
    );
    let result = await world.service.getApplicationsForGig(
      world.organizerA,
      String(world.hotelId),
      world.gigA.id,
      false,
    );
    expect(result.applications.map((application) => application.id)).toEqual([appB.id, appA.id]);

    await world.service.voteForFreelancer(
      world.organizerA,
      String(world.hotelId),
      appB.id,
      -1,
      false,
    );
    result = await world.service.getApplicationsForGig(
      world.organizerA,
      String(world.hotelId),
      world.gigA.id,
      false,
    );
    expect(result.applications.map((application) => application.id)).toEqual([appA.id, appB.id]);
  });

  it("keeps a freelancer block private to the organizer who set it", async () => {
    const world = makeWorld();
    const workerId = freelancer();
    const application = await world.service.applyToGig(workerId, world.gigA.id);

    await world.service.blockFreelancer(
      world.organizerA,
      String(world.hotelId),
      application.id,
      "Inappropriate conduct at the event",
      false,
    );
    await expect(world.service.applyToGig(workerId, world.gigA.id)).rejects.toMatchObject({
      statusCode: 403,
    });

    const otherOrganizerApplication = await world.service.applyToGig(workerId, world.gigB.id);
    expect(otherOrganizerApplication.status).toBe(GigApplicationStatus.APPLIED);
  });

  it("blocks non-freelancer users and requires ratings from newly completed gigs", async () => {
    const world = makeWorld();
    const managerId = freelancer();
    world.applicantRoles.set(managerId, UserRole.MANAGER);
    await expect(world.service.applyToGig(managerId, world.gigA.id)).rejects.toMatchObject({
      statusCode: 403,
    });

    const workerId = freelancer();
    world.outstandingRatings.add(workerId);
    await expect(world.service.applyToGig(workerId, world.gigA.id)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(world.applications).toHaveLength(0);
  });

  it("requires a reason to block and permits organizer-scoped unblock", async () => {
    const world = makeWorld();
    const workerId = freelancer();
    const application = await world.service.applyToGig(workerId, world.gigA.id);

    await expect(
      world.service.blockFreelancer(
        world.organizerA,
        String(world.hotelId),
        application.id,
        " ",
        false,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });

    await world.service.blockFreelancer(
      world.organizerA,
      String(world.hotelId),
      application.id,
      "Do not hire",
      false,
    );
    const preference = await world.service.unblockFreelancer(
      world.organizerA,
      String(world.hotelId),
      application.id,
      false,
    );
    expect(preference.isBlocked).toBe(false);
  });
});
