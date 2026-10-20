// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/day-off.service.ts
//
// Scheduled non-working days. Managers assign offs to one or many employees
// over a date range, optionally only on certain weekdays (e.g. "every Sunday").
// Offs need no approval and do not use up leave. They are excluded from the
// leave day count (see leave-request.service.ts).
//
// Nothing is backdated: offs cannot be scheduled for, or removed from, a date
// before today (business timezone). Past attendance is not rewritten here.
//
// Assignment is idempotent. An employee who already has an off on a date is
// skipped and reported, not duplicated or failed.
// ─────────────────────────────────────────────────────────────────────────────

import { Types } from "mongoose";
import { logger } from "../../core/utils/logger";
import { DayOffDto, IDayOff } from "../../shared/interfaces/leave.d";
import { DayOffRepository, dayOffRepository } from "./day-off.repository";
import {
  LeaveEmployeeRepository,
  leaveEmployeeRepository,
} from "./leave-employee.repository";
import {
  LeaveActor,
  assertCanManageDayOffs,
  assertCanRequestLeave,
  resolveReviewerId,
} from "./leave.actor";
import { enumerateDays, todayInBusinessTimezone, toDateOnlyString } from "./leave.date";
import { LeaveErrors } from "./leave.error";
import { toDayOffDto, toEmployeeSummary } from "./leave.mapper";
import {
  parseAssignDayOffs,
  parseDayOffListQuery,
  parseMyDayOffQuery,
  parseObjectIdString,
} from "./leave.validation";

export interface DayOffServiceDeps {
  dayOffs: DayOffRepository;
  employees: LeaveEmployeeRepository;
  clock: () => Date;
}

const defaultDeps: DayOffServiceDeps = {
  dayOffs: dayOffRepository,
  employees: leaveEmployeeRepository,
  clock: () => new Date(),
};

export interface SkippedDayOff {
  employeeId: string;
  date: string;
  reason: "ALREADY_OFF";
}

export interface AssignDayOffsResult {
  created: DayOffDto[];
  skipped: SkippedDayOff[];
  summary: {
    employees: number;
    requestedDays: number;
    createdCount: number;
    skippedCount: number;
  };
}

export class DayOffService {
  private readonly deps: DayOffServiceDeps;

  constructor(deps: Partial<DayOffServiceDeps> = {}) {
    this.deps = { ...defaultDeps, ...deps };
  }

  async assignDayOffs(actor: LeaveActor, body: unknown): Promise<AssignDayOffsResult> {
    assertCanManageDayOffs(actor);
    const input = parseAssignDayOffs(body, this.today());
    const { hotelId } = actor;

    const reviewerId = await resolveReviewerId(actor, this.deps.employees);

    // Every named employee must belong to this hotel. Otherwise an off could be
    // scheduled onto another tenant's user.
    const employees = await this.deps.employees.findInHotel(hotelId, input.userIds);
    const foundIds = new Set(employees.map((employee) => String(employee._id)));
    const missing = input.userIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) throw LeaveErrors.employeesNotFound(missing);

    const allDays = enumerateDays(input.from, input.to);
    const days = input.weekdays
      ? allDays.filter((day) => input.weekdays!.includes(day.getUTCDay()))
      : allDays;

    const existing = await this.deps.dayOffs.findByUsersInRange(
      hotelId,
      input.userIds,
      input.from,
      input.to,
    );
    const existingKeys = new Set(
      existing.map((row) => `${String(row.userId)}|${toDateOnlyString(row.date)}`),
    );

    const toCreate: Partial<IDayOff>[] = [];
    const skipped: SkippedDayOff[] = [];
    for (const userId of input.userIds) {
      for (const day of days) {
        const date = toDateOnlyString(day);
        if (existingKeys.has(`${userId}|${date}`)) {
          skipped.push({ employeeId: userId, date, reason: "ALREADY_OFF" });
          continue;
        }
        toCreate.push({
          hotelId: new Types.ObjectId(hotelId),
          userId: new Types.ObjectId(userId),
          date: day,
          type: input.type,
          note: input.note,
          assignedBy: reviewerId,
        });
      }
    }

    let created: IDayOff[] = [];
    if (toCreate.length > 0) {
      try {
        created = await this.deps.dayOffs.insertMany(toCreate);
      } catch (error) {
        // The unique index (hotelId, userId, date) rejected a row that was
        // assigned concurrently. Other rows in the batch may already be saved.
        // A retry reports those as ALREADY_OFF.
        if (isDuplicateKeyError(error)) throw LeaveErrors.dayOffsConcurrentUpdate();
        throw error;
      }
    }

    logger.info("Day offs assigned", {
      hotelId,
      assignedBy: reviewerId,
      employees: input.userIds.length,
      createdCount: created.length,
      skippedCount: skipped.length,
    });

    return {
      created: created.map(toDayOffDto),
      skipped,
      summary: {
        employees: input.userIds.length,
        requestedDays: days.length,
        createdCount: created.length,
        skippedCount: skipped.length,
      },
    };
  }

  /** Manager calendar view. Requires an explicit from/to window and supports pagination. */
  async listDayOffs(actor: LeaveActor, query: Record<string, unknown>) {
    assertCanManageDayOffs(actor);
    const filters = parseDayOffListQuery(query);
    const { items, total } = await this.deps.dayOffs.findPage(actor.hotelId, filters);

    const employeeById = await this.employeeLookup(actor.hotelId, items);
    return {
      items: items.map((item) => ({
        ...toDayOffDto(item),
        employee: employeeById.get(String(item.userId)) ?? null,
      })),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  /** The caller's own offs. Defaults to today through the next 30 days. */
  async listMyDayOffs(actor: LeaveActor, query: Record<string, unknown>): Promise<DayOffDto[]> {
    assertCanRequestLeave(actor);
    const range = parseMyDayOffQuery(query, todayInBusinessTimezone(this.deps.clock()));
    const rows = await this.deps.dayOffs.findByUsersInRange(
      actor.hotelId,
      [actor.userId as string],
      range.from,
      range.to,
    );
    return rows.map(toDayOffDto);
  }

  async deleteDayOff(actor: LeaveActor, id: string): Promise<{ id: string; deleted: true }> {
    assertCanManageDayOffs(actor);
    const dayOffId = parseObjectIdString(id, "id");

    const existing = await this.deps.dayOffs.findByIdInHotel(actor.hotelId, dayOffId);
    if (!existing) throw LeaveErrors.dayOffNotFound();
    if (existing.date.getTime() < this.today().getTime()) throw LeaveErrors.dayOffBackdated();

    await this.deps.dayOffs.deleteById(actor.hotelId, dayOffId);
    logger.info("Day off removed", { hotelId: actor.hotelId, dayOffId });
    return { id: dayOffId, deleted: true };
  }

  /** Today in the business timezone, as a UTC-midnight calendar date. */
  private today(): Date {
    return todayInBusinessTimezone(this.deps.clock());
  }

  private async employeeLookup(hotelId: string, docs: IDayOff[]) {
    const userIds = Array.from(new Set(docs.map((doc) => String(doc.userId))));
    const employees = await this.deps.employees.findInHotel(hotelId, userIds);
    return new Map(employees.map((e) => [String(e._id), toEmployeeSummary(e)]));
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: number; writeErrors?: unknown[]; message?: string };
  if (err.code === 11000) return true;
  return Array.isArray(err.writeErrors) && err.writeErrors.some(
    (writeError) => (writeError as { code?: number })?.code === 11000,
  );
}
