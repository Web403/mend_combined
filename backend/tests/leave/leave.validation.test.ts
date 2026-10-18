import { DayOffType, LeaveRequestStatus, LeaveType } from "../../src/shared/enums/leave.enum";
import {
  DAY_OFF_ASSIGN_MAX_CELLS,
  DAY_OFF_ASSIGN_MAX_EMPLOYEES,
  LEAVE_REQUEST_MAX_SPAN_DAYS,
  MAX_REASON_LENGTH,
} from "../../src/modules/leave/leave.constants";
import {
  parseAssignDayOffs,
  parseCreateLeaveRequest,
  parseDayOffListQuery,
  parseLeaveRequestListQuery,
  parseMyDayOffQuery,
  parseObjectIdString,
  parseReviewDecision,
} from "../../src/modules/leave/leave.validation";
import { LeaveError } from "../../src/modules/leave/leave.error";

const ID_A = "65a1b2c3d4e5f60718293a4b";
const ID_B = "65a1b2c3d4e5f60718293a4c";

const expectCode = (fn: () => unknown, code: string) => {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(LeaveError);
    expect((err as LeaveError).code).toBe(code);
    return;
  }
  throw new Error(`expected ${code} to be thrown`);
};

const validLeave = () => ({
  type: "CASUAL",
  fromDate: "2026-11-01",
  toDate: "2026-11-03",
  reason: "  Family wedding  ",
});

describe("parseCreateLeaveRequest", () => {
  it("accepts a valid payload and trims the reason", () => {
    const parsed = parseCreateLeaveRequest(validLeave());
    expect(parsed.type).toBe(LeaveType.CASUAL);
    expect(parsed.reason).toBe("Family wedding");
    expect(parsed.from.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(parsed.to.toISOString()).toBe("2026-11-03T00:00:00.000Z");
  });

  it("ignores client-supplied tenant, owner and status fields", () => {
    const parsed = parseCreateLeaveRequest({
      ...validLeave(),
      hotelId: ID_B,
      userId: ID_B,
      status: "APPROVED",
      reviewedBy: "attacker",
    });
    expect(Object.keys(parsed).sort()).toEqual(["from", "reason", "to", "type"]);
  });

  it("rejects an unknown leave type", () => {
    expectCode(() => parseCreateLeaveRequest({ ...validLeave(), type: "VACATION" }), "LEAVE_VALIDATION_FAILED");
  });

  it("rejects a missing or blank reason", () => {
    expectCode(() => parseCreateLeaveRequest({ ...validLeave(), reason: undefined }), "LEAVE_VALIDATION_FAILED");
    expectCode(() => parseCreateLeaveRequest({ ...validLeave(), reason: "   " }), "LEAVE_VALIDATION_FAILED");
  });

  it("rejects a reason over the length limit", () => {
    expectCode(
      () => parseCreateLeaveRequest({ ...validLeave(), reason: "x".repeat(MAX_REASON_LENGTH + 1) }),
      "LEAVE_VALIDATION_FAILED",
    );
  });

  it("rejects a range that ends before it starts", () => {
    expectCode(
      () => parseCreateLeaveRequest({ ...validLeave(), fromDate: "2026-11-05", toDate: "2026-11-01" }),
      "LEAVE_VALIDATION_FAILED",
    );
  });

  it("rejects a range longer than the policy maximum", () => {
    const to = new Date(Date.UTC(2026, 10, 1 + LEAVE_REQUEST_MAX_SPAN_DAYS - 1)).toISOString().slice(0, 10);
    // Exactly the maximum is allowed…
    expect(() => parseCreateLeaveRequest({ ...validLeave(), toDate: to })).not.toThrow();
    // …one more day is not.
    const tooLong = new Date(Date.UTC(2026, 10, 1 + LEAVE_REQUEST_MAX_SPAN_DAYS)).toISOString().slice(0, 10);
    expectCode(() => parseCreateLeaveRequest({ ...validLeave(), toDate: tooLong }), "LEAVE_VALIDATION_FAILED");
  });

  it("rejects a body that is not an object", () => {
    expectCode(() => parseCreateLeaveRequest(null), "LEAVE_VALIDATION_FAILED");
    expectCode(() => parseCreateLeaveRequest(["x"]), "LEAVE_VALIDATION_FAILED");
    expectCode(() => parseCreateLeaveRequest("text"), "LEAVE_VALIDATION_FAILED");
  });
});

describe("parseReviewDecision", () => {
  it("requires a note when rejecting", () => {
    expectCode(() => parseReviewDecision({}, { requireNote: true }), "LEAVE_VALIDATION_FAILED");
    expectCode(() => parseReviewDecision({ note: "  " }, { requireNote: true }), "LEAVE_VALIDATION_FAILED");
    expect(parseReviewDecision({ note: " Roster clash " }, { requireNote: true })).toEqual({ note: "Roster clash" });
  });

  it("treats an approval note as optional", () => {
    expect(parseReviewDecision({}, { requireNote: false })).toEqual({ note: undefined });
    expect(parseReviewDecision({ note: "ok" }, { requireNote: false })).toEqual({ note: "ok" });
  });

  it("rejects a non-string note", () => {
    expectCode(() => parseReviewDecision({ note: 42 }, { requireNote: false }), "LEAVE_VALIDATION_FAILED");
  });
});

describe("parseAssignDayOffs", () => {
  const base = () => ({ userIds: [ID_A], fromDate: "2026-11-01", toDate: "2026-11-07" });

  it("defaults to weekly offs on every day when weekdays are omitted", () => {
    const parsed = parseAssignDayOffs(base());
    expect(parsed.type).toBe(DayOffType.WEEKLY_OFF);
    expect(parsed.weekdays).toBeUndefined();
    expect(parsed.userIds).toEqual([ID_A]);
  });

  it("de-duplicates employees and sorts weekdays", () => {
    const parsed = parseAssignDayOffs({ ...base(), userIds: [ID_A, ID_A, ID_B], weekdays: [0, 6, 0] });
    expect(parsed.userIds).toEqual([ID_A, ID_B]);
    expect(parsed.weekdays).toEqual([0, 6]);
  });

  it("accepts the explicit off types", () => {
    expect(parseAssignDayOffs({ ...base(), type: "COMP_OFF" }).type).toBe(DayOffType.COMP_OFF);
    expect(parseAssignDayOffs({ ...base(), type: "HOLIDAY" }).type).toBe(DayOffType.HOLIDAY);
    expectCode(() => parseAssignDayOffs({ ...base(), type: "SICK" }), "LEAVE_VALIDATION_FAILED");
  });

  it("rejects missing, empty, or non-array userIds", () => {
    expectCode(() => parseAssignDayOffs({ ...base(), userIds: undefined }), "LEAVE_VALIDATION_FAILED");
    expectCode(() => parseAssignDayOffs({ ...base(), userIds: [] }), "LEAVE_VALIDATION_FAILED");
    expectCode(() => parseAssignDayOffs({ ...base(), userIds: ID_A }), "LEAVE_VALIDATION_FAILED");
  });

  it("rejects malformed employee ids", () => {
    expectCode(() => parseAssignDayOffs({ ...base(), userIds: ["not-an-id"] }), "LEAVE_VALIDATION_FAILED");
    expectCode(() => parseAssignDayOffs({ ...base(), userIds: [{ $ne: null }] }), "LEAVE_VALIDATION_FAILED");
  });

  it("caps the number of employees per call", () => {
    const ids = Array.from({ length: DAY_OFF_ASSIGN_MAX_EMPLOYEES + 1 }, (_, i) =>
      i.toString(16).padStart(24, "a"),
    );
    expectCode(() => parseAssignDayOffs({ ...base(), userIds: ids }), "LEAVE_VALIDATION_FAILED");
  });

  it("caps employee × day work per call", () => {
    const ids = Array.from({ length: 50 }, (_, i) => i.toString(16).padStart(24, "b"));
    // 50 employees × 92 days = 4600 > the 2000-cell cap
    expect(50 * 92).toBeGreaterThan(DAY_OFF_ASSIGN_MAX_CELLS);
    expectCode(
      () => parseAssignDayOffs({ userIds: ids, fromDate: "2026-01-01", toDate: "2026-04-02" }),
      "LEAVE_VALIDATION_FAILED",
    );
  });

  it("rejects invalid weekday values", () => {
    expectCode(() => parseAssignDayOffs({ ...base(), weekdays: [] }), "LEAVE_VALIDATION_FAILED");
    expectCode(() => parseAssignDayOffs({ ...base(), weekdays: [7] }), "LEAVE_VALIDATION_FAILED");
    expectCode(() => parseAssignDayOffs({ ...base(), weekdays: [1.5] }), "LEAVE_VALIDATION_FAILED");
    expectCode(() => parseAssignDayOffs({ ...base(), weekdays: ["0"] }), "LEAVE_VALIDATION_FAILED");
  });

  it("rejects a range longer than the off assignment limit", () => {
    expectCode(
      () => parseAssignDayOffs({ userIds: [ID_A], fromDate: "2026-01-01", toDate: "2026-12-31" }),
      "LEAVE_VALIDATION_FAILED",
    );
  });
});

describe("list query parsers", () => {
  it("rejects repeated or nested query parameters instead of coercing them", () => {
    expectCode(() => parseLeaveRequestListQuery({ status: ["PENDING", "APPROVED"] }), "LEAVE_VALIDATION_FAILED");
    expectCode(() => parseLeaveRequestListQuery({ userId: { $ne: "x" } }), "LEAVE_VALIDATION_FAILED");
  });

  it("applies pagination defaults and bounds", () => {
    expect(parseLeaveRequestListQuery({})).toMatchObject({ page: 1, limit: 20 });
    expect(parseLeaveRequestListQuery({ page: "3", limit: "100" })).toMatchObject({ page: 3, limit: 100 });
    expectCode(() => parseLeaveRequestListQuery({ limit: "0" }), "LEAVE_VALIDATION_FAILED");
    expectCode(() => parseLeaveRequestListQuery({ limit: "101" }), "LEAVE_VALIDATION_FAILED");
    expectCode(() => parseLeaveRequestListQuery({ page: "-1" }), "LEAVE_VALIDATION_FAILED");
    expectCode(() => parseLeaveRequestListQuery({ page: "1.5" }), "LEAVE_VALIDATION_FAILED");
  });

  it("requires from and to to be supplied together", () => {
    expectCode(() => parseLeaveRequestListQuery({ from: "2026-10-01" }), "LEAVE_VALIDATION_FAILED");
    expectCode(() => parseLeaveRequestListQuery({ to: "2026-10-01" }), "LEAVE_VALIDATION_FAILED");
  });

  it("validates status and type filters against the enums", () => {
    expect(parseLeaveRequestListQuery({ status: "REJECTED" }).status).toBe(LeaveRequestStatus.REJECTED);
    expectCode(() => parseLeaveRequestListQuery({ status: "DONE" }), "LEAVE_VALIDATION_FAILED");
    expectCode(() => parseLeaveRequestListQuery({ type: "PAID" }), "LEAVE_VALIDATION_FAILED");
  });

  it("requires from and to for the manager off calendar", () => {
    expectCode(() => parseDayOffListQuery({}), "LEAVE_VALIDATION_FAILED");
    expect(parseDayOffListQuery({ from: "2026-10-01", to: "2026-10-31" })).toMatchObject({
      page: 1,
      limit: 20,
    });
  });

  it("defaults the employee's own offs to today through +30 days", () => {
    const today = new Date("2026-10-18T00:00:00.000Z");
    const range = parseMyDayOffQuery({}, today);
    expect(range.from.toISOString()).toBe("2026-10-18T00:00:00.000Z");
    expect(range.to.toISOString()).toBe("2026-11-17T00:00:00.000Z");
  });
});

describe("parseObjectIdString", () => {
  it("accepts a 24-hex id", () => {
    expect(parseObjectIdString(ID_A, "id")).toBe(ID_A);
  });

  it.each([["short"], ["zz1b2c3d4e5f60718293a4b"], [""], [undefined], [123]])("rejects %p", (value) => {
    expectCode(() => parseObjectIdString(value, "id"), "LEAVE_VALIDATION_FAILED");
  });
});
