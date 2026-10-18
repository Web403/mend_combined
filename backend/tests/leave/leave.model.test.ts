/**
 * Validates the real Mongoose schemas (no database connection needed). These
 * tests guard the rules that the in-memory doubles cannot prove: enum and length
 * validation, and the index declarations that back the uniqueness and overlap
 * guarantees.
 */

import { Types } from "mongoose";
import { LeaveRequestModel } from "../../src/modules/leave/leave-request.model";
import { DayOffModel } from "../../src/modules/leave/day-off.model";
import { LeaveRequestStatus, LeaveType, DayOffType } from "../../src/shared/enums/leave.enum";
import { MAX_REASON_LENGTH, MAX_DAY_OFF_NOTE_LENGTH } from "../../src/modules/leave/leave.constants";

const id = () => new Types.ObjectId();

const leaveDoc = (overrides: Record<string, unknown> = {}) => ({
  hotelId: id(),
  userId: id(),
  type: LeaveType.SICK,
  fromDate: new Date("2026-11-02T00:00:00Z"),
  toDate: new Date("2026-11-03T00:00:00Z"),
  reason: "Fever",
  ...overrides,
});

const dayOffDoc = (overrides: Record<string, unknown> = {}) => ({
  hotelId: id(),
  userId: id(),
  date: new Date("2026-11-01T00:00:00Z"),
  type: DayOffType.WEEKLY_OFF,
  assignedBy: "manager",
  ...overrides,
});

describe("LeaveRequestModel", () => {
  it("accepts a well-formed request and defaults status to PENDING", () => {
    const doc = new LeaveRequestModel(leaveDoc());
    expect(doc.validateSync()).toBeUndefined();
    expect(doc.status).toBe(LeaveRequestStatus.PENDING);
  });

  it("rejects an unknown leave type", () => {
    const err = new LeaveRequestModel(leaveDoc({ type: "VACATION" })).validateSync();
    expect(err?.errors.type).toBeDefined();
  });

  it("rejects an unknown status", () => {
    const err = new LeaveRequestModel(leaveDoc({ status: "DONE" })).validateSync();
    expect(err?.errors.status).toBeDefined();
  });

  it("requires the owner, tenant, dates and reason", () => {
    const err = new LeaveRequestModel({ type: LeaveType.SICK }).validateSync();
    expect(Object.keys(err?.errors ?? {})).toEqual(
      expect.arrayContaining(["hotelId", "userId", "fromDate", "toDate", "reason"]),
    );
  });

  it("caps the reason length", () => {
    const err = new LeaveRequestModel(leaveDoc({ reason: "x".repeat(MAX_REASON_LENGTH + 1) })).validateSync();
    expect(err?.errors.reason).toBeDefined();
  });

  it("declares the indexes that the overlap and inbox queries rely on", () => {
    const indexes = LeaveRequestModel.schema.indexes().map(([fields]: [Record<string, unknown>]) => Object.keys(fields).join(","));
    expect(indexes).toEqual(
      expect.arrayContaining([
        "hotelId,userId,status,fromDate,toDate",
        "hotelId,status,createdAt",
        "hotelId,userId,createdAt",
      ]),
    );
  });
});

describe("DayOffModel", () => {
  it("accepts a well-formed off", () => {
    expect(new DayOffModel(dayOffDoc()).validateSync()).toBeUndefined();
  });

  it("rejects an unknown off type, so a leave type cannot be stored as an off", () => {
    const err = new DayOffModel(dayOffDoc({ type: LeaveType.CASUAL })).validateSync();
    expect(err?.errors.type).toBeDefined();
  });

  it("caps the note length", () => {
    const err = new DayOffModel(dayOffDoc({ note: "x".repeat(MAX_DAY_OFF_NOTE_LENGTH + 1) })).validateSync();
    expect(err?.errors.note).toBeDefined();
  });

  it("enforces one off per employee per day through a unique index", () => {
    const unique = DayOffModel.schema.indexes().find(([fields]: [Record<string, unknown>]) =>
      Object.keys(fields).join(",") === "hotelId,userId,date",
    );
    expect(unique).toBeDefined();
    expect(unique![1]).toMatchObject({ unique: true });
  });
});
