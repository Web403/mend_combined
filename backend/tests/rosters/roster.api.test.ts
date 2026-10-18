/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * HTTP tests for roster create and update: the warnings returned for offs and
 * leave, date normalisation, tenancy, and error codes. Runs the real Express app
 * with real auth and the leave availability service. Only the Mongoose models
 * are replaced by the in-memory double.
 */

import request from "supertest";
import mongoose from "mongoose";

jest.mock("../../src/modules/users/user.model", () => ({
  UserModel: require("../helpers/fixtures").UserModel,
}));
jest.mock("../../src/modules/hotel/hotel.model", () => ({
  HotelModel: require("../helpers/fixtures").HotelModel,
}));
jest.mock("../../src/modules/shift/shift.model", () => ({
  ShiftModel: require("../helpers/memory-db").createMemoryModel("Shift", "shifts", {}),
}));
jest.mock("../../src/modules/rosters/roster.model", () => ({
  RosterModel: require("../helpers/memory-db").createMemoryModel("Roster", "rosters", {
    required: ["hotelId", "date", "shiftId"],
  }),
}));
jest.mock("../../src/modules/leave/leave-request.model", () => ({
  LeaveRequestModel: require("../helpers/memory-db").createMemoryModel("LeaveRequest", "leaverequests", {
    required: ["hotelId", "userId", "type", "fromDate", "toDate", "reason", "status"],
    enums: {
      type: ["CASUAL", "SICK", "EARNED", "UNPAID", "OTHER"],
      status: ["PENDING", "APPROVED", "REJECTED", "CANCELLED"],
    },
    timestamps: true,
  }),
}));
jest.mock("../../src/modules/leave/day-off.model", () => ({
  DayOffModel: require("../helpers/memory-db").createMemoryModel("DayOff", "dayoffs", {
    required: ["hotelId", "userId", "date", "type", "assignedBy"],
    enums: { type: ["WEEKLY_OFF", "COMP_OFF", "HOLIDAY"] },
    timestamps: true,
  }),
}));

import { createApp } from "../../src/app";
import { ROUTE_PREFIX } from "../../src/shared/constants";
import { UserRole } from "../../src/shared/enums/user";
import { ShiftModel } from "../../src/modules/shift/shift.model";
import { RosterModel } from "../../src/modules/rosters/roster.model";
import { LeaveRequestModel } from "../../src/modules/leave/leave-request.model";
import { DayOffModel } from "../../src/modules/leave/day-off.model";
import type { MemoryModel } from "../helpers/memory-db";
import { makeHotel, makeUser, resetWorld, tokenFor } from "../helpers/fixtures";

const app = createApp();
const shifts = ShiftModel as unknown as MemoryModel;
const rosters = RosterModel as unknown as MemoryModel;
const leaves = LeaveRequestModel as unknown as MemoryModel;
const offs = DayOffModel as unknown as MemoryModel;
const ROSTER = `${ROUTE_PREFIX}/roster`;
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

// "Today" is 18 Oct 2026. Only Date is faked, so the rest of the stack keeps real timers.
const NOW = new Date("2026-10-18T06:00:00.000Z");
const ALL_BUT_DATE = [
  "hrtime", "nextTick", "performance", "queueMicrotask", "requestAnimationFrame",
  "cancelAnimationFrame", "requestIdleCallback", "cancelIdleCallback", "setImmediate",
  "clearImmediate", "setInterval", "clearInterval", "setTimeout", "clearTimeout",
] as const;

let hotelA: any;
let hotelB: any;
let managerA: any;
let managerB: any;
let employeeA1: any;
let employeeA2: any;
let shiftId: string;

const e1 = () => employeeA1._id.toString();
const e2 = () => employeeA2._id.toString();
const dayOf = (date: Date) => date.toISOString().slice(0, 10);

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: [...ALL_BUT_DATE] });
  resetWorld();
  shifts.reset();
  rosters.reset();
  leaves.reset();
  offs.reset();

  hotelA = makeHotel("Hotel Alpha");
  hotelB = makeHotel("Hotel Beta");
  managerA = makeUser(UserRole.MANAGER, hotelA);
  managerB = makeUser(UserRole.MANAGER, hotelB);
  employeeA1 = makeUser(UserRole.EMPLOYEE, hotelA, { profile: { firstName: "Ravi", lastName: "Kumar" } });
  employeeA2 = makeUser(UserRole.EMPLOYEE, hotelA, { profile: { firstName: "Meera", lastName: "Shah" } });
  shiftId = (shifts.insertRaw({ _id: new mongoose.Types.ObjectId(), hotelId: hotelA._id, startTime: "09:00", endTime: "17:00" }) as any)._id.toString();
});

afterEach(() => {
  jest.useRealTimers();
});

const createBody = (overrides: Record<string, unknown> = {}) => ({
  fromDate: "2026-11-02",
  toDate: "2026-11-04",
  shiftId,
  employees: [e1()],
  ...overrides,
});

const post = (body: unknown, token = tokenFor(managerA)) =>
  request(app).post(`${ROSTER}/create-roster`).set(bearer(token)).send(body as object);

const put = (id: string, body: unknown, token = tokenFor(managerA)) =>
  request(app).put(`${ROSTER}/update-roster/${id}`).set(bearer(token)).send(body as object);

const insertLeave = (userId: string, from: string, to: string, status: string, type = "CASUAL") =>
  leaves.insertRaw({
    _id: new mongoose.Types.ObjectId(),
    hotelId: hotelA._id,
    userId: new mongoose.Types.ObjectId(userId),
    type,
    fromDate: new Date(`${from}T00:00:00.000Z`),
    toDate: new Date(`${to}T00:00:00.000Z`),
    reason: "test",
    status,
  });

const insertOff = (userId: string, date: string, type = "WEEKLY_OFF") =>
  offs.insertRaw({
    _id: new mongoose.Types.ObjectId(),
    hotelId: hotelA._id,
    userId: new mongoose.Types.ObjectId(userId),
    date: new Date(`${date}T00:00:00.000Z`),
    type,
    assignedBy: managerA._id.toString(),
  });

describe("creating rosters — warnings", () => {
  it("returns an empty warnings list when nobody is off or on leave", async () => {
    const res = await post(createBody());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ success: true, meta: { warnings: [] } });
    expect(res.body.data).toHaveLength(3);
  });

  it("warns about a scheduled off, and still assigns the employee on that day", async () => {
    insertOff(e1(), "2026-11-03", "COMP_OFF");

    const res = await post(createBody());
    expect(res.status).toBe(201);
    expect(res.body.meta.warnings).toEqual([
      { kind: "DAY_OFF", employeeId: e1(), date: "2026-11-03", offType: "COMP_OFF" },
    ]);

    const rostered = rosters.docs.find((r) => dayOf(r.date) === "2026-11-03")!;
    expect(rostered.employees.map(String)).toEqual([e1()]);
  });

  it("warns about approved leave on every overlapping day, and about pending leave separately", async () => {
    insertLeave(e1(), "2026-11-03", "2026-11-04", "APPROVED", "SICK");
    insertLeave(e2(), "2026-11-02", "2026-11-02", "PENDING");

    const res = await post(createBody({ employees: [e1(), e2()] }));
    expect(res.status).toBe(201);
    const warnings = res.body.meta.warnings;
    expect(warnings).toEqual([
      expect.objectContaining({ kind: "PENDING_LEAVE", employeeId: e2(), date: "2026-11-02", leaveType: "CASUAL" }),
      expect.objectContaining({ kind: "APPROVED_LEAVE", employeeId: e1(), date: "2026-11-03", leaveType: "SICK" }),
      expect.objectContaining({ kind: "APPROVED_LEAVE", employeeId: e1(), date: "2026-11-04", leaveType: "SICK" }),
    ]);
    expect(warnings.every((w: any) => typeof w.leaveId === "string")).toBe(true);
  });

  it("does not warn about rejected, cancelled or other employees' leave", async () => {
    insertLeave(e1(), "2026-11-02", "2026-11-04", "REJECTED");
    insertLeave(e1(), "2026-11-02", "2026-11-04", "CANCELLED");
    insertLeave(e2(), "2026-11-02", "2026-11-04", "APPROVED");

    const res = await post(createBody());
    expect(res.body.meta.warnings).toEqual([]);
  });
});

describe("creating rosters — dates", () => {
  it("stores one roster per calendar day at UTC midnight, even when the inputs carry a time", async () => {
    const res = await post(createBody({ fromDate: "2026-11-02T10:00:00.000Z", toDate: "2026-11-03T10:00:00.000Z" }));
    expect(res.status).toBe(201);
    expect(rosters.docs.map((r) => r.date.toISOString())).toEqual([
      "2026-11-02T00:00:00.000Z",
      "2026-11-03T00:00:00.000Z",
    ]);
  });

  it("rejects an unparseable date with INVALID_DATE, not a 500", async () => {
    const res = await post(createBody({ fromDate: "not-a-date" }));
    expect(res.status).toBe(400);
    expect(res.body.meta.code).toBe("INVALID_DATE");
    expect(rosters.docs).toHaveLength(0);
  });

  it("rejects a range that ends before it starts with INVALID_DATE", async () => {
    const res = await post(createBody({ fromDate: "2026-11-05", toDate: "2026-11-02" }));
    expect(res.status).toBe(400);
    expect(res.body.meta.code).toBe("INVALID_DATE");
  });
});

describe("updating a roster", () => {
  it("returns the roster with warnings for the day it now sits on", async () => {
    insertOff(e1(), "2026-11-07");
    const created = await post(createBody({ fromDate: "2026-11-02", toDate: "2026-11-02" }));
    const id = created.body.data[0]._id.toString();

    const res = await put(id, { date: "2026-11-07" });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.warnings).toEqual([
      expect.objectContaining({ kind: "DAY_OFF", employeeId: e1(), date: "2026-11-07" }),
    ]);
  });

  it("warns when an employee is added to a roster on a day they are on leave", async () => {
    insertLeave(e2(), "2026-11-02", "2026-11-02", "APPROVED");
    const created = await post(createBody({ fromDate: "2026-11-02", toDate: "2026-11-02" }));
    const id = created.body.data[0]._id.toString();

    const res = await put(id, { employees: [e1(), e2()] });
    expect(res.status).toBe(200);
    expect(res.body.meta.warnings).toEqual([
      expect.objectContaining({ kind: "APPROVED_LEAVE", employeeId: e2(), date: "2026-11-02" }),
    ]);
  });

  it("ignores hotelId and other non-roster fields in the body", async () => {
    const created = await post(createBody({ fromDate: "2026-11-02", toDate: "2026-11-02" }));
    const id = created.body.data[0]._id.toString();

    const res = await put(id, { hotelId: hotelB._id.toString(), schemaVersion: 99 });
    expect(res.status).toBe(200);
    const stored = rosters.docs.find((r) => String(r._id) === id)!;
    expect(String(stored.hotelId)).toBe(hotelA._id.toString());
    expect(stored.schemaVersion).toBe(1);
  });

  it("does not let a manager of another hotel update the roster", async () => {
    const created = await post(createBody({ fromDate: "2026-11-02", toDate: "2026-11-02" }));
    const id = created.body.data[0]._id.toString();

    const res = await put(id, { date: "2026-11-09" }, tokenFor(managerB));
    expect(res.status).toBe(404);
    expect(res.body.meta.code).toBe("ROSTER_NOT_FOUND");
  });

  it("returns ROSTER_NOT_FOUND for an unknown roster", async () => {
    const res = await put(new mongoose.Types.ObjectId().toString(), { date: "2026-11-09" });
    expect(res.status).toBe(404);
    expect(res.body.meta.code).toBe("ROSTER_NOT_FOUND");
  });
});
