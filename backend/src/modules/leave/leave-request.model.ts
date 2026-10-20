// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave-request.model.ts
// Employee-requested absences. Collection: `leaverequests`.
// ─────────────────────────────────────────────────────────────────────────────

import { Schema, Types, model } from "mongoose";
import { ILeaveRequest } from "../../shared/interfaces/leave.d";
import {
  LeaveRequestStatus,
  LeaveReviewDecision,
  LeaveReviewerRole,
  LeaveType,
} from "../../shared/enums/leave.enum";
import { MAX_REASON_LENGTH, MAX_REVIEW_NOTE_LENGTH } from "./leave.constants";

const LeaveReviewSchema = new Schema(
  {
    decision: { type: String, enum: Object.values(LeaveReviewDecision), required: true },
    reviewedBy: { type: String, required: true },
    reviewedAt: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: MAX_REVIEW_NOTE_LENGTH },
  },
  { _id: false },
);

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    hotelId: { type: Types.ObjectId, ref: "Hotel", required: true },
    userId: { type: Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: Object.values(LeaveType), required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true, maxlength: MAX_REASON_LENGTH },
    status: {
      type: String,
      enum: Object.values(LeaveRequestStatus),
      default: LeaveRequestStatus.PENDING,
      required: true,
    },
    managerReview: { type: LeaveReviewSchema, default: undefined },
    hrReview: { type: LeaveReviewSchema, default: undefined },
    approvalRosterIds: { type: [String], default: undefined },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    reviewedByRole: { type: String, enum: Object.values(LeaveReviewerRole) },
    reviewNote: { type: String, trim: true, maxlength: MAX_REVIEW_NOTE_LENGTH },
    cancelledAt: { type: Date },
  },
  { timestamps: true },
);

// Overlap checks: "does this employee already have a live request touching these dates?"
LeaveRequestSchema.index({ hotelId: 1, userId: 1, status: 1, fromDate: 1, toDate: 1 });
// Manager/HR inbox: newest first, filtered by status or review lane.
LeaveRequestSchema.index({ hotelId: 1, status: 1, createdAt: -1 });
LeaveRequestSchema.index({ hotelId: 1, "hrReview.decision": 1, createdAt: -1 });
LeaveRequestSchema.index({ hotelId: 1, "managerReview.decision": 1, createdAt: -1 });
// Employee history.
LeaveRequestSchema.index({ hotelId: 1, userId: 1, createdAt: -1 });

export const LeaveRequestModel = model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);
