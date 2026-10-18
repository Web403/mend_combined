import { Types } from "mongoose";
import { LeaveRequestService } from "../../src/modules/leave/leave-request.service";
import { LeaveRequestStatus, LeaveType, DayOffType } from "../../src/shared/enums/leave.enum";
import { UserRole, UserStatus } from "../../src/shared/enums/user";
import { LeaveError } from "../../src/modules/leave/leave.error";
import { clock, createFakeWorld, d, ownerActor, userActor } from "./leave.fakes";

const HOTEL = new Types.ObjectId().toString();
const OTHER_HOTEL = new Types.ObjectId().toString();

function setup() {
  const world = createFakeWorld();
  const service = new LeaveRequestService({
    requests: world.requestRepo,
    dayOffs: world.dayOffRepo,
    employees: world.employeeRepo,
    roster: world.rosterRepo,
    clock,
  });
  const emp1 = world.addEmployee(HOTEL, { first: "Ravi", last: "Kumar" });
  const emp2 = world.addEmployee(HOTEL, { first: "Meera", last: "Shah" });
  const manager = world.addEmployee(HOTEL, { role: UserRole.MANAGER, first: "Priya", last: "Nair" });
  const otherHotelManager = world.addEmployee(OTHER_HOTEL, { role: UserRole.MANAGER });
  return { world, service, emp1, emp2, manager, otherHotelManager };
}

const leave = (overrides: Record<string, unknown> = {}) => ({
  type: "CASUAL",
  fromDate: "2026-11-02",
  toDate: "2026-11-04",
  reason: "Family function",
  ...overrides,
});

const expectLeaveError = async (promise: Promise<unknown>, code: string, status?: number) => {
  await expect(promise).rejects.toBeInstanceOf(LeaveError);
  await expect(promise).rejects.toMatchObject({ code, ...(status ? { statusCode: status } : {}) });
};

describe("LeaveRequestService — submitting", () => {
  it("creates a PENDING request with the employee summary attached", async () => {
    const { service, emp1 } = setup();
    const dto = await service.createRequest(userActor(HOTEL, emp1), leave());

    expect(dto.status).toBe(LeaveRequestStatus.PENDING);
    expect(dto.type).toBe(LeaveType.CASUAL);
    expect(dto.fromDate).toBe("2026-11-02");
    expect(dto.toDate).toBe("2026-11-04");
    expect(dto.leaveDays).toBe(3);
    expect(dto.employee).toEqual({ id: emp1, firstName: "Ravi", lastName: "Kumar", role: UserRole.EMPLOYEE });
    expect(dto.reviewedBy).toBeNull();
  });

  it("does not count the employee's scheduled offs as leave days", async () => {
    const { service, world, emp1 } = setup();
    await world.dayOffRepo.insertMany([
      { hotelId: new Types.ObjectId(HOTEL), userId: new Types.ObjectId(emp1), date: d("2026-11-03"), type: DayOffType.WEEKLY_OFF, assignedBy: "x" },
    ]);
    const dto = await service.createRequest(userActor(HOTEL, emp1), leave());
    expect(dto.leaveDays).toBe(2);
  });

  it("does not count offs belonging to another employee", async () => {
    const { service, world, emp1, emp2 } = setup();
    await world.dayOffRepo.insertMany([
      { hotelId: new Types.ObjectId(HOTEL), userId: new Types.ObjectId(emp2), date: d("2026-11-03"), type: DayOffType.WEEKLY_OFF, assignedBy: "x" },
    ]);
    const dto = await service.createRequest(userActor(HOTEL, emp1), leave());
    expect(dto.leaveDays).toBe(3);
  });

  it("refuses a range that is entirely scheduled offs", async () => {
    const { service, world, emp1 } = setup();
    await world.dayOffRepo.insertMany([
      { hotelId: new Types.ObjectId(HOTEL), userId: new Types.ObjectId(emp1), date: d("2026-11-02"), type: DayOffType.WEEKLY_OFF, assignedBy: "x" },
      { hotelId: new Types.ObjectId(HOTEL), userId: new Types.ObjectId(emp1), date: d("2026-11-03"), type: DayOffType.WEEKLY_OFF, assignedBy: "x" },
    ]);
    await expectLeaveError(
      service.createRequest(userActor(HOTEL, emp1), leave({ toDate: "2026-11-03" })),
      "LEAVE_NO_WORKING_DAYS",
      400,
    );
  });

  it("rejects a request that overlaps a PENDING request", async () => {
    const { service, emp1 } = setup();
    await service.createRequest(userActor(HOTEL, emp1), leave());
    await expectLeaveError(
      service.createRequest(userActor(HOTEL, emp1), leave({ fromDate: "2026-11-04", toDate: "2026-11-06" })),
      "LEAVE_OVERLAP",
      409,
    );
  });

  it("rejects a request that overlaps an APPROVED request", async () => {
    const { service, emp1, manager, world } = setup();
    const first = await service.createRequest(userActor(HOTEL, emp1), leave());
    await service.approveRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), first.id, {});
    await expectLeaveError(
      service.createRequest(userActor(HOTEL, emp1), leave({ toDate: "2026-11-02" })),
      "LEAVE_OVERLAP",
    );
    expect(world.requests).toHaveLength(1);
  });

  it("allows a new request once the overlapping one was rejected or cancelled", async () => {
    const { service, emp1, manager } = setup();
    const first = await service.createRequest(userActor(HOTEL, emp1), leave());
    await service.rejectRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), first.id, { note: "Peak season" });
    const second = await service.createRequest(userActor(HOTEL, emp1), leave());

    await service.cancelRequest(userActor(HOTEL, emp1), second.id);
    await expect(service.createRequest(userActor(HOTEL, emp1), leave())).resolves.toMatchObject({
      status: LeaveRequestStatus.PENDING,
    });
  });

  it("does not block other employees with the same dates", async () => {
    const { service, emp1, emp2 } = setup();
    await service.createRequest(userActor(HOTEL, emp1), leave());
    await expect(service.createRequest(userActor(HOTEL, emp2), leave())).resolves.toMatchObject({
      status: LeaveRequestStatus.PENDING,
    });
  });

  it("refuses a suspended employee", async () => {
    const { service, world } = setup();
    const suspended = world.addEmployee(HOTEL, { status: UserStatus.SUSPENDED });
    await expectLeaveError(service.createRequest(userActor(HOTEL, suspended), leave()), "LEAVE_EMPLOYEE_INACTIVE", 403);
  });

  it("refuses a user whose account is in another hotel", async () => {
    const { service, otherHotelManager } = setup();
    await expectLeaveError(
      service.createRequest(userActor(HOTEL, otherHotelManager, [UserRole.EMPLOYEE]), leave()),
      "LEAVE_EMPLOYEE_INACTIVE",
    );
  });

  it("refuses gig workers, who are not hotel employees", async () => {
    const { service, emp1 } = setup();
    await expectLeaveError(
      service.createRequest(userActor(HOTEL, emp1, [UserRole.STUDENT]), leave()),
      "LEAVE_REQUESTER_FORBIDDEN",
      403,
    );
  });

  it("refuses the hotel-owner account, which has no employee record", async () => {
    const { service } = setup();
    await expectLeaveError(service.createRequest(ownerActor(HOTEL), leave()), "LEAVE_REQUESTER_FORBIDDEN");
  });

  it("ignores client-supplied userId, hotelId and status", async () => {
    const { service, emp1, emp2 } = setup();
    const dto = await service.createRequest(
      userActor(HOTEL, emp1),
      leave({ userId: emp2, hotelId: OTHER_HOTEL, status: "APPROVED" }),
    );
    expect(dto.employeeId).toBe(emp1);
    expect(dto.status).toBe(LeaveRequestStatus.PENDING);
  });

  it("withdraws a racing duplicate when an earlier overlapping request already exists", async () => {
    const { world, emp1 } = setup();
    // The earlier request is already stored, but the submitter's pre-check has not seen it yet.
    const earlier = await world.requestRepo.create({
      hotelId: new Types.ObjectId(HOTEL),
      userId: new Types.ObjectId(emp1),
      type: LeaveType.CASUAL,
      fromDate: d("2026-11-02"),
      toDate: d("2026-11-04"),
      reason: "first",
      status: LeaveRequestStatus.PENDING,
    });
    const racingRepo = {
      ...world.requestRepo,
      // Pre-check (no excludeId) sees nothing; the post-insert rival check sees the earlier request.
      findOverlapping: async (q: any) => (q.excludeId === undefined ? [] : world.requestRepo.findOverlapping(q)),
    };
    const service = new LeaveRequestService({
      requests: racingRepo,
      dayOffs: world.dayOffRepo,
      employees: world.employeeRepo,
      clock,
    });

    await expectLeaveError(service.createRequest(userActor(HOTEL, emp1), leave()), "LEAVE_OVERLAP", 409);
    expect(world.requests).toHaveLength(1);
    expect(String(world.requests[0]._id)).toBe(String(earlier._id));
  });
});

describe("LeaveRequestService — reviewing", () => {
  it("lets a manager approve, recording the reviewer", async () => {
    const { service, emp1, manager } = setup();
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());
    const approved = await service.approveRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), req.id, {
      note: "Covered by Deepak",
    });
    expect(approved.status).toBe(LeaveRequestStatus.APPROVED);
    expect(approved.reviewedBy).toBe(manager);
    expect(approved.reviewNote).toBe("Covered by Deepak");
    expect(approved.reviewedAt).not.toBeNull();
  });

  it("lets the hotel-owner account approve, recording the hotel as reviewer", async () => {
    const { service, emp1 } = setup();
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());
    const approved = await service.approveRequest(ownerActor(HOTEL), req.id, {});
    expect(approved.status).toBe(LeaveRequestStatus.APPROVED);
    expect(approved.reviewedBy).toBe(HOTEL);
  });

  it("lets a manager reject with a note", async () => {
    const { service, emp1, manager } = setup();
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());
    const rejected = await service.rejectRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), req.id, {
      note: "Two staff already off that week",
    });
    expect(rejected.status).toBe(LeaveRequestStatus.REJECTED);
    expect(rejected.reviewNote).toBe("Two staff already off that week");
  });

  it("requires a note to reject", async () => {
    const { service, emp1, manager } = setup();
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());
    await expectLeaveError(
      service.rejectRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), req.id, {}),
      "LEAVE_VALIDATION_FAILED",
    );
  });

  it("refuses an employee who tries to approve", async () => {
    const { service, emp1, emp2 } = setup();
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());
    await expectLeaveError(
      service.approveRequest(userActor(HOTEL, emp2, [UserRole.EMPLOYEE]), req.id, {}),
      "LEAVE_APPROVER_FORBIDDEN",
      403,
    );
  });

  it("refuses a manager reviewing their own leave", async () => {
    const { service, manager } = setup();
    const req = await service.createRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), leave());
    await expectLeaveError(
      service.approveRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), req.id, {}),
      "LEAVE_SELF_REVIEW_FORBIDDEN",
      403,
    );
    await expectLeaveError(
      service.rejectRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), req.id, { note: "no" }),
      "LEAVE_SELF_REVIEW_FORBIDDEN",
    );
  });

  it("lets another manager, or the owner, review a manager's leave", async () => {
    const { service, manager, world } = setup();
    const otherManager = world.addEmployee(HOTEL, { role: UserRole.MANAGER });
    const req = await service.createRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), leave());
    await expect(
      service.approveRequest(userActor(HOTEL, otherManager, [UserRole.MANAGER]), req.id, {}),
    ).resolves.toMatchObject({ status: LeaveRequestStatus.APPROVED });
  });

  it("refuses to decide a request twice", async () => {
    const { service, emp1, manager } = setup();
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());
    const actor = userActor(HOTEL, manager, [UserRole.MANAGER]);
    await service.approveRequest(actor, req.id, {});
    await expectLeaveError(service.approveRequest(actor, req.id, {}), "LEAVE_NOT_PENDING", 409);
    await expectLeaveError(service.rejectRequest(actor, req.id, { note: "late" }), "LEAVE_NOT_PENDING", 409);
  });

  it("refuses to approve a request that was withdrawn meanwhile", async () => {
    const { service, emp1, manager } = setup();
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());
    await service.cancelRequest(userActor(HOTEL, emp1), req.id);
    await expectLeaveError(
      service.approveRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), req.id, {}),
      "LEAVE_NOT_PENDING",
    );
  });

  it("refuses to approve when the manager's own account is no longer active", async () => {
    const { service, emp1, manager, world } = setup();
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());
    world.employees.find((e) => String(e._id) === manager)!.status = UserStatus.SUSPENDED;
    await expectLeaveError(
      service.approveRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), req.id, {}),
      "LEAVE_EMPLOYEE_INACTIVE",
      403,
    );
  });

  it("recomputes leave days at approval, excluding offs assigned after the request", async () => {
    const { service, world, emp1, manager } = setup();
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());
    expect(req.leaveDays).toBe(3);
    await world.dayOffRepo.insertMany([
      { hotelId: new Types.ObjectId(HOTEL), userId: new Types.ObjectId(emp1), date: d("2026-11-03"), type: DayOffType.COMP_OFF, assignedBy: "x" },
    ]);
    const approved = await service.approveRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), req.id, {});
    expect(approved.leaveDays).toBe(2);
  });

  it("refuses to approve when every requested day has since become an off", async () => {
    const { service, world, emp1, manager } = setup();
    const req = await service.createRequest(userActor(HOTEL, emp1), leave({ toDate: "2026-11-03" }));
    await world.dayOffRepo.insertMany([
      { hotelId: new Types.ObjectId(HOTEL), userId: new Types.ObjectId(emp1), date: d("2026-11-02"), type: DayOffType.WEEKLY_OFF, assignedBy: "x" },
      { hotelId: new Types.ObjectId(HOTEL), userId: new Types.ObjectId(emp1), date: d("2026-11-03"), type: DayOffType.WEEKLY_OFF, assignedBy: "x" },
    ]);
    await expectLeaveError(
      service.approveRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), req.id, {}),
      "LEAVE_NO_WORKING_DAYS",
    );
    expect(world.requests[0].status).toBe(LeaveRequestStatus.PENDING);
  });

  it("never leaves two overlapping approved requests when approvals race", async () => {
    const { service, world, emp1, manager } = setup();
    const actor = userActor(HOTEL, manager, [UserRole.MANAGER]);
    const a = await service.createRequest(userActor(HOTEL, emp1), leave());
    // Simulates a second, overlapping request that slipped past the submit check
    // because the two submissions interleaved.
    const b = await world.requestRepo.create({
      hotelId: new Types.ObjectId(HOTEL),
      userId: new Types.ObjectId(emp1),
      type: LeaveType.SICK,
      fromDate: d("2026-11-03"),
      toDate: d("2026-11-05"),
      reason: "overlapping",
      status: LeaveRequestStatus.PENDING,
    });

    await service.approveRequest(actor, String(b._id), {});
    await expectLeaveError(service.approveRequest(actor, a.id, {}), "LEAVE_OVERLAP", 409);

    const stored = world.requests.find((r) => String(r._id) === a.id);
    expect(stored.status).toBe(LeaveRequestStatus.PENDING);
    expect(stored.reviewedBy).toBeUndefined();
    const approvedCount = world.requests.filter((r) => r.status === LeaveRequestStatus.APPROVED).length;
    expect(approvedCount).toBe(1);
  });
});

describe("LeaveRequestService — employee cancellation", () => {
  it("cancels own pending request", async () => {
    const { service, emp1 } = setup();
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());
    const cancelled = await service.cancelRequest(userActor(HOTEL, emp1), req.id);
    expect(cancelled.status).toBe(LeaveRequestStatus.CANCELLED);
    expect(cancelled.cancelledAt).toBe(clock().toISOString());
  });

  it("cancels an approved leave that has not started yet", async () => {
    const { service, emp1, manager } = setup();
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());
    await service.approveRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), req.id, {});
    const cancelled = await service.cancelRequest(userActor(HOTEL, emp1), req.id);
    expect(cancelled.status).toBe(LeaveRequestStatus.CANCELLED);
  });

  it("refuses to cancel an approved leave that has already started", async () => {
    const { service, world, emp1, manager } = setup();
    // Requested and approved on 18 Oct 2026 for a leave starting 19 Oct. Cancelling on 20 Oct is too late.
    const req = await service.createRequest(
      userActor(HOTEL, emp1),
      leave({ fromDate: "2026-10-19", toDate: "2026-10-20" }),
    );
    await service.approveRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), req.id, {});
    const later = serviceAt(world, "2026-10-20T06:00:00.000Z");
    await expectLeaveError(later.cancelRequest(userActor(HOTEL, emp1), req.id), "LEAVE_NOT_CANCELLABLE", 409);
  });

  it("refuses to cancel a rejected request", async () => {
    const { service, emp1, manager } = setup();
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());
    await service.rejectRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), req.id, { note: "no" });
    await expectLeaveError(service.cancelRequest(userActor(HOTEL, emp1), req.id), "LEAVE_NOT_CANCELLABLE");
  });

  it("reports another employee's request as not found, not forbidden", async () => {
    const { service, emp1, emp2 } = setup();
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());
    await expectLeaveError(service.cancelRequest(userActor(HOTEL, emp2), req.id), "LEAVE_REQUEST_NOT_FOUND", 404);
  });

  it("validates the id before touching the database", async () => {
    const { service, emp1 } = setup();
    await expectLeaveError(service.cancelRequest(userActor(HOTEL, emp1), "bad-id"), "LEAVE_VALIDATION_FAILED", 400);
  });
});

describe("LeaveRequestService — reading and tenant isolation", () => {
  it("lets a manager see requests across the hotel, with names and paging metadata", async () => {
    const { service, emp1, emp2, manager } = setup();
    await service.createRequest(userActor(HOTEL, emp1), leave());
    await service.createRequest(userActor(HOTEL, emp2), leave({ fromDate: "2026-12-01", toDate: "2026-12-01" }));
    await service.createRequest(userActor(HOTEL, emp1), leave({ fromDate: "2026-12-10", toDate: "2026-12-11" }));

    const page = await service.listRequests(userActor(HOTEL, manager, [UserRole.MANAGER]), {
      limit: "2",
      page: "1",
    });
    expect(page.items).toHaveLength(2);
    expect(page.pagination).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(page.items.every((item) => item.employee?.firstName === "Ravi" || item.employee?.firstName === "Meera")).toBe(true);
  });

  it("filters the manager's list by status", async () => {
    const { service, emp1, manager } = setup();
    const actor = userActor(HOTEL, manager, [UserRole.MANAGER]);
    const a = await service.createRequest(userActor(HOTEL, emp1), leave());
    await service.createRequest(userActor(HOTEL, emp1), leave({ fromDate: "2026-12-01", toDate: "2026-12-01" }));
    await service.approveRequest(actor, a.id, {});

    const approved = await service.listRequests(actor, { status: "APPROVED" });
    expect(approved.items.map((i) => i.id)).toEqual([a.id]);
  });

  it("returns only the caller's own requests from listMyRequests, ignoring any userId in the query", async () => {
    const { service, emp1, emp2 } = setup();
    await service.createRequest(userActor(HOTEL, emp1), leave());
    await service.createRequest(userActor(HOTEL, emp2), leave({ fromDate: "2026-12-01", toDate: "2026-12-01" }));

    const mine = await service.listMyRequests(userActor(HOTEL, emp1), { userId: emp2 });
    expect(mine.items).toHaveLength(1);
    expect(mine.items[0].employeeId).toBe(emp1);
  });

  it("forbids employees from listing the whole hotel", async () => {
    const { service, emp1 } = setup();
    await expectLeaveError(service.listRequests(userActor(HOTEL, emp1), {}), "LEAVE_APPROVER_FORBIDDEN");
  });

  it("lets an employee read their own request but not a colleague's", async () => {
    const { service, emp1, emp2 } = setup();
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());
    await expect(service.getRequest(userActor(HOTEL, emp1), req.id)).resolves.toMatchObject({ id: req.id });
    await expectLeaveError(service.getRequest(userActor(HOTEL, emp2), req.id), "LEAVE_REQUEST_NOT_FOUND", 404);
  });

  it("isolates tenants: another hotel's manager cannot read, approve or reject", async () => {
    const { service, emp1, otherHotelManager } = setup();
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());
    const intruder = userActor(OTHER_HOTEL, otherHotelManager, [UserRole.MANAGER]);

    await expectLeaveError(service.getRequest(intruder, req.id), "LEAVE_REQUEST_NOT_FOUND", 404);
    await expectLeaveError(service.approveRequest(intruder, req.id, {}), "LEAVE_REQUEST_NOT_FOUND", 404);
    await expectLeaveError(service.rejectRequest(intruder, req.id, { note: "x" }), "LEAVE_REQUEST_NOT_FOUND", 404);
    await expect(service.listRequests(intruder, {})).resolves.toMatchObject({ items: [] });
  });
});

/** A service over the same world, with "now" set to `iso`. Used to move time forward between steps. */
const serviceAt = (world: ReturnType<typeof createFakeWorld>, iso: string) =>
  new LeaveRequestService({
    requests: world.requestRepo,
    dayOffs: world.dayOffRepo,
    employees: world.employeeRepo,
    roster: world.rosterRepo,
    clock: () => new Date(iso),
  });

const dayOf = (date: Date) => date.toISOString().slice(0, 10);

describe("LeaveRequestService — backdating", () => {
  it("refuses a leave that starts before today (business timezone)", async () => {
    const { service, emp1 } = setup();
    await expectLeaveError(
      service.createRequest(userActor(HOTEL, emp1), leave({ fromDate: "2026-10-17", toDate: "2026-10-20" })),
      "LEAVE_BACKDATED",
      400,
    );
  });

  it("accepts a leave that starts today", async () => {
    const { service, emp1 } = setup();
    const dto = await service.createRequest(
      userActor(HOTEL, emp1),
      leave({ fromDate: "2026-10-18", toDate: "2026-10-19" }),
    );
    expect(dto.status).toBe(LeaveRequestStatus.PENDING);
  });

  it("refuses to approve a pending request whose start date has passed, and leaves it pending", async () => {
    const { world, emp1, manager } = setup();
    const req = await serviceAt(world, "2026-10-18T06:00:00.000Z").createRequest(
      userActor(HOTEL, emp1),
      leave({ fromDate: "2026-10-19", toDate: "2026-10-20" }),
    );
    const later = serviceAt(world, "2026-10-20T06:00:00.000Z");
    const actor = userActor(HOTEL, manager, [UserRole.MANAGER]);

    await expectLeaveError(later.approveRequest(actor, req.id, {}), "LEAVE_START_DATE_PASSED", 409);
    expect(world.requests[0].status).toBe(LeaveRequestStatus.PENDING);
    expect(world.requests[0].reviewedBy).toBeUndefined();
  });

  it("still allows rejecting, and cancelling by the employee, a pending request whose start date has passed", async () => {
    const { world, emp1, emp2, manager } = setup();
    const actor = userActor(HOTEL, manager, [UserRole.MANAGER]);
    const first = await serviceAt(world, "2026-10-18T06:00:00.000Z").createRequest(
      userActor(HOTEL, emp1),
      leave({ fromDate: "2026-10-19", toDate: "2026-10-20" }),
    );
    const second = await serviceAt(world, "2026-10-18T06:00:00.000Z").createRequest(
      userActor(HOTEL, emp2),
      leave({ fromDate: "2026-10-21", toDate: "2026-10-22" }),
    );
    const later = serviceAt(world, "2026-10-20T06:00:00.000Z");

    await expect(later.rejectRequest(actor, first.id, { note: "Too late to approve" })).resolves.toMatchObject({
      status: LeaveRequestStatus.REJECTED,
    });
    await expect(later.cancelRequest(userActor(HOTEL, emp2), second.id)).resolves.toMatchObject({
      status: LeaveRequestStatus.CANCELLED,
    });
  });

  it("approves a leave that starts today", async () => {
    const { service, emp1, manager } = setup();
    const req = await service.createRequest(
      userActor(HOTEL, emp1),
      leave({ fromDate: "2026-10-18", toDate: "2026-10-19" }),
    );
    await expect(
      service.approveRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), req.id, {}),
    ).resolves.toMatchObject({ status: LeaveRequestStatus.APPROVED });
  });
});

describe("LeaveRequestService — approval removes the employee from rosters", () => {
  it("takes the employee off every roster in the leave's date range, and only those", async () => {
    const { service, world, emp1, emp2, manager } = setup();
    world.addRoster(HOTEL, "2026-11-01", [emp1, emp2]);
    world.addRoster(HOTEL, "2026-11-02", [emp1, emp2]);
    world.addRoster(HOTEL, "2026-11-03", [emp1]);
    world.addRoster(HOTEL, "2026-11-04", [emp1]);
    world.addRoster(HOTEL, "2026-11-05", [emp1]);
    const req = await service.createRequest(userActor(HOTEL, emp1), leave()); // 2–4 Nov
    await service.approveRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), req.id, {});

    const onRosters = Object.fromEntries(
      world.rosters.map((r) => [dayOf(r.date), r.employees.map((id: unknown) => String(id))]),
    );
    expect(onRosters).toEqual({
      "2026-11-01": [emp1, emp2],
      "2026-11-02": [emp2],
      "2026-11-03": [],
      "2026-11-04": [],
      "2026-11-05": [emp1],
    });
  });

  it("does not touch another hotel's rosters", async () => {
    const { service, world, emp1, manager } = setup();
    const otherHotelRoster = world.addRoster(OTHER_HOTEL, "2026-11-02", [emp1]);
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());
    await service.approveRequest(userActor(HOTEL, manager, [UserRole.MANAGER]), req.id, {});
    expect(otherHotelRoster.employees.map(String)).toEqual([emp1]);
  });

  it("reverts to PENDING and rethrows when the roster write fails, then succeeds on retry", async () => {
    const { service, world, emp1, manager } = setup();
    const actor = userActor(HOTEL, manager, [UserRole.MANAGER]);
    world.addRoster(HOTEL, "2026-11-02", [emp1]);
    const req = await service.createRequest(userActor(HOTEL, emp1), leave());

    world.rosterRepo.failNext = true;
    await expect(service.approveRequest(actor, req.id, {})).rejects.toThrow("roster write failed");
    expect(world.requests[0].status).toBe(LeaveRequestStatus.PENDING);
    expect(world.requests[0].reviewedBy).toBeUndefined();
    expect(world.rosters[0].employees.map(String)).toEqual([emp1]);

    await expect(service.approveRequest(actor, req.id, {})).resolves.toMatchObject({
      status: LeaveRequestStatus.APPROVED,
    });
    expect(world.rosters[0].employees.map(String)).toEqual([]);
  });
});
