/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * In-memory implementations of the leave repositories, used by the service unit
 * tests. Each fake honours the same contract as its real repository: every query
 * is tenant-scoped, status transitions are conditional, and the day-off store
 * enforces the (hotelId, userId, date) unique index.
 */

import { Types } from "mongoose";
import {
  LeaveRequestStatus,
  LeaveReviewDecision,
  LeaveReviewerRole,
} from "../../src/shared/enums/leave.enum";
import { UserRole, UserStatus } from "../../src/shared/enums/user";
import { AuthRole } from "../../src/shared/enums/common";
import type { LeaveRequestRepository } from "../../src/modules/leave/leave-request.repository";
import { LIVE_LEAVE_STATUSES } from "../../src/modules/leave/leave-request.repository";
import type { DayOffRepository } from "../../src/modules/leave/day-off.repository";
import type { LeaveEmployeeRepository, LeaveEmployeeRecord } from "../../src/modules/leave/leave-employee.repository";
import type { LeaveRosterRepository } from "../../src/modules/leave/leave-roster.repository";
import type { LeaveActor } from "../../src/modules/leave/leave.actor";
import { parseDateOnly } from "../../src/modules/leave/leave.date";

const oid = () => new Types.ObjectId();
const sameId = (a: unknown, b: unknown) => String(a) === String(b);

export function createFakeWorld() {
  const requests: any[] = [];
  const offs: any[] = [];
  const employees: any[] = [];

  const rosters: any[] = [];

  const requestRepo: LeaveRequestRepository = {
    async create(data) {
      const now = new Date();
      const doc = { _id: oid(), createdAt: now, updatedAt: now, ...data };
      requests.push(doc);
      return { ...doc } as any;
    },
    async findByIdInHotel(hotelId, id) {
      const doc = requests.find((r) => sameId(r._id, id) && sameId(r.hotelId, hotelId));
      return doc ? ({ ...doc } as any) : null;
    },
    async findOverlapping({ hotelId, userId, from, to, statuses = LIVE_LEAVE_STATUSES, excludeId }) {
      return requests
        .filter(
          (r) =>
            sameId(r.hotelId, hotelId) &&
            sameId(r.userId, userId) &&
            statuses.includes(r.status) &&
            r.fromDate <= to &&
            r.toDate >= from &&
            (excludeId === undefined || !sameId(r._id, excludeId)),
        )
        .map((r) => ({ ...r }));
    },
    async findLiveInRangeForUsers({ hotelId, userIds, from, to }) {
      return requests
        .filter(
          (r) =>
            sameId(r.hotelId, hotelId) &&
            userIds.some((u) => sameId(u, r.userId)) &&
            LIVE_LEAVE_STATUSES.includes(r.status) &&
            r.fromDate <= to &&
            r.toDate >= from,
        )
        .map((r) => ({ ...r }));
    },
    async findPage(hotelId, f) {
      const rows = requests
        .filter((r) => sameId(r.hotelId, hotelId))
        .filter((r) => !f.userId || sameId(r.userId, f.userId))
        .filter((r) => !f.status || r.status === f.status)
        .filter(
          (r) =>
            !f.pendingFor ||
            (r.status !== LeaveRequestStatus.CANCELLED &&
              (f.pendingFor === LeaveReviewerRole.HR
                ? !r.hrReview
                : !r.managerReview && (!r.reviewedBy || r.reviewedByRole === LeaveReviewerRole.HR))),
        )
        .filter((r) => !f.type || r.type === f.type)
        .filter((r) => !(f.from && f.to) || (r.fromDate <= f.to && r.toDate >= f.from))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return {
        items: rows.slice((f.page - 1) * f.limit, f.page * f.limit).map((r) => ({ ...r })),
        total: rows.length,
      };
    },
    async transitionFromStatus(hotelId, id, fromStatus, set) {
      const doc = requests.find(
        (r) => sameId(r._id, id) && sameId(r.hotelId, hotelId) && r.status === fromStatus,
      );
      if (!doc) return null;
      Object.assign(doc, set, { updatedAt: new Date() });
      return { ...doc } as any;
    },
    async saveReviewDecision(hotelId, id, role, review, approvalRosterIds, legacyManagerReview) {
      const doc = requests.find(
        (r) =>
          sameId(r._id, id) &&
          sameId(r.hotelId, hotelId) &&
          r.status !== LeaveRequestStatus.CANCELLED,
      );
      if (!doc) return null;

      if (role === LeaveReviewerRole.HR) {
        if (doc.hrReview) return null;
        doc.hrReview = review;
        doc.status = review.decision === LeaveReviewDecision.APPROVED
          ? LeaveRequestStatus.APPROVED
          : LeaveRequestStatus.REJECTED;
        doc.reviewedBy = review.reviewedBy;
        doc.reviewedAt = review.reviewedAt;
        doc.reviewedByRole = role;
        doc.reviewNote = review.note;
        if (approvalRosterIds !== undefined) doc.approvalRosterIds = [...approvalRosterIds];
        if (legacyManagerReview !== undefined) doc.managerReview = legacyManagerReview;
      } else {
        if (doc.managerReview) return null;
        doc.managerReview = review;
        if (!doc.hrReview) {
          doc.status = review.decision === LeaveReviewDecision.APPROVED
            ? LeaveRequestStatus.APPROVED
            : LeaveRequestStatus.REJECTED;
          doc.reviewedBy = review.reviewedBy;
          doc.reviewedAt = review.reviewedAt;
          doc.reviewedByRole = role;
          doc.reviewNote = review.note;
          if (approvalRosterIds !== undefined) doc.approvalRosterIds = [...approvalRosterIds];
        }
      }
      doc.updatedAt = new Date();
      return { ...doc } as any;
    },
    async undoReviewDecision(hotelId, id, role, decision, prior) {
      const doc = requests.find((r) => sameId(r._id, id) && sameId(r.hotelId, hotelId));
      const field = role === LeaveReviewerRole.HR ? "hrReview" : "managerReview";
      const decisionStatus = decision === LeaveReviewDecision.APPROVED
        ? LeaveRequestStatus.APPROVED
        : LeaveRequestStatus.REJECTED;
      if (!doc || doc[field]?.decision !== decision) return null;
      if (role === LeaveReviewerRole.MANAGER && doc.hrReview) {
        delete doc.managerReview;
      } else {
        if (doc.status !== decisionStatus) return null;
        doc.status = prior.status;
        for (const key of ["reviewedBy", "reviewedAt", "reviewedByRole", "reviewNote", "approvalRosterIds"] as const) {
          if (prior[key] === undefined) delete doc[key];
          else doc[key] = prior[key];
        }
        delete doc[field];
      }
      doc.updatedAt = new Date();
      return { ...doc } as any;
    },
    async deleteById(hotelId, id) {
      const index = requests.findIndex((r) => sameId(r._id, id) && sameId(r.hotelId, hotelId));
      if (index >= 0) requests.splice(index, 1);
    },
  };

  const dayOffRepo: DayOffRepository = {
    async findByUsersInRange(hotelId, userIds, from, to) {
      return offs
        .filter(
          (o) =>
            sameId(o.hotelId, hotelId) &&
            userIds.some((u) => sameId(u, o.userId)) &&
            o.date >= from &&
            o.date <= to,
        )
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((o) => ({ ...o }));
    },
    async findPage(hotelId, f) {
      const rows = offs.filter(
        (o) =>
          sameId(o.hotelId, hotelId) &&
          o.date >= f.from &&
          o.date <= f.to &&
          (!f.userId || sameId(o.userId, f.userId)) &&
          (!f.type || o.type === f.type),
      );
      return {
        items: rows.slice((f.page - 1) * f.limit, f.page * f.limit).map((o) => ({ ...o })),
        total: rows.length,
      };
    },
    async findByIdInHotel(hotelId, id) {
      const doc = offs.find((o) => sameId(o._id, id) && sameId(o.hotelId, hotelId));
      return doc ? ({ ...doc } as any) : null;
    },
    async insertMany(docs) {
      const inserted: any[] = [];
      for (const doc of docs) {
        const clash = offs.some(
          (o) => sameId(o.hotelId, doc.hotelId) && sameId(o.userId, doc.userId) && o.date.getTime() === (doc.date as Date).getTime(),
        );
        if (clash) {
          const err: any = new Error("E11000 duplicate key");
          err.code = 11000;
          throw err;
        }
        const row = { _id: oid(), createdAt: new Date(), updatedAt: new Date(), ...doc };
        offs.push(row);
        inserted.push(row);
      }
      return inserted;
    },
    async deleteById(hotelId, id) {
      const index = offs.findIndex((o) => sameId(o._id, id) && sameId(o.hotelId, hotelId));
      if (index >= 0) offs.splice(index, 1);
    },
  };

  const employeeRepo: LeaveEmployeeRepository = {
    async findActiveInHotel(hotelId, userId) {
      const user = employees.find(
        (u) => sameId(u._id, userId) && sameId(u.hotelId, hotelId) && u.status === UserStatus.ACTIVE,
      );
      return user ? ({ ...user } as any) : null;
    },
    async findInHotel(hotelId, userIds) {
      return employees
        .filter((u) => sameId(u.hotelId, hotelId) && userIds.some((id) => sameId(id, u._id)))
        .map((u) => ({ ...u }) as any);
    },
  };

  /** Roster fake used to test approval removal and HR-veto restoration. */
  const rosterRepo: LeaveRosterRepository & { failNext: boolean } = {
    failNext: false,
    async findEmployeeRosterIdsInRange(hotelId, userId, from, to) {
      return rosters
        .filter(
          (roster) =>
            sameId(roster.hotelId, hotelId) &&
            roster.date >= from &&
            roster.date <= to &&
            roster.employees.some((id: unknown) => sameId(id, userId)),
        )
        .map((roster) => String(roster._id));
    },
    async removeEmployeeFromRosters(hotelId, userId, rosterIds) {
      if (rosterRepo.failNext) {
        rosterRepo.failNext = false;
        throw new Error("roster write failed");
      }
      let changed = 0;
      for (const roster of rosters) {
        if (!sameId(roster.hotelId, hotelId) || !rosterIds.some((id) => sameId(id, roster._id))) continue;
        const before = roster.employees.length;
        roster.employees = roster.employees.filter((id: unknown) => !sameId(id, userId));
        if (roster.employees.length !== before) changed++;
      }
      return changed;
    },
    async restoreEmployeeToRosters(hotelId, userId, rosterIds, from, to) {
      let changed = 0;
      for (const roster of rosters) {
        if (
          !sameId(roster.hotelId, hotelId) ||
          !rosterIds.some((id) => sameId(id, roster._id)) ||
          roster.date < from ||
          roster.date > to
        ) continue;
        if (roster.employees.some((id: unknown) => sameId(id, userId))) continue;
        roster.employees.push(new Types.ObjectId(userId));
        changed++;
      }
      return changed;
    },
  };

  function addRoster(hotelId: string, date: string, employeeIds: string[]) {
    const roster = {
      _id: oid(),
      hotelId,
      date: d(date),
      shiftId: oid(),
      employees: employeeIds.map((id) => new Types.ObjectId(id)),
    };
    rosters.push(roster);
    return roster;
  }

  function addEmployee(hotelId: string, opts: { role?: UserRole; status?: UserStatus; first?: string; last?: string } = {}) {
    const _id = oid();
    employees.push({
      _id,
      hotelId,
      role: opts.role ?? UserRole.EMPLOYEE,
      status: opts.status ?? UserStatus.ACTIVE,
      profile: { firstName: opts.first ?? "Asha", lastName: opts.last ?? "Rao" },
    } as any);
    return _id.toString();
  }

  return { requests, offs, employees, rosters, requestRepo, dayOffRepo, employeeRepo, rosterRepo, addEmployee, addRoster };
}

export function userActor(hotelId: string, userId: string, roles: string[] = [UserRole.EMPLOYEE]): LeaveActor {
  return { kind: "USER", userId, hotelId, roles };
}

export function ownerActor(hotelId: string): LeaveActor {
  return { kind: "HOTEL", userId: null, hotelId, roles: [AuthRole.HOTEL] };
}

/** A fixed "now": 18 Oct 2026, 11:30 in India. */
export const NOW = new Date("2026-10-18T06:00:00.000Z");
export const clock = () => new Date(NOW);

export const d = (value: string) => parseDateOnly(value, "date");
