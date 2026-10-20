// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave-request.service.ts
//
// Business rules for employee leave requests and manager/HR decisions.
// Manager decisions take effect immediately, but HR may later override them.
// If HR reviews first, the manager's later vote is retained for audit only.
//
//   PENDING ──manager approve/reject──▶ APPROVED / REJECTED
//   PENDING / APPROVED / REJECTED ──HR approve/reject──▶ APPROVED / REJECTED
//   PENDING or future APPROVED ──employee cancel──▶ CANCELLED
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
//   4. Each review lane may vote once; HR's vote controls the effective status.
//   5. Effective approval removes the employee from affected rosters, and an HR
//      veto restores the captured roster assignments.
// ─────────────────────────────────────────────────────────────────────────────

import { Types } from "mongoose";
import { ILeaveRequest, ILeaveReview, LeaveRequestDto } from "../../shared/interfaces/leave.d";
import {
  LeaveRequestStatus,
  LeaveReviewDecision,
  LeaveReviewerRole,
} from "../../shared/enums/leave.enum";
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
  getLeaveReviewerRole,
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
  roster: Pick<
    LeaveRosterRepository,
    "findEmployeeRosterIdsInRange" | "removeEmployeeFromRosters" | "restoreEmployeeToRosters"
  >;
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

  // ── Manager and HR decisions ────────────────────────────────────────────────

  async approveRequest(actor: LeaveActor, id: string, body: unknown): Promise<LeaveRequestDto> {
    assertCanReviewLeave(actor);
    const { note } = parseReviewDecision(body, { requireNote: false });
    return this.recordReviewDecision(actor, id, LeaveReviewDecision.APPROVED, note);
  }

  async rejectRequest(actor: LeaveActor, id: string, body: unknown): Promise<LeaveRequestDto> {
    assertCanReviewLeave(actor);
    const { note } = parseReviewDecision(body, { requireNote: true });
    return this.recordReviewDecision(actor, id, LeaveReviewDecision.REJECTED, note);
  }

  /**
   * Records one role's vote. A manager decision is effective until HR votes;
   * once HR has voted, its decision always controls the overall request status.
   */
  private async recordReviewDecision(
    actor: LeaveActor,
    id: string,
    decision: LeaveReviewDecision,
    note?: string,
  ): Promise<LeaveRequestDto> {
    const leaveId = parseObjectIdString(id, "id");
    const { hotelId } = actor;
    const reviewerRole = getLeaveReviewerRole(actor);
    const reviewerId = await resolveReviewerId(actor, this.deps.employees);
    const existing = await this.loadReviewable(actor, leaveId, reviewerRole);

    const effectiveDecisionAfter =
      reviewerRole === LeaveReviewerRole.HR
        ? decision
        : existing.hrReview?.decision ?? decision;
    const isNewApproval =
      effectiveDecisionAfter === LeaveReviewDecision.APPROVED &&
      existing.status !== LeaveRequestStatus.APPROVED;

    let approvalRosterIds: string[] | undefined;
    if (isNewApproval) {
      // No new approval can be granted after the leave has started.
      if (existing.fromDate.getTime() < this.today().getTime()) {
        throw LeaveErrors.startDatePassed();
      }

      // Offs may have changed after submission; only approve if at least one
      // requested day is still a working day.
      const offs = await this.offKeysFor(hotelId, String(existing.userId), rangeOf(existing));
      if (countLeaveDays(rangeOf(existing), offs) === 0) throw LeaveErrors.noWorkingDays();

      // Check before the update for a clear error, then check again after saving
      // to guard against two overlapping approvals racing each other.
      await this.assertNoApprovedOverlap(hotelId, leaveId, existing);
      approvalRosterIds = await this.deps.roster.findEmployeeRosterIdsInRange(
        hotelId,
        String(existing.userId),
        existing.fromDate,
        existing.toDate,
      );
    }

    const review: ILeaveReview = {
      decision,
      reviewedBy: reviewerId,
      reviewedAt: this.deps.clock(),
      note,
    };
    const saved = await this.deps.requests.saveReviewDecision(
      hotelId,
      leaveId,
      reviewerRole,
      review,
      approvalRosterIds,
      reviewerRole === LeaveReviewerRole.HR ? this.legacyManagerReview(existing) : undefined,
    );
    if (!saved) return this.throwReviewUpdateError(actor, leaveId, reviewerRole);

    if (isNewApproval && saved.status === LeaveRequestStatus.APPROVED) {
      try {
        const latestBeforeRosterWrite = await this.deps.requests.findByIdInHotel(hotelId, leaveId);
        if (latestBeforeRosterWrite?.status === LeaveRequestStatus.APPROVED) {
          const conflicts = await this.deps.requests.findOverlapping({
            hotelId,
            userId: String(saved.userId),
            from: saved.fromDate,
            to: saved.toDate,
            statuses: [LeaveRequestStatus.APPROVED],
            excludeId: leaveId,
          });
          if (conflicts.length > 0) {
            await this.deps.requests.undoReviewDecision(
              hotelId,
              leaveId,
              reviewerRole,
              decision,
              existing,
            );
            throw LeaveErrors.overlappingLeave();
          }

          const removed = await this.deps.roster.removeEmployeeFromRosters(
            hotelId,
            String(saved.userId),
            approvalRosterIds ?? [],
          );
          logger.info("Employee removed from rosters for approved leave", {
            hotelId,
            leaveId,
            rosters: removed,
          });

          // If HR vetoed between recording the decision and applying the roster
          // effect, compensate so the final rejected leave does not keep the
          // employee off shifts. $addToSet makes this safe to retry.
          const latest = await this.deps.requests.findByIdInHotel(hotelId, leaveId);
          if (latest?.hrReview?.decision === LeaveReviewDecision.REJECTED) {
            await this.deps.roster.restoreEmployeeToRosters(
              hotelId,
              String(saved.userId),
              approvalRosterIds ?? [],
              saved.fromDate,
              saved.toDate,
            );
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "LeaveError") throw error;
        // Restore any assignments that a partially failed roster update may have
        // removed, then undo the effective vote so retrying is safe.
        try {
          await this.deps.roster.restoreEmployeeToRosters(
            hotelId,
            String(saved.userId),
            approvalRosterIds ?? [],
            saved.fromDate,
            saved.toDate,
          );
        } catch (restoreError) {
          logger.error("Could not restore roster assignments after failed leave approval", {
            hotelId,
            leaveId,
            error: restoreError,
          });
        }
        await this.deps.requests.undoReviewDecision(
          hotelId,
          leaveId,
          reviewerRole,
          decision,
          existing,
        );
        throw error;
      }
    }

    if (
      reviewerRole === LeaveReviewerRole.HR &&
      decision === LeaveReviewDecision.REJECTED &&
      existing.status === LeaveRequestStatus.APPROVED
    ) {
      const rosterIds = existing.approvalRosterIds ?? [];
      try {
        const restored = await this.deps.roster.restoreEmployeeToRosters(
          hotelId,
          String(existing.userId),
          rosterIds,
          existing.fromDate,
          existing.toDate,
        );
        logger.info("Roster assignments restored after HR veto", {
          hotelId,
          leaveId,
          rosters: restored,
        });
      } catch (error) {
        // Keep the manager approval effective if its roster side effect could not
        // be reversed; HR can retry after the roster store recovers.
        await this.deps.requests.undoReviewDecision(
          hotelId,
          leaveId,
          reviewerRole,
          decision,
          existing,
        );
        throw error;
      }
    }

    const current = await this.deps.requests.findByIdInHotel(hotelId, leaveId);
    if (!current) throw LeaveErrors.requestNotFound();
    const offs = await this.offKeysFor(hotelId, String(current.userId), rangeOf(current));
    logger.info("Leave review decision recorded", {
      hotelId,
      leaveId,
      reviewerId,
      reviewerRole,
      decision,
      status: current.status,
    });
    return this.toDetail(hotelId, current, offs);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /** Today in the business timezone, as a UTC-midnight calendar date. */
  private today(): Date {
    return todayInBusinessTimezone(this.deps.clock());
  }

  /** Loads a request this review lane may decide, and forbids self-review. */
  private async loadReviewable(
    actor: LeaveActor,
    leaveId: string,
    reviewerRole: LeaveReviewerRole,
  ): Promise<ILeaveRequest> {
    const doc = await this.deps.requests.findByIdInHotel(actor.hotelId, leaveId);
    if (!doc) throw LeaveErrors.requestNotFound();

    if (actor.kind === "USER" && String(doc.userId) === actor.userId) {
      throw LeaveErrors.selfReviewForbidden();
    }
    if (doc.status === LeaveRequestStatus.CANCELLED || this.hasReviewForRole(doc, reviewerRole)) {
      throw LeaveErrors.notPending(doc.status);
    }
    return doc;
  }

  private hasReviewForRole(doc: ILeaveRequest, role: LeaveReviewerRole): boolean {
    if (role === LeaveReviewerRole.HR) return Boolean(doc.hrReview);
    if (doc.managerReview) return true;
    // Existing records predate the dual-review fields. Treat their single
    // effective manager decision as already reviewed in the manager lane.
    return Boolean(
      !doc.hrReview &&
      doc.reviewedBy &&
      doc.reviewedByRole !== LeaveReviewerRole.HR,
    );
  }

  /** Converts a pre-dual-review manager decision before HR replaces the flat fields. */
  private legacyManagerReview(doc: ILeaveRequest): ILeaveReview | undefined {
    if (doc.managerReview || doc.hrReview || !doc.reviewedBy || doc.reviewedByRole === LeaveReviewerRole.HR) {
      return undefined;
    }
    const decision =
      doc.status === LeaveRequestStatus.APPROVED
        ? LeaveReviewDecision.APPROVED
        : doc.status === LeaveRequestStatus.REJECTED
          ? LeaveReviewDecision.REJECTED
          : undefined;
    if (!decision) return undefined;

    return {
      decision,
      reviewedBy: doc.reviewedBy,
      reviewedAt: doc.reviewedAt ?? doc.updatedAt ?? doc.createdAt,
      note: doc.reviewNote ?? undefined,
    };
  }

  private async throwReviewUpdateError(
    actor: LeaveActor,
    leaveId: string,
    reviewerRole: LeaveReviewerRole,
  ): Promise<never> {
    const current = await this.deps.requests.findByIdInHotel(actor.hotelId, leaveId);
    if (!current) throw LeaveErrors.requestNotFound();
    if (actor.kind === "USER" && String(current.userId) === actor.userId) {
      throw LeaveErrors.selfReviewForbidden();
    }
    if (current.status === LeaveRequestStatus.CANCELLED || this.hasReviewForRole(current, reviewerRole)) {
      throw LeaveErrors.notPending(current.status);
    }
    throw LeaveErrors.concurrentUpdate();
  }

  private async assertNoApprovedOverlap(
    hotelId: string,
    leaveId: string,
    request: ILeaveRequest,
  ): Promise<void> {
    const overlapping = await this.deps.requests.findOverlapping({
      hotelId,
      userId: String(request.userId),
      from: request.fromDate,
      to: request.toDate,
      statuses: [LeaveRequestStatus.APPROVED],
      excludeId: leaveId,
    });
    if (overlapping.length > 0) throw LeaveErrors.overlappingLeave();
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
