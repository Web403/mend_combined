import { Types } from "mongoose";
import { LeaveAvailabilityService, availabilityKey } from "../../src/modules/leave/leave-availability.service";
import { DayOffType, LeaveRequestStatus, LeaveType } from "../../src/shared/enums/leave.enum";
import { createFakeWorld, d } from "./leave.fakes";

const HOTEL = new Types.ObjectId().toString();
const OTHER_HOTEL = new Types.ObjectId().toString();

function setup() {
  const world = createFakeWorld();
  const service = new LeaveAvailabilityService({ dayOffs: world.dayOffRepo, requests: world.requestRepo });
  const emp1 = new Types.ObjectId().toString();
  const emp2 = new Types.ObjectId().toString();
  return { world, service, emp1, emp2 };
}

const addOff = (world: ReturnType<typeof createFakeWorld>, hotelId: string, userId: string, date: string) =>
  world.offs.push({
    _id: new Types.ObjectId(),
    hotelId,
    userId: new Types.ObjectId(userId),
    date: d(date),
    type: DayOffType.WEEKLY_OFF,
    assignedBy: "x",
  });

const addLeave = (
  world: ReturnType<typeof createFakeWorld>,
  userId: string,
  from: string,
  to: string,
  status: LeaveRequestStatus,
  hotelId = HOTEL,
) =>
  world.requests.push({
    _id: new Types.ObjectId(),
    hotelId,
    userId: new Types.ObjectId(userId),
    type: LeaveType.SICK,
    fromDate: d(from),
    toDate: d(to),
    reason: "test",
    status,
  });

describe("LeaveAvailabilityService.findConflicts", () => {
  it("reports a scheduled off as a DAY_OFF conflict on that day", async () => {
    const { world, service, emp1 } = setup();
    addOff(world, HOTEL, emp1, "2026-11-03");

    const map = await service.findConflicts(HOTEL, [emp1], d("2026-11-02"), d("2026-11-04"));
    expect([...map.keys()]).toEqual([availabilityKey(emp1, "2026-11-03")]);
    expect(map.get(availabilityKey(emp1, "2026-11-03"))).toEqual([
      { kind: "DAY_OFF", employeeId: emp1, date: "2026-11-03", offType: DayOffType.WEEKLY_OFF },
    ]);
  });

  it("expands approved leave to each day it covers inside the window, and marks pending leave separately", async () => {
    const { world, service, emp1, emp2 } = setup();
    addLeave(world, emp1, "2026-11-01", "2026-11-04", LeaveRequestStatus.APPROVED);
    addLeave(world, emp2, "2026-11-03", "2026-11-03", LeaveRequestStatus.PENDING);

    const map = await service.findConflicts(HOTEL, [emp1, emp2], d("2026-11-02"), d("2026-11-03"));
    const days = [...map.entries()].map(([key, list]) => [key, list.map((c) => c.kind)]);
    expect(days).toEqual([
      [availabilityKey(emp1, "2026-11-02"), ["APPROVED_LEAVE"]],
      [availabilityKey(emp1, "2026-11-03"), ["APPROVED_LEAVE"]],
      [availabilityKey(emp2, "2026-11-03"), ["PENDING_LEAVE"]],
    ]);
  });

  it("ignores rejected and cancelled leave", async () => {
    const { world, service, emp1 } = setup();
    addLeave(world, emp1, "2026-11-02", "2026-11-04", LeaveRequestStatus.REJECTED);
    addLeave(world, emp1, "2026-11-02", "2026-11-04", LeaveRequestStatus.CANCELLED);

    const map = await service.findConflicts(HOTEL, [emp1], d("2026-11-01"), d("2026-11-05"));
    expect(map.size).toBe(0);
  });

  it("can report a day with both an off and leave", async () => {
    const { world, service, emp1 } = setup();
    addOff(world, HOTEL, emp1, "2026-11-02");
    addLeave(world, emp1, "2026-11-02", "2026-11-02", LeaveRequestStatus.APPROVED);

    const list = (await service.findConflicts(HOTEL, [emp1], d("2026-11-02"), d("2026-11-02"))).get(
      availabilityKey(emp1, "2026-11-02"),
    );
    expect(list!.map((c) => c.kind).sort()).toEqual(["APPROVED_LEAVE", "DAY_OFF"]);
  });

  it("never reports another hotel's offs or leave", async () => {
    const { world, service, emp1 } = setup();
    addOff(world, OTHER_HOTEL, emp1, "2026-11-02");
    addLeave(world, emp1, "2026-11-02", "2026-11-02", LeaveRequestStatus.APPROVED, OTHER_HOTEL);

    const map = await service.findConflicts(HOTEL, [emp1], d("2026-11-01"), d("2026-11-03"));
    expect(map.size).toBe(0);
  });

  it("returns nothing for no employees, or a window that ends before it starts", async () => {
    const { world, service, emp1 } = setup();
    addOff(world, HOTEL, emp1, "2026-11-02");

    expect((await service.findConflicts(HOTEL, [], d("2026-11-01"), d("2026-11-03"))).size).toBe(0);
    expect((await service.findConflicts(HOTEL, [emp1], d("2026-11-03"), d("2026-11-01"))).size).toBe(0);
  });

  it("treats the window as calendar dates, so a time of day on the bounds makes no difference", async () => {
    const { world, service, emp1 } = setup();
    addOff(world, HOTEL, emp1, "2026-11-02");

    const map = await service.findConflicts(
      HOTEL,
      [emp1],
      new Date("2026-11-02T15:00:00.000Z"),
      new Date("2026-11-02T20:00:00.000Z"),
    );
    expect(map.has(availabilityKey(emp1, "2026-11-02"))).toBe(true);
  });
});
