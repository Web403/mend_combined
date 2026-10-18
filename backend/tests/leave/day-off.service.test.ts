import { Types } from "mongoose";
import { DayOffService } from "../../src/modules/leave/day-off.service";
import { LeaveRequestService } from "../../src/modules/leave/leave-request.service";
import { DayOffType } from "../../src/shared/enums/leave.enum";
import { UserRole } from "../../src/shared/enums/user";
import { LeaveError } from "../../src/modules/leave/leave.error";
import { clock, createFakeWorld, d, ownerActor, userActor } from "./leave.fakes";

const HOTEL = new Types.ObjectId().toString();
const OTHER_HOTEL = new Types.ObjectId().toString();

function setup() {
  const world = createFakeWorld();
  const offs = new DayOffService({
    dayOffs: world.dayOffRepo,
    employees: world.employeeRepo,
    clock,
  });
  const requests = new LeaveRequestService({
    requests: world.requestRepo,
    dayOffs: world.dayOffRepo,
    employees: world.employeeRepo,
    clock,
  });
  const emp1 = world.addEmployee(HOTEL, { first: "Ravi", last: "Kumar" });
  const emp2 = world.addEmployee(HOTEL, { first: "Meera", last: "Shah" });
  const manager = world.addEmployee(HOTEL, { role: UserRole.MANAGER });
  const foreign = world.addEmployee(OTHER_HOTEL, { first: "Foreign", last: "Staff" });
  return { world, offs, requests, emp1, emp2, manager, foreign };
}

const expectLeaveError = async (promise: Promise<unknown>, code: string, status?: number) => {
  await expect(promise).rejects.toBeInstanceOf(LeaveError);
  await expect(promise).rejects.toMatchObject({ code, ...(status ? { statusCode: status } : {}) });
};

// 1 Nov 2026 is a Sunday, 8 Nov is the next Sunday, 14 Nov is a Saturday.
const WEEK_RANGE = { fromDate: "2026-11-01", toDate: "2026-11-14" };

describe("DayOffService — assigning", () => {
  it("assigns a weekly off on Sundays only, across the range", async () => {
    const { offs, emp1, manager, world } = setup();
    const result = await offs.assignDayOffs(userActor(HOTEL, manager, [UserRole.MANAGER]), {
      userIds: [emp1],
      ...WEEK_RANGE,
      weekdays: [0],
    });

    expect(result.created.map((o) => o.date)).toEqual(["2026-11-01", "2026-11-08"]);
    expect(result.created.every((o) => o.type === DayOffType.WEEKLY_OFF)).toBe(true);
    expect(result.summary).toEqual({ employees: 1, requestedDays: 2, createdCount: 2, skippedCount: 0 });
    expect(world.offs).toHaveLength(2);
  });

  it("assigns every day in the range when no weekday filter is given", async () => {
    const { offs, emp1, manager } = setup();
    const result = await offs.assignDayOffs(userActor(HOTEL, manager, [UserRole.MANAGER]), {
      userIds: [emp1],
      fromDate: "2026-11-01",
      toDate: "2026-11-03",
      type: "HOLIDAY",
      note: "Diwali",
    });
    expect(result.created).toHaveLength(3);
    expect(result.created[0]).toMatchObject({ type: DayOffType.HOLIDAY, note: "Diwali", assignedBy: manager });
  });

  it("assigns the same off to many employees at once", async () => {
    const { offs, emp1, emp2, manager } = setup();
    const result = await offs.assignDayOffs(userActor(HOTEL, manager, [UserRole.MANAGER]), {
      userIds: [emp1, emp2],
      fromDate: "2026-11-01",
      toDate: "2026-11-02",
    });
    expect(result.summary).toMatchObject({ employees: 2, requestedDays: 2, createdCount: 4 });
  });

  it("skips offs that already exist and reports them, without failing the batch", async () => {
    const { offs, emp1, emp2, manager, world } = setup();
    await world.dayOffRepo.insertMany([
      { hotelId: new Types.ObjectId(HOTEL), userId: new Types.ObjectId(emp1), date: d("2026-11-01"), type: DayOffType.WEEKLY_OFF, assignedBy: "x" },
    ]);
    const result = await offs.assignDayOffs(userActor(HOTEL, manager, [UserRole.MANAGER]), {
      userIds: [emp1, emp2],
      fromDate: "2026-11-01",
      toDate: "2026-11-02",
    });

    expect(result.skipped).toEqual([{ employeeId: emp1, date: "2026-11-01", reason: "ALREADY_OFF" }]);
    expect(result.created).toHaveLength(3);
    expect(world.offs).toHaveLength(4);
  });

  it("is idempotent: assigning the same range twice creates nothing the second time", async () => {
    const { offs, emp1, manager } = setup();
    const actor = userActor(HOTEL, manager, [UserRole.MANAGER]);
    await offs.assignDayOffs(actor, { userIds: [emp1], ...WEEK_RANGE, weekdays: [0] });
    const again = await offs.assignDayOffs(actor, { userIds: [emp1], ...WEEK_RANGE, weekdays: [0] });
    expect(again.created).toHaveLength(0);
    expect(again.skipped).toHaveLength(2);
  });

  it("rejects the whole batch when any employee is not in this hotel, and names the missing ids", async () => {
    const { offs, emp1, foreign, manager, world } = setup();
    await expect(
      offs.assignDayOffs(userActor(HOTEL, manager, [UserRole.MANAGER]), {
        userIds: [emp1, foreign],
        fromDate: "2026-11-01",
        toDate: "2026-11-01",
      }),
    ).rejects.toMatchObject({ code: "EMPLOYEE_NOT_FOUND", statusCode: 404, message: expect.stringContaining(foreign) });
    expect(world.offs).toHaveLength(0);
  });

  it("refuses employees, gig workers and anyone outside the approver roles", async () => {
    const { offs, emp1 } = setup();
    await expectLeaveError(
      offs.assignDayOffs(userActor(HOTEL, emp1, [UserRole.EMPLOYEE]), { userIds: [emp1], fromDate: "2026-11-01", toDate: "2026-11-01" }),
      "LEAVE_APPROVER_FORBIDDEN",
      403,
    );
  });

  it("lets the hotel-owner account assign offs, recording the hotel as the assigner", async () => {
    const { offs, emp1 } = setup();
    const result = await offs.assignDayOffs(ownerActor(HOTEL), {
      userIds: [emp1],
      fromDate: "2026-11-01",
      toDate: "2026-11-01",
    });
    expect(result.created[0].assignedBy).toBe(HOTEL);
  });

  it("reports a concurrent duplicate insert as a retryable conflict", async () => {
    const { world, emp1, manager } = setup();
    const racingRepo = {
      ...world.dayOffRepo,
      findByUsersInRange: async () => [],
      insertMany: async () => {
        const err: any = new Error("E11000 duplicate key");
        err.code = 11000;
        throw err;
      },
    };
    const offs = new DayOffService({ dayOffs: racingRepo, employees: world.employeeRepo, clock });
    await expectLeaveError(
      offs.assignDayOffs(userActor(HOTEL, manager, [UserRole.MANAGER]), {
        userIds: [emp1],
        fromDate: "2026-11-01",
        toDate: "2026-11-01",
      }),
      "DAY_OFF_CONCURRENT_UPDATE",
      409,
    );
  });

  it("rejects an assignment that exceeds the employee-day cap", async () => {
    const { offs, manager } = setup();
    const ids = Array.from({ length: 50 }, (_, i) => i.toString(16).padStart(24, "c"));
    await expectLeaveError(
      offs.assignDayOffs(userActor(HOTEL, manager, [UserRole.MANAGER]), {
        userIds: ids,
        fromDate: "2026-01-01",
        toDate: "2026-04-02",
      }),
      "LEAVE_VALIDATION_FAILED",
    );
  });
});

describe("DayOffService — reading and removing", () => {
  it("gives managers the calendar for a window, with employee names attached", async () => {
    const { offs, emp1, emp2, manager } = setup();
    const actor = userActor(HOTEL, manager, [UserRole.MANAGER]);
    await offs.assignDayOffs(actor, { userIds: [emp1, emp2], fromDate: "2026-11-01", toDate: "2026-11-01" });

    const page = await offs.listDayOffs(actor, { from: "2026-11-01", to: "2026-11-30" });
    expect(page.pagination.total).toBe(2);
    expect(page.items.map((i) => i.employee?.firstName).sort()).toEqual(["Ravi", "Meera"].sort());
  });

  it("requires from and to on the manager calendar", async () => {
    const { offs, manager } = setup();
    await expectLeaveError(
      offs.listDayOffs(userActor(HOTEL, manager, [UserRole.MANAGER]), {}),
      "LEAVE_VALIDATION_FAILED",
    );
  });

  it("gives an employee only their own offs", async () => {
    const { offs, emp1, emp2, manager } = setup();
    const actor = userActor(HOTEL, manager, [UserRole.MANAGER]);
    await offs.assignDayOffs(actor, { userIds: [emp1, emp2], fromDate: "2026-10-20", toDate: "2026-10-21" });

    const mine = await offs.listMyDayOffs(userActor(HOTEL, emp1), { from: "2026-10-01", to: "2026-10-31" });
    expect(mine).toHaveLength(2);
    expect(mine.every((o) => o.employeeId === emp1)).toBe(true);
  });

  it("defaults an employee's offs window to the next 30 days", async () => {
    const { offs, emp1, manager } = setup();
    const actor = userActor(HOTEL, manager, [UserRole.MANAGER]);
    await offs.assignDayOffs(actor, { userIds: [emp1], fromDate: "2026-10-18", toDate: "2026-10-18" });
    await offs.assignDayOffs(actor, { userIds: [emp1], fromDate: "2026-12-31", toDate: "2026-12-31" });

    const mine = await offs.listMyDayOffs(userActor(HOTEL, emp1), {});
    expect(mine.map((o) => o.date)).toEqual(["2026-10-18"]);
  });

  it("removes an off, and reports another hotel's off as not found", async () => {
    const { offs, emp1, manager, world } = setup();
    const actor = userActor(HOTEL, manager, [UserRole.MANAGER]);
    const [created] = (await offs.assignDayOffs(actor, { userIds: [emp1], fromDate: "2026-11-01", toDate: "2026-11-01" })).created;

    await expect(offs.deleteDayOff(actor, created.id)).resolves.toEqual({ id: created.id, deleted: true });
    expect(world.offs).toHaveLength(0);

    await expectLeaveError(offs.deleteDayOff(actor, created.id), "DAY_OFF_NOT_FOUND", 404);
  });

  it("does not let another hotel's manager delete an off", async () => {
    const { offs, emp1, manager, world } = setup();
    const [created] = (await offs.assignDayOffs(userActor(HOTEL, manager, [UserRole.MANAGER]), {
      userIds: [emp1],
      fromDate: "2026-11-01",
      toDate: "2026-11-01",
    })).created;

    const intruder = userActor(OTHER_HOTEL, world.addEmployee(OTHER_HOTEL, { role: UserRole.MANAGER }), [UserRole.MANAGER]);
    await expectLeaveError(offs.deleteDayOff(intruder, created.id), "DAY_OFF_NOT_FOUND", 404);
    expect(world.offs).toHaveLength(1);
  });

  it("stops employees from removing offs", async () => {
    const { offs, emp1, manager } = setup();
    const [created] = (await offs.assignDayOffs(userActor(HOTEL, manager, [UserRole.MANAGER]), {
      userIds: [emp1],
      fromDate: "2026-11-01",
      toDate: "2026-11-01",
    })).created;
    await expectLeaveError(offs.deleteDayOff(userActor(HOTEL, emp1), created.id), "LEAVE_APPROVER_FORBIDDEN", 403);
  });
});
