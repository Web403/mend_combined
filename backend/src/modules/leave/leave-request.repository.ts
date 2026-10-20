// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave-request.repository.ts
//
// Database access for leave requests. Every query is scoped by `hotelId`.
// Manager and HR votes are independent; conditional updates make each lane
// single-write, and HR's vote always controls the effective request status.
// ─────────────────────────────────────────────────────────────────────────────

import { QueryFilter, Types } from "mongoose";
import { ILeaveRequest, ILeaveReview } from "../../shared/interfaces/leave.d";
import {
  LeaveRequestStatus,
  LeaveReviewDecision,
  LeaveReviewerRole,
} from "../../shared/enums/leave.enum";
import { LeaveRequestModel } from "./leave-request.model";
import { LeaveRequestListFilters } from "./leave.validation";

/** Statuses that hold dates: a request in either state blocks overlapping requests. */
export const LIVE_LEAVE_STATUSES: readonly LeaveRequestStatus[] = [
  LeaveRequestStatus.PENDING,
  LeaveRequestStatus.APPROVED,
];

const REVIEWABLE_STATUSES: readonly LeaveRequestStatus[] = [
  LeaveRequestStatus.PENDING,
  LeaveRequestStatus.APPROVED,
  LeaveRequestStatus.REJECTED,
];

export interface OverlapQuery {
  hotelId: string;
  userId: string;
  from: Date;
  to: Date;
  statuses?: readonly LeaveRequestStatus[];
  excludeId?: string;
}

export interface LiveRangeQuery {
  hotelId: string;
  userIds: string[];
  from: Date;
  to: Date;
}

export interface LeaveRequestRepository {
  create(data: Partial<ILeaveRequest>): Promise<ILeaveRequest>;
  /** Live (PENDING or APPROVED) requests of several employees touching [from, to]. Used for roster warnings. */
  findLiveInRangeForUsers(query: LiveRangeQuery): Promise<ILeaveRequest[]>;
  findByIdInHotel(hotelId: string, id: string): Promise<ILeaveRequest | null>;
  findOverlapping(query: OverlapQuery): Promise<ILeaveRequest[]>;
  findPage(
    hotelId: string,
    filters: LeaveRequestListFilters,
  ): Promise<{ items: ILeaveRequest[]; total: number }>;
  /** Moves an employee-owned request to CANCELLED only while its observed status is unchanged. */
  transitionFromStatus(
    hotelId: string,
    id: string,
    fromStatus: LeaveRequestStatus,
    set: Partial<ILeaveRequest>,
  ): Promise<ILeaveRequest | null>;
  /** Atomically records one role's vote. HR's vote takes precedence over manager votes. */
  saveReviewDecision(
    hotelId: string,
    id: string,
    role: LeaveReviewerRole,
    review: ILeaveReview,
    approvalRosterIds?: string[],
    legacyManagerReview?: ILeaveReview,
  ): Promise<ILeaveRequest | null>;
  /** Compensates a failed post-decision roster write by restoring the pre-decision review state. */
  undoReviewDecision(
    hotelId: string,
    id: string,
    role: LeaveReviewerRole,
    decision: LeaveReviewDecision,
    prior: ILeaveRequest,
  ): Promise<ILeaveRequest | null>;
  deleteById(hotelId: string, id: string): Promise<void>;
}

const statusForDecision = (decision: LeaveReviewDecision): LeaveRequestStatus =>
  decision === LeaveReviewDecision.APPROVED
    ? LeaveRequestStatus.APPROVED
    : LeaveRequestStatus.REJECTED;

function effectiveReviewFields(review: ILeaveReview, role: LeaveReviewerRole) {
  return {
    reviewedBy: review.reviewedBy,
    reviewedAt: review.reviewedAt,
    reviewedByRole: role,
    reviewNote: review.note ?? null,
  };
}

/** Creates an update restoring the externally visible fields from the prior snapshot. */
function restorePriorState(prior: ILeaveRequest, unsetReviewField: "managerReview" | "hrReview") {
  const $set: Record<string, unknown> = { status: prior.status };
  const $unset: Record<string, 1> = { [unsetReviewField]: 1 };
  const legacyFields = ["reviewedBy", "reviewedAt", "reviewedByRole", "reviewNote"] as const;

  for (const field of legacyFields) {
    if (prior[field] === undefined) $unset[field] = 1;
    else $set[field] = prior[field];
  }
  if (prior.approvalRosterIds === undefined) $unset.approvalRosterIds = 1;
  else $set.approvalRosterIds = prior.approvalRosterIds;

  return { $set, $unset };
}

export const leaveRequestRepository: LeaveRequestRepository = {
  async create(data) {
    return LeaveRequestModel.create(data);
  },

  async findByIdInHotel(hotelId, id) {
    return LeaveRequestModel.findOne({ _id: id, hotelId }).lean<ILeaveRequest>();
  },

  async findLiveInRangeForUsers({ hotelId, userIds, from, to }) {
    if (userIds.length === 0) return [];
    return LeaveRequestModel.find({
      hotelId,
      userId: { $in: userIds.map((id) => new Types.ObjectId(id)) },
      status: { $in: [...LIVE_LEAVE_STATUSES] },
      fromDate: { $lte: to },
      toDate: { $gte: from },
    })
      .sort({ fromDate: 1, _id: 1 })
      .lean<ILeaveRequest[]>();
  },

  async findOverlapping({ hotelId, userId, from, to, statuses = LIVE_LEAVE_STATUSES, excludeId }) {
    const filter: QueryFilter<ILeaveRequest> = {
      hotelId,
      userId,
      status: { $in: [...statuses] },
      fromDate: { $lte: to },
      toDate: { $gte: from },
    };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }
    return LeaveRequestModel.find(filter).sort({ fromDate: 1, _id: 1 }).lean<ILeaveRequest[]>();
  },

  async findPage(hotelId, filters) {
    const filter: QueryFilter<ILeaveRequest> = { hotelId };
    if (filters.userId) filter.userId = new Types.ObjectId(filters.userId);
    if (filters.status) filter.status = filters.status;
    if (filters.type) filter.type = filters.type;
    if (filters.pendingFor) {
      if (filters.status === LeaveRequestStatus.CANCELLED) return { items: [], total: 0 };
      if (!filters.status) filter.status = { $in: [...REVIEWABLE_STATUSES] };

      if (filters.pendingFor === LeaveReviewerRole.HR) {
        filter["hrReview.decision"] = { $exists: false };
      } else {
        filter["managerReview.decision"] = { $exists: false };
        // Legacy requests recorded their manager vote only in the flat effective
        // fields. Keep those out of the manager queue, while HR-first decisions
        // (reviewedByRole=HR) remain available to a manager who has not voted.
        filter.$or = [
          { reviewedBy: { $exists: false } },
          { reviewedBy: null },
          { reviewedByRole: LeaveReviewerRole.HR },
        ];
      }
    }
    if (filters.from && filters.to) {
      filter.fromDate = { $lte: filters.to };
      filter.toDate = { $gte: filters.from };
    }

    const [items, total] = await Promise.all([
      LeaveRequestModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((filters.page - 1) * filters.limit)
        .limit(filters.limit)
        .lean<ILeaveRequest[]>(),
      LeaveRequestModel.countDocuments(filter),
    ]);
    return { items, total };
  },

  async transitionFromStatus(hotelId, id, fromStatus, set) {
    return LeaveRequestModel.findOneAndUpdate(
      { _id: id, hotelId, status: fromStatus },
      { $set: set },
      { new: true },
    ).lean<ILeaveRequest>();
  },

  async saveReviewDecision(hotelId, id, role, review, approvalRosterIds, legacyManagerReview) {
    const baseFilter: QueryFilter<ILeaveRequest> = {
      _id: id,
      hotelId,
      status: { $in: [...REVIEWABLE_STATUSES] },
    };

    if (role === LeaveReviewerRole.HR) {
      const $set: Record<string, unknown> = {
        hrReview: review,
        status: statusForDecision(review.decision),
        ...effectiveReviewFields(review, LeaveReviewerRole.HR),
      };
      if (approvalRosterIds !== undefined) $set.approvalRosterIds = approvalRosterIds;
      if (legacyManagerReview !== undefined) $set.managerReview = legacyManagerReview;
      return LeaveRequestModel.findOneAndUpdate(
        { ...baseFilter, "hrReview.decision": { $exists: false } },
        { $set },
        { new: true },
      ).lean<ILeaveRequest>();
    }

    // A manager's vote sets the effective status only until HR has voted. The
    // two filters make that precedence atomic even if manager and HR act together.
    const managerSet: Record<string, unknown> = { managerReview: review };
    if (approvalRosterIds !== undefined) managerSet.approvalRosterIds = approvalRosterIds;
    const effectiveManagerSet = {
      ...managerSet,
      status: statusForDecision(review.decision),
      ...effectiveReviewFields(review, LeaveReviewerRole.MANAGER),
    };

    const withoutHrDecision = await LeaveRequestModel.findOneAndUpdate(
      {
        ...baseFilter,
        "managerReview.decision": { $exists: false },
        "hrReview.decision": { $exists: false },
      },
      { $set: effectiveManagerSet },
      { new: true },
    ).lean<ILeaveRequest>();
    if (withoutHrDecision) return withoutHrDecision;

    // HR already decided. Keep its status and legacy effective-review fields;
    // still retain the manager vote for the audit trail.
    return LeaveRequestModel.findOneAndUpdate(
      {
        ...baseFilter,
        "managerReview.decision": { $exists: false },
        "hrReview.decision": { $exists: true },
      },
      { $set: { managerReview: review } },
      { new: true },
    ).lean<ILeaveRequest>();
  },

  async undoReviewDecision(hotelId, id, role, decision, prior) {
    const baseFilter: QueryFilter<ILeaveRequest> = {
      _id: id,
      hotelId,
      [`${role === LeaveReviewerRole.HR ? "hrReview" : "managerReview"}.decision`]: decision,
    };

    if (role === LeaveReviewerRole.MANAGER) {
      // If HR decided after the manager vote, undo only the manager's lane and
      // never overwrite HR's higher-priority outcome.
      const withHrDecision = await LeaveRequestModel.findOneAndUpdate(
        { ...baseFilter, "hrReview.decision": { $exists: true } },
        { $unset: { managerReview: 1 } },
        { new: true },
      ).lean<ILeaveRequest>();
      if (withHrDecision) return withHrDecision;

      return LeaveRequestModel.findOneAndUpdate(
        {
          ...baseFilter,
          "hrReview.decision": { $exists: false },
          status: statusForDecision(decision),
        },
        restorePriorState(prior, "managerReview"),
        { new: true },
      ).lean<ILeaveRequest>();
    }

    return LeaveRequestModel.findOneAndUpdate(
      { ...baseFilter, status: statusForDecision(decision) },
      restorePriorState(prior, "hrReview"),
      { new: true },
    ).lean<ILeaveRequest>();
  },

  async deleteById(hotelId, id) {
    await LeaveRequestModel.deleteOne({ _id: id, hotelId });
  },
};
