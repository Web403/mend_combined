// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave-request.repository.ts
//
// Database access for leave requests. Every query is scoped by `hotelId`, and
// status transitions are conditional updates, so two managers acting on the
// same request cannot both succeed.
// ─────────────────────────────────────────────────────────────────────────────

import { QueryFilter, Types } from "mongoose";
import { ILeaveRequest } from "../../shared/interfaces/leave.d";
import { LeaveRequestStatus } from "../../shared/enums/leave.enum";
import { LeaveRequestModel } from "./leave-request.model";
import { LeaveRequestListFilters } from "./leave.validation";

/** Statuses that hold dates: a request in either state blocks overlapping requests. */
export const LIVE_LEAVE_STATUSES: readonly LeaveRequestStatus[] = [
  LeaveRequestStatus.PENDING,
  LeaveRequestStatus.APPROVED,
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
  /** Moves a request to `set.status` only if it is still in `fromStatus`. */
  transitionFromStatus(
    hotelId: string,
    id: string,
    fromStatus: LeaveRequestStatus,
    set: Partial<ILeaveRequest>,
  ): Promise<ILeaveRequest | null>;
  /** Undoes an approval, clearing the review fields. Used when a conflict is detected after approving. */
  revertApprovalToPending(hotelId: string, id: string): Promise<ILeaveRequest | null>;
  deleteById(hotelId: string, id: string): Promise<void>;
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

  async revertApprovalToPending(hotelId, id) {
    return LeaveRequestModel.findOneAndUpdate(
      { _id: id, hotelId, status: LeaveRequestStatus.APPROVED },
      {
        $set: { status: LeaveRequestStatus.PENDING },
        $unset: { reviewedBy: 1, reviewedAt: 1, reviewNote: 1 },
      },
      { new: true },
    ).lean<ILeaveRequest>();
  },

  async deleteById(hotelId, id) {
    await LeaveRequestModel.deleteOne({ _id: id, hotelId });
  },
};
