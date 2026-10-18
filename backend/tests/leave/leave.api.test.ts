/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * HTTP-level tests for /api/v1/leave.
 *
 * Runs the real Express app with the real JWT auth, tenant middleware, leave
 * actor resolution, controllers, services and repositories. Only the Mongoose
 * models are replaced by the in-memory double, which honours the production
 * unique index on day offs, so duplicate and race behaviour is real.
 */

import request from "supertest";

jest.mock("../../src/modules/users/user.model", () => ({
  UserModel: require("../helpers/fixtures").UserModel,
}));
jest.mock("../../src/modules/hotel/hotel.model", () => ({
  HotelModel: require("../helpers/fixtures").HotelModel,
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
    uniqueIndexes: [{ name: "hotelId_1_userId_1_date_1", fields: ["hotelId", "userId", "date"] }],
    timestamps: true,
  }),
}));

import { createApp } from "../../src/app";
import { ROUTE_PREFIX } from "../../src/shared/constants";
import { UserRole } from "../../src/shared/enums/user";
import { LeaveRequestModel } from "../../src/modules/leave/leave-request.model";
import { DayOffModel } from "../../src/modules/leave/day-off.model";
import type { MemoryModel } from "../helpers/memory-db";
import {
  hotelTokenFor,
  makeHotel,
  makeUser,
  resetWorld,
  tokenFor,
} from "../helpers/fixtures";

const app = createApp();
// The jest.mock'd models are in-memory doubles; these casts expose their test helpers.
const leaveRequestStore = LeaveRequestModel as unknown as MemoryModel;
const dayOffStore = DayOffModel as unknown as MemoryModel;
const LEAVE = `${ROUTE_PREFIX}/leave`;
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

let hotelA: any;
let hotelB: any;
let managerA: any;
let employeeA1: any;
let employeeA2: any;
let managerB: any;
let gigWorker: any;

beforeEach(() => {
  resetWorld();
  leaveRequestStore.reset();
  dayOffStore.reset();

  hotelA = makeHotel("Hotel Alpha");
  hotelB = makeHotel("Hotel Beta");
  managerA = makeUser(UserRole.MANAGER, hotelA);
  employeeA1 = makeUser(UserRole.EMPLOYEE, hotelA, { profile: { firstName: "Ravi", lastName: "Kumar" } });
  employeeA2 = makeUser(UserRole.EMPLOYEE, hotelA, { profile: { firstName: "Meera", lastName: "Shah" } });
  managerB = makeUser(UserRole.MANAGER, hotelB);
  gigWorker = makeUser(UserRole.STUDENT, null);
});

const leaveBody = (overrides: Record<string, unknown> = {}) => ({
  type: "CASUAL",
  fromDate: "2026-11-02",
  toDate: "2026-11-04",
  reason: "Family function",
  ...overrides,
});

async function submit(token: string, body = leaveBody()) {
  return request(app).post(`${LEAVE}/requests`).set(bearer(token)).send(body);
}

describe("authentication and tenancy", () => {
  it("rejects a request without a token", async () => {
    const res = await request(app).get(`${LEAVE}/requests/mine`);
    expect(res.status).toBe(401);
  });

  it("refuses a gig worker, who has no hotel", async () => {
    const res = await submit(tokenFor(gigWorker));
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, meta: { code: "LEAVE_NO_HOTEL_SCOPE" } });
  });

  it("ignores an X-Hotel-Id header from a staff member", async () => {
    await submit(tokenFor(employeeA1));
    const res = await request(app)
      .get(`${LEAVE}/requests/mine`)
      .set({ ...bearer(tokenFor(employeeA1)), "X-Hotel-Id": hotelB._id.toString() });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it("scopes the hotel-owner account to its own hotel even when X-Hotel-Id names another", async () => {
    await submit(tokenFor(employeeA1));
    await submit(tokenFor(employeeA2), leaveBody({ fromDate: "2026-12-01", toDate: "2026-12-02" }));

    const res = await request(app)
      .get(`${LEAVE}/requests`)
      .set({ ...bearer(hotelTokenFor(hotelA)), "X-Hotel-Id": hotelB._id.toString() });
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(2);
  });

  it("does not let another hotel's manager approve, reject or read a request", async () => {
    const created = await submit(tokenFor(employeeA1));
    const id = created.body.data.id;
    const intruder = bearer(tokenFor(managerB));

    expect((await request(app).get(`${LEAVE}/requests/${id}`).set(intruder)).status).toBe(404);
    const approve = await request(app).patch(`${LEAVE}/requests/${id}/approve`).set(intruder).send({});
    expect(approve.status).toBe(404);
    expect(approve.body.meta.code).toBe("LEAVE_REQUEST_NOT_FOUND");
    const reject = await request(app).patch(`${LEAVE}/requests/${id}/reject`).set(intruder).send({ note: "x" });
    expect(reject.status).toBe(404);
  });

  it("returns 404 for an unknown route under /leave, not a role error", async () => {
    const res = await request(app).get(`${LEAVE}/does-not-exist`).set(bearer(tokenFor(employeeA1)));
    expect(res.status).toBe(404);
  });
});

describe("leave request lifecycle", () => {
  it("lets an employee submit a request and returns the documented DTO", async () => {
    const res = await submit(tokenFor(employeeA1));
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      employeeId: employeeA1._id.toString(),
      employee: { firstName: "Ravi", lastName: "Kumar" },
      type: "CASUAL",
      status: "PENDING",
      fromDate: "2026-11-02",
      toDate: "2026-11-04",
      leaveDays: 3,
      reviewedBy: null,
      reviewNote: null,
    });
    expect(typeof res.body.data.id).toBe("string");
  });

  it("ignores forged owner and status fields in the body", async () => {
    const res = await submit(
      tokenFor(employeeA1),
      leaveBody({ userId: employeeA2._id.toString(), hotelId: hotelB._id.toString(), status: "APPROVED" }),
    );
    expect(res.status).toBe(201);
    expect(res.body.data.employeeId).toBe(employeeA1._id.toString());
    expect(res.body.data.status).toBe("PENDING");
  });

  it("returns LEAVE_VALIDATION_FAILED with a readable message for bad input", async () => {
    const res = await submit(tokenFor(employeeA1), leaveBody({ fromDate: "2026-02-30" }));
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.meta.code).toBe("LEAVE_VALIDATION_FAILED");
    expect(res.body.message).toMatch(/valid date/);
  });

  it("returns LEAVE_OVERLAP when a live request already covers the dates", async () => {
    await submit(tokenFor(employeeA1));
    const res = await submit(tokenFor(employeeA1), leaveBody({ fromDate: "2026-11-04", toDate: "2026-11-05" }));
    expect(res.status).toBe(409);
    expect(res.body.meta.code).toBe("LEAVE_OVERLAP");
  });

  it("admits exactly one of two concurrent overlapping submissions", async () => {
    const token = tokenFor(employeeA1);
    const [first, second] = await Promise.all([submit(token), submit(token)]);
    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
    expect(leaveRequestStore.docs).toHaveLength(1);
  });

  it("lets the manager list every request in the hotel with names and paging", async () => {
    await submit(tokenFor(employeeA1));
    await submit(tokenFor(employeeA2), leaveBody({ fromDate: "2026-12-01", toDate: "2026-12-01" }));

    const res = await request(app)
      .get(`${LEAVE}/requests?limit=1&page=2`)
      .set(bearer(tokenFor(managerA)));
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ page: 2, limit: 1, total: 2, totalPages: 2 });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].employee).toBeTruthy();
  });

  it("rejects an out-of-range limit before querying", async () => {
    const res = await request(app).get(`${LEAVE}/requests?limit=500`).set(bearer(tokenFor(managerA)));
    expect(res.status).toBe(400);
    expect(res.body.meta.code).toBe("LEAVE_VALIDATION_FAILED");
  });

  it("forbids an employee from listing the whole hotel", async () => {
    const res = await request(app).get(`${LEAVE}/requests`).set(bearer(tokenFor(employeeA1)));
    expect(res.status).toBe(403);
    expect(res.body.meta.code).toBe("LEAVE_APPROVER_FORBIDDEN");
  });

  it("lets a manager approve, and refuses a second decision on the same request", async () => {
    const created = await submit(tokenFor(employeeA1));
    const id = created.body.data.id;

    const approved = await request(app)
      .patch(`${LEAVE}/requests/${id}/approve`)
      .set(bearer(tokenFor(managerA)))
      .send({ note: "Covered" });
    expect(approved.status).toBe(200);
    expect(approved.body.data).toMatchObject({
      status: "APPROVED",
      reviewedBy: managerA._id.toString(),
      reviewNote: "Covered",
    });

    const again = await request(app).patch(`${LEAVE}/requests/${id}/approve`).set(bearer(tokenFor(managerA))).send({});
    expect(again.status).toBe(409);
    expect(again.body.meta.code).toBe("LEAVE_NOT_PENDING");
  });

  it("requires a reason to reject, and records it when given", async () => {
    const created = await submit(tokenFor(employeeA1));
    const id = created.body.data.id;
    const manager = bearer(tokenFor(managerA));

    const missing = await request(app).patch(`${LEAVE}/requests/${id}/reject`).set(manager).send({});
    expect(missing.status).toBe(400);
    expect(missing.body.meta.code).toBe("LEAVE_VALIDATION_FAILED");

    const rejected = await request(app)
      .patch(`${LEAVE}/requests/${id}/reject`)
      .set(manager)
      .send({ note: "Two chefs already off" });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data).toMatchObject({ status: "REJECTED", reviewNote: "Two chefs already off" });
  });

  it("refuses an employee who tries to approve their own request", async () => {
    const created = await submit(tokenFor(employeeA1));
    const res = await request(app)
      .patch(`${LEAVE}/requests/${created.body.data.id}/approve`)
      .set(bearer(tokenFor(employeeA1)))
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.meta.code).toBe("LEAVE_APPROVER_FORBIDDEN");
  });

  it("lets an employee cancel an approved leave that has not started", async () => {
    const created = await submit(tokenFor(employeeA1));
    const id = created.body.data.id;
    await request(app).patch(`${LEAVE}/requests/${id}/approve`).set(bearer(tokenFor(managerA))).send({});

    const res = await request(app).patch(`${LEAVE}/requests/${id}/cancel`).set(bearer(tokenFor(employeeA1)));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("CANCELLED");
    expect(res.body.data.cancelledAt).toEqual(expect.any(String));
  });

  it("hides a colleague's request from an employee", async () => {
    const created = await submit(tokenFor(employeeA1));
    const res = await request(app)
      .get(`${LEAVE}/requests/${created.body.data.id}`)
      .set(bearer(tokenFor(employeeA2)));
    expect(res.status).toBe(404);
    expect(res.body.meta.code).toBe("LEAVE_REQUEST_NOT_FOUND");
  });

  it("returns 400 for a malformed id instead of a database cast error", async () => {
    const res = await request(app).get(`${LEAVE}/requests/not-an-object-id`).set(bearer(tokenFor(managerA)));
    expect(res.status).toBe(400);
    expect(res.body.meta.code).toBe("LEAVE_VALIDATION_FAILED");
  });
});

describe("day offs over HTTP", () => {
  // 1 Nov 2026 is a Sunday and 8 Nov is the next Sunday.
  const sundayOffs = {
    userIds: [] as string[],
    fromDate: "2026-11-01",
    toDate: "2026-11-14",
    weekdays: [0],
  };

  it("lets a manager assign weekly offs, skipping ones already scheduled", async () => {
    const body = { ...sundayOffs, userIds: [employeeA1._id.toString()] };
    const first = await request(app).post(`${LEAVE}/offs`).set(bearer(tokenFor(managerA))).send(body);
    expect(first.status).toBe(201);
    expect(first.body.data.created.map((o: any) => o.date)).toEqual(["2026-11-01", "2026-11-08"]);
    expect(first.body.data.created[0].type).toBe("WEEKLY_OFF");

    const second = await request(app).post(`${LEAVE}/offs`).set(bearer(tokenFor(managerA))).send(body);
    expect(second.status).toBe(201);
    expect(second.body.data.created).toHaveLength(0);
    expect(second.body.data.skipped).toHaveLength(2);
  });

  it("refuses to assign offs to an employee in another hotel", async () => {
    const foreign = makeUser(UserRole.EMPLOYEE, hotelB);
    const res = await request(app)
      .post(`${LEAVE}/offs`)
      .set(bearer(tokenFor(managerA)))
      .send({ ...sundayOffs, userIds: [foreign._id.toString()] });
    expect(res.status).toBe(404);
    expect(res.body.meta.code).toBe("EMPLOYEE_NOT_FOUND");
    expect(dayOffStore.docs).toHaveLength(0);
  });

  it("forbids employees from assigning offs", async () => {
    const res = await request(app)
      .post(`${LEAVE}/offs`)
      .set(bearer(tokenFor(employeeA1)))
      .send({ ...sundayOffs, userIds: [employeeA1._id.toString()] });
    expect(res.status).toBe(403);
    expect(res.body.meta.code).toBe("LEAVE_APPROVER_FORBIDDEN");
  });

  it("requires a window on the manager calendar", async () => {
    const res = await request(app).get(`${LEAVE}/offs`).set(bearer(tokenFor(managerA)));
    expect(res.status).toBe(400);
    expect(res.body.meta.code).toBe("LEAVE_VALIDATION_FAILED");
  });

  it("gives the manager the calendar and the employee only their own offs", async () => {
    await request(app)
      .post(`${LEAVE}/offs`)
      .set(bearer(tokenFor(managerA)))
      .send({ ...sundayOffs, userIds: [employeeA1._id.toString(), employeeA2._id.toString()] });

    const calendar = await request(app)
      .get(`${LEAVE}/offs?from=2026-11-01&to=2026-11-30`)
      .set(bearer(tokenFor(managerA)));
    expect(calendar.status).toBe(200);
    expect(calendar.body.meta.total).toBe(4);

    const mine = await request(app)
      .get(`${LEAVE}/offs/mine?from=2026-11-01&to=2026-11-30`)
      .set(bearer(tokenFor(employeeA1)));
    expect(mine.status).toBe(200);
    expect(mine.body.data).toHaveLength(2);
    expect(mine.body.data.every((o: any) => o.employeeId === employeeA1._id.toString())).toBe(true);
  });

  it("removes an off, then reports it as not found", async () => {
    const assigned = await request(app)
      .post(`${LEAVE}/offs`)
      .set(bearer(tokenFor(managerA)))
      .send({ ...sundayOffs, userIds: [employeeA1._id.toString()] });
    const id = assigned.body.data.created[0].id;

    const removed = await request(app).delete(`${LEAVE}/offs/${id}`).set(bearer(tokenFor(managerA)));
    expect(removed.status).toBe(200);
    expect(removed.body.data).toEqual({ id, deleted: true });

    const again = await request(app).delete(`${LEAVE}/offs/${id}`).set(bearer(tokenFor(managerA)));
    expect(again.status).toBe(404);
    expect(again.body.meta.code).toBe("DAY_OFF_NOT_FOUND");
  });
});

describe("off days shape leave days", () => {
  it("does not count a scheduled off inside a submitted leave", async () => {
    await request(app)
      .post(`${LEAVE}/offs`)
      .set(bearer(tokenFor(managerA)))
      .send({ userIds: [employeeA1._id.toString()], fromDate: "2026-11-03", toDate: "2026-11-03" });

    const res = await submit(tokenFor(employeeA1));
    expect(res.status).toBe(201);
    expect(res.body.data.leaveDays).toBe(2);
  });
});

