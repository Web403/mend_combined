// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave-request.service.ts
//
// Business rules for employee leave requests and manager decisions.
//
//   PENDING ──approve──▶ APPROVED
//      │  ├──reject───▶ REJECTED
//      │  └──cancel───▶ CANCELLED
//   APPROVED ──cancel (only if the leave has not started yet)──▶ CANCELLED
//
// Invariants:
//   0. Nothing is backdated. A request cannot start before today, and a pending
//      request whose start date has passed cannot be approved (reject it instead).
//   1. An employee never has two live (PENDING or APPROVED) requests whose dates
//      overlap. Enforced on submit and re-checked on approve, so concurrent
//      submissions and approvals cannot both win.
//   2. Scheduled offs are not leave. Leave days are the inclusive days in the
//      range minus the employee's offs, and a range that is entirely offs is rejected.
//   3. Nobody reviews their own request.
//   4. Every status change is a conditional update from the status that was read.
//   5. Approval takes the employee off every roster in the leave's date range.
// ─────────────────────────────────────────────────────────────────────────────

import { Types } from "mongoose";
import { ILeaveRequest, LeaveRequestDto } from "../../shared/interfaces/leave.d";
import { LeaveRequestStatus } from "../../shared/enums/leave.enum";
import { logger } from "../../core/utils/logger";
import { DayOffRepository, dayOffRepository } from "./day-off.repository";
import { LeaveRosterRepository, leaveRosterRepository } from "./leave-roster.repository";
import {
  LeaveEmployeeRepository,
  leaveEmployeeRepository,
} from "./leave-employee.repository";
import {
  LeaveRequestRepository,
  leaveRequestRepository,
} from "./leave-request.repository";
import {
  LeaveActor,
  assertCanRequestLeave,
  assertCanReviewLeave,
  canReviewLeave,
  resolveReviewerId,
} from "./leave.actor";
import { todayInBusinessTimezone, enumerateDays, toDateOnlyString } from "./leave.date";
import { LeaveErrors } from "./leave.error";
import { toEmployeeSummary, toLeaveRequestDto } from "./leave.mapper";
import {
  DateRange,
  parseCreateLeaveRequest,
  parseLeaveRequestListQuery,
  parseObjectIdString,
  parseReviewDecision,
  rangeOf,
} from "./leave.validation";

export interface LeaveRequestServiceDeps {
  requests: LeaveRequestRepository;
  dayOffs: Pick<DayOffRepository, "findByUsersInRange">;
  employees: LeaveEmployeeRepository;
  roster: Pick<LeaveRosterRepository, "removeEmployeeFromRange">;
  clock: () => Date;
}

const defaultDeps: LeaveRequestServiceDeps = {
  requests: leaveRequestRepository,
  dayOffs: dayOffRepository,
  employees: leaveEmployeeRepository,
  roster: leaveRosterRepository,
  clock: () => new Date(),
};

/** Offs of one employee, as a set of `YYYY-MM-DD` keys. */
type OffKeys = Set<string>;

export interface LeaveRequestPage {
  items: LeaveRequestDto[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export class LeaveRequestService {
  private readonly deps: LeaveRequestServiceDeps;

  constructor(deps: Partial<LeaveRequestServiceDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps };
  }

  // ── Employee actions ───────────────────────────────────────────────────────

  async createRequest(actor: LeaveActor, body: unknown): Promise<LeaveRequestDto> {
    assertCanRequestLeave(actor);
    const input = parseCreateLeaveRequest(body, this.today());
    const { hotelId } = actor;
    const userId = actor.userId as string;

    const employee = await this.deps.employees.findActiveInHotel(hotelId, userId);
    if (!employee) throw LeaveErrors.inactiveEmployee();

    await this.assertNoLiveOverlap(hotelId, userId, input);

    const offs = await this.offKeysFor(hotelId, userId, input);
    const leaveDays = countLeaveDays(input, offs);
    if (leaveDays === 0) throw LeaveErrors.noWorkingDays();

    const created = await this.deps.requests.create({
      hotelId: new Types.ObjectId(hotelId),
      userId: new Types.ObjectId(userId),
      type: input.type,
      fromDate: input.from,
      toDate: input.to,
      reason: input.reason,
      status: LeaveRequestStatus.PENDING,
    });

    // Race guard. Two overlapping submissions can both pass the check above, so
    // the earlier _id wins and the later one withdraws. Ids sort in creation order.
    const createdId = String(created._id);
    const rivals = await this.deps.requests.findOverlapping({
      hotelId,
      userId,
      from: input.from,
      to: input.to,
      excludeId: createdId,
    });
    if (rivals.some((rival) => String(rival._id) < createdId)) {
      await this.deps.requests.deleteById(hotelId, createdId);
      throw LeaveErrors.overlappingLeave();
    }

    logger.info("Leave request submitted", { hotelId, leaveId: createdId, type: input.type });
    return toLeaveRequestDto(created, leaveDays, toEmployeeSummary(employee));
  }

  async listMyRequests(actor: LeaveActor, query: Record<string, unknown>): Promise<LeaveRequestPage> {
    assertCanRequestLeave(actor);
    const filters = parseLeaveRequestListQuery(query);
    // The caller's own requests only. Any `userId` in the query is ignored.
    const { items, total } = await this.deps.requests.findPage(actor.hotelId, {
      ...filters,
      userId: actor.userId as string,
    });
    return this.toPage(actor.hotelId, items, filters, total);
  }

  async cancelRequest(actor: LeaveActor, id: string): Promise<LeaveRequestDto> {
    assertCanRequestLeave(actor);
    const leaveId = parseObjectIdString(id, "id");
    const { hotelId } = actor;

    const existing = await this.deps.requests.findByIdInHotel(hotelId, leaveId);
    // A request that belongs to someone else is reported as not found, not forbidden,
    // so the API does not reveal which ids exist.
    if (!existing || String(existing.userId) !== actor.userId) {
      throw LeaveErrors.requestNotFound();
    }

    const today = this.today();
    const cancellable =
      existing.status === LeaveRequestStatus.PENDING ||
      (existing.status === LeaveRequestStatus.APPROVED && existing.fromDate > today);
    if (!cancellable) throw LeaveErrors.notCancellable();

    const cancelled = await this.deps.requests.transitionFromStatus(
      hotelId,
      leaveId,
      existing.status,
      { status: LeaveRequestStatus.CANCELLED, cancelledAt: this.deps.clock() },
    );
    if (!cancelled) throw LeaveErrors.concurrentUpdate();

    const offs = await this.offKeysFor(hotelId, actor.userId as string, rangeOf(cancelled));
    logger.info("Leave request cancelled by employee", { hotelId, leaveId });
    return this.toDetail(hotelId, cancelled, offs);
  }

  // ── Read access ────────────────────────────────────────────────────────────

  /** Approvers see every request in the hotel. Employees see only their own. */
  async listRequests(actor: LeaveActor, query: Record<string, unknown>): Promise<LeaveRequestPage> {
    assertCanReviewLeave(actor);
    const filters = parseLeaveRequestListQuery(query);
    const { items, total } = await this.deps.requests.findPage(actor.hotelId, filters);
    return this.toPage(actor.hotelId, items, filters, total);
  }

  async getRequest(actor: LeaveActor, id: string): Promise<LeaveRequestDto> {
    const leaveId = parseObjectIdString(id, "id");
    const doc = await this.deps.requests.findByIdInHotel(actor.hotelId, leaveId);
    if (!doc) throw LeaveErrors.requestNotFound();

    const isOwner = actor.kind === "USER" && String(doc.userId) === actor.userId;
    if (!isOwner && !canReviewLeave(actor)) throw LeaveErrors.requestNotFound();

    const offs = await this.offKeysFor(actor.hotelId, String(doc.userId), rangeOf(doc));
    return this.toDetail(actor.hotelId, doc, offs);
  }

  // ── Manager decisions ──────────────────────────────────────────────────────

  async approveRequest(actor: LeaveActor, id: string, body: unknown): Promise<LeaveRequestDto> {
    assertCanReviewLeave(actor);
    const { note } = parseReviewDecision(body, { requireNote: false });
    const leaveId = parseObjectIdString(id, "id");
    const { hotelId } = actor;

    const reviewerId = await resolveReviewerId(actor, this.deps.employees);
    const existing = await this.loadReviewable(actor, leaveId);

    // A leave that has already started cannot be approved. Its days are gone, so
    // the only honest outcome is a rejection with a note.
    if (existing.fromDate.getTime() < this.today().getTime()) {
      throw LeaveErrors.startDatePassed();
    }

    // Recompute against the current schedule. Offs may have been added since the request was made.
    const offs = await this.offKeysFor(hotelId, String(existing.userId), rangeOf(existing));
    if (countLeaveDays(rangeOf(existing), offs) === 0) throw LeaveErrors.noWorkingDays();

    const approved = await this.deps.requests.transitionFromStatus(
      hotelId,
      leaveId,
      LeaveRequestStatus.PENDING,
      {
        status: LeaveRequestStatus.APPROVED,
        reviewedBy: reviewerId,
        reviewedAt: this.deps.clock(),
        reviewNote: note,
      },
    );
    if (!approved) throw LeaveErrors.concurrentUpdate();

    // Conflict guard. Another manager may have approved an overlapping request at the same
    // moment. If so, undo this approval so the employee never holds two approved overlapping leaves.
    const conflicts = await this.deps.requests.findOverlapping({
      hotelId,
      userId: String(approved.userId),
      from: approved.fromDate,
      to: approved.toDate,
      statuses: [LeaveRequestStatus.APPROVED],
      excludeId: leaveId,
    });
    if (conflicts.length > 0) {
      await this.deps.requests.revertApprovalToPending(hotelId, leaveId);
      throw LeaveErrors.overlappingLeave();
    }

    // The employee is now away, so take them off the rosters for those days. If that
    // fails, revert to PENDING so the approval is not recorded without its effect.
    // Re-approving is safe, because removing an absent employee changes nothing.
    try {
      const removed = await this.deps.roster.removeEmployeeFromRange(
        hotelId,
        String(approved.userId),
        approved.fromDate,
        approved.toDate,
      );
      logger.info("Employee removed from rosters for approved leave", { hotelId, leaveId, rosters: removed });
    } catch (error) {
      await this.deps.requests.revertApprovalToPending(hotelId, leaveId);
      throw error;
    }

    logger.info("Leave request approved", { hotelId, leaveId, reviewerId });
    return this.toDetail(hotelId, approved, offs);
  }

  async rejectRequest(actor: LeaveActor, id: string, body: unknown): Promise<LeaveRequestDto> {
    assertCanReviewLeave(actor);
    const { note } = parseReviewDecision(body, { requireNote: true });
    const leaveId = parseObjectIdString(id, "id");
    const { hotelId } = actor;

    const reviewerId = await resolveReviewerId(actor, this.deps.employees);
    const existing = await this.loadReviewable(actor, leaveId);

    const rejected = await this.deps.requests.transitionFromStatus(
      hotelId,
      leaveId,
      LeaveRequestStatus.PENDING,
      {
        status: LeaveRequestStatus.REJECTED,
        reviewedBy: reviewerId,
        reviewedAt: this.deps.clock(),
        reviewNote: note,
      },
    );
    if (!rejected) throw LeaveErrors.concurrentUpdate();

    const offs = await this.offKeysFor(hotelId, String(existing.userId), rangeOf(existing));
    logger.info("Leave request rejected", { hotelId, leaveId, reviewerId });
    return this.toDetail(hotelId, rejected, offs);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /** Today in the business timezone, as a UTC-midnight calendar date. */
  private today(): Date {
    return todayInBusinessTimezone(this.deps.clock());
  }

  /** Loads a request a manager may act on: it must exist in the hotel, be pending, and not be their own. */
  private async loadReviewable(actor: LeaveActor, leaveId: string): Promise<ILeaveRequest> {
    const doc = await this.deps.requests.findByIdInHotel(actor.hotelId, leaveId);
    if (!doc) throw LeaveErrors.requestNotFound();

    if (actor.kind === "USER" && String(doc.userId) === actor.userId) {
      throw LeaveErrors.selfReviewForbidden();
    }
    if (doc.status !== LeaveRequestStatus.PENDING) {
      throw LeaveErrors.notPending(doc.status);
    }
    return doc;
  }

  private async assertNoLiveOverlap(
    hotelId: string,
    userId: string,
    range: DateRange,
  ): Promise<void> {
    const overlapping = await this.deps.requests.findOverlapping({
      hotelId,
      userId,
      from: range.from,
      to: range.to,
    });
    if (overlapping.length > 0) throw LeaveErrors.overlappingLeave();
  }

  /** Loads the employee's offs that fall inside the range. */
  private async offKeysFor(hotelId: string, userId: string, range: DateRange): Promise<OffKeys> {
    const rows = await this.deps.dayOffs.findByUsersInRange(hotelId, [userId], range.from, range.to);
    return new Set(rows.map((row) => toDateOnlyString(row.date)));
  }

  private async toDetail(hotelId: string, doc: ILeaveRequest, offs: OffKeys): Promise<LeaveRequestDto> {
    const [employee] = await this.deps.employees.findInHotel(hotelId, [String(doc.userId)]);
    return toLeaveRequestDto(
      doc,
      countLeaveDays(rangeOf(doc), offs),
      employee ? toEmployeeSummary(employee) : null,
    );
  }

  /** Builds a page of DTOs. Employee names and offs are batched, not fetched per row. */
  private async toPage(
    hotelId: string,
    docs: ILeaveRequest[],
    filters: { page: number; limit: number },
    total: number,
  ): Promise<LeaveRequestPage> {
    const pagination = {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    };
    if (docs.length === 0) return { items: [], pagination };

    const userIds = Array.from(new Set(docs.map((doc) => String(doc.userId))));
    const from = docs.reduce((min, doc) => (doc.fromDate < min ? doc.fromDate : min), docs[0].fromDate);
    const to = docs.reduce((max, doc) => (doc.toDate > max ? doc.toDate : max), docs[0].toDate);

    const [employees, offRows] = await Promise.all([
      this.deps.employees.findInHotel(hotelId, userIds),
      this.deps.dayOffs.findByUsersInRange(hotelId, userIds, from, to),
    ]);

    const employeeById = new Map(employees.map((e) => [String(e._id), e]));
    const offsByUser = new Map<string, OffKeys>();
    for (const row of offRows) {
      const key = String(row.userId);
      const set = offsByUser.get(key) ?? new Set<string>();
      set.add(toDateOnlyString(row.date));
      offsByUser.set(key, set);
    }

    const items = docs.map((doc) => {
      const userId = String(doc.userId);
      const record = employeeById.get(userId);
      return toLeaveRequestDto(
        doc,
        countLeaveDays(rangeOf(doc), offsByUser.get(userId) ?? new Set()),
        record ? toEmployeeSummary(record) : null,
      );
    });
    return { items, pagination };
  }
}

/**
 * Leave days = calendar days in the range that are not one of the employee's
 * scheduled offs. Pure, so it can be tested without a database.
 */
export function countLeaveDays(range: DateRange, offs: OffKeys): number {
  return enumerateDays(range.from, range.to).filter(
    (day) => !offs.has(toDateOnlyString(day)),
  ).length;
}
