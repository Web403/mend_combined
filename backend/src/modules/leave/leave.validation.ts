// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave.validation.ts
//
// Pure parsing and normalisation of every leave / off payload and query string.
// Nothing here touches the database. Each parser picks only the fields it knows,
// so client-supplied `hotelId`, `userId`, `status`, `reviewedBy` and similar
// fields are ignored rather than trusted.
// ─────────────────────────────────────────────────────────────────────────────

import {
  DayOffType,
  LeaveRequestStatus,
  LeaveType,
} from "../../shared/enums/leave.enum";
import {
  DAY_OFF_ASSIGN_MAX_CELLS,
  DAY_OFF_ASSIGN_MAX_EMPLOYEES,
  DAY_OFF_ASSIGN_MAX_SPAN_DAYS,
  DEFAULT_PAGE_LIMIT,
  LEAVE_REQUEST_MAX_SPAN_DAYS,
  LIST_MAX_SPAN_DAYS,
  MAX_DAY_OFF_NOTE_LENGTH,
  MAX_PAGE_LIMIT,
  MAX_REASON_LENGTH,
  MAX_REVIEW_NOTE_LENGTH,
} from "./leave.constants";
import { LeaveErrors } from "./leave.error";
import { addDays, inclusiveDayCount, parseDateOnly } from "./leave.date";

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

export interface DateRange {
  from: Date;
  to: Date;
}

/** Adapts a stored leave document (fromDate / toDate) to the DateRange shape used by the day-count helpers. */
export const rangeOf = (doc: { fromDate: Date; toDate: Date }): DateRange => ({
  from: doc.fromDate,
  to: doc.toDate,
});

export interface CreateLeaveRequestInput extends DateRange {
  type: LeaveType;
  reason: string;
}

export interface ReviewDecisionInput {
  note?: string;
}

export interface AssignDayOffsInput extends DateRange {
  userIds: string[];
  /** 0 = Sunday … 6 = Saturday (JS `getUTCDay`). Undefined means every day. */
  weekdays?: number[];
  type: DayOffType;
  note?: string;
}

export interface PageOptions {
  page: number;
  limit: number;
}

export interface LeaveRequestListFilters extends PageOptions {
  status?: LeaveRequestStatus;
  type?: LeaveType;
  userId?: string;
  /** Overlap filter: returns requests that touch any day in [from, to]. */
  from?: Date;
  to?: Date;
}

export interface DayOffListFilters extends PageOptions {
  from: Date;
  to: Date;
  userId?: string;
  type?: DayOffType;
}

// ── Primitive helpers ─────────────────────────────────────────────────────────

export function parseObjectIdString(value: unknown, field: string): string {
  if (typeof value !== "string" || !OBJECT_ID_PATTERN.test(value)) {
    throw LeaveErrors.validation(`${field} must be a valid id`);
  }
  return value;
}

function parseRequiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string") {
    throw LeaveErrors.validation(`${field} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw LeaveErrors.validation(`${field} is required`);
  }
  if (trimmed.length > maxLength) {
    throw LeaveErrors.validation(`${field} cannot exceed ${maxLength} characters`);
  }
  return trimmed;
}

function parseOptionalText(
  value: unknown,
  field: string,
  maxLength: number,
): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw LeaveErrors.validation(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > maxLength) {
    throw LeaveErrors.validation(`${field} cannot exceed ${maxLength} characters`);
  }
  return trimmed;
}

function parseEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw LeaveErrors.validation(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function parseOptionalEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined || value === "") return undefined;
  return parseEnum(value, field, allowed);
}

/**
 * Accepts a query-string value only when it is a single string. Arrays and
 * nested objects (`?status=A&status=B`, `?from[$gt]=…`) are rejected instead of
 * being coerced.
 */
function queryString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string") {
    throw LeaveErrors.validation(`${field} must be a single value`);
  }
  return value;
}

function parseInteger(
  value: string | undefined,
  field: string,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) {
    throw LeaveErrors.validation(`${field} must be a whole number`);
  }
  const parsed = Number(value);
  if (parsed < min || parsed > max) {
    throw LeaveErrors.validation(`${field} must be between ${min} and ${max}`);
  }
  return parsed;
}

function parsePage(query: Record<string, unknown>): PageOptions {
  return {
    page: parseInteger(queryString(query.page, "page"), "page", 1, 1, Number.MAX_SAFE_INTEGER),
    limit: parseInteger(
      queryString(query.limit, "limit"),
      "limit",
      DEFAULT_PAGE_LIMIT,
      1,
      MAX_PAGE_LIMIT,
    ),
  };
}

/**
 * Validates `from <= to` and an upper bound on the span. The span is checked
 * before any database work so a huge range cannot force a large query.
 */
export function assertRangeWithinSpan(range: DateRange, maxSpanDays: number, label: string): void {
  if (range.to.getTime() < range.from.getTime()) {
    throw LeaveErrors.validation("to must be on or after from");
  }
  const span = inclusiveDayCount(range.from, range.to);
  if (span > maxSpanDays) {
    throw LeaveErrors.validation(`${label} cannot span more than ${maxSpanDays} days`);
  }
}

// ── Payload parsers ───────────────────────────────────────────────────────────

/**
 * Rejects a start date before `today` (business timezone). Backdating is not
 * allowed: a leave request, an approval, or a schedule change cannot reach into
 * days that have already begun.
 */
export function assertNotBackdated(from: Date, today: Date, error: () => Error): void {
  if (from.getTime() < today.getTime()) throw error();
}

export function parseCreateLeaveRequest(body: unknown, today: Date): CreateLeaveRequestInput {
  const input = asRecord(body);
  const from = parseDateOnly(input.fromDate, "fromDate");
  const to = parseDateOnly(input.toDate, "toDate");
  assertNotBackdated(from, today, LeaveErrors.backdated);
  assertRangeWithinSpan({ from, to }, LEAVE_REQUEST_MAX_SPAN_DAYS, "A leave request");

  return {
    type: parseEnum(input.type, "type", Object.values(LeaveType)),
    from,
    to,
    reason: parseRequiredText(input.reason, "reason", MAX_REASON_LENGTH),
  };
}

/** Approval note is optional; rejection note is required (see `requireNote`). */
export function parseReviewDecision(
  body: unknown,
  options: { requireNote: boolean },
): ReviewDecisionInput {
  const input = asRecord(body);
  if (options.requireNote) {
    return {
      note: parseRequiredText(input.note, "note", MAX_REVIEW_NOTE_LENGTH),
    };
  }
  return {
    note: parseOptionalText(input.note, "note", MAX_REVIEW_NOTE_LENGTH),
  };
}

export function parseAssignDayOffs(body: unknown, today: Date): AssignDayOffsInput {
  const input = asRecord(body);
  const from = parseDateOnly(input.fromDate, "fromDate");
  const to = parseDateOnly(input.toDate, "toDate");
  assertNotBackdated(from, today, LeaveErrors.dayOffBackdated);
  assertRangeWithinSpan({ from, to }, DAY_OFF_ASSIGN_MAX_SPAN_DAYS, "An off assignment");

  if (!Array.isArray(input.userIds) || input.userIds.length === 0) {
    throw LeaveErrors.validation("userIds must be a non-empty array");
  }
  if (input.userIds.length > DAY_OFF_ASSIGN_MAX_EMPLOYEES) {
    throw LeaveErrors.validation(
      `userIds cannot contain more than ${DAY_OFF_ASSIGN_MAX_EMPLOYEES} employees`,
    );
  }
  const userIds = Array.from(
    new Set(input.userIds.map((id, index) => parseObjectIdString(id, `userIds[${index}]`))),
  );

  const weekdays = parseWeekdays(input.weekdays);

  const dayCount = inclusiveDayCount(from, to);
  if (userIds.length * dayCount > DAY_OFF_ASSIGN_MAX_CELLS) {
    throw LeaveErrors.validation(
      `An off assignment cannot exceed ${DAY_OFF_ASSIGN_MAX_CELLS} employee-days in one request`,
    );
  }

  return {
    userIds,
    from,
    to,
    weekdays,
    type: input.type === undefined
      ? DayOffType.WEEKLY_OFF
      : parseEnum(input.type, "type", Object.values(DayOffType)),
    note: parseOptionalText(input.note, "note", MAX_DAY_OFF_NOTE_LENGTH),
  };
}

function parseWeekdays(value: unknown): number[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length === 0) {
    throw LeaveErrors.validation("weekdays must be a non-empty array of integers 0 (Sun) to 6 (Sat)");
  }
  const days = value.map((day) => {
    if (typeof day !== "number" || !Number.isInteger(day) || day < 0 || day > 6) {
      throw LeaveErrors.validation("weekdays must contain only integers 0 (Sun) to 6 (Sat)");
    }
    return day;
  });
  return Array.from(new Set(days)).sort((a, b) => a - b);
}

// ── Query parsers ─────────────────────────────────────────────────────────────

/** Employee-scoped and manager-scoped leave list filters share one parser. */
export function parseLeaveRequestListQuery(query: Record<string, unknown>): LeaveRequestListFilters {
  const from = parseOptionalDate(query.from, "from");
  const to = parseOptionalDate(query.to, "to");
  if (from && to) {
    assertRangeWithinSpan({ from, to }, LIST_MAX_SPAN_DAYS, "The list range");
  } else if (from || to) {
    throw LeaveErrors.validation("from and to must be provided together");
  }

  const userId = queryString(query.userId, "userId");

  return {
    ...parsePage(query),
    status: parseOptionalEnum(
      queryString(query.status, "status"),
      "status",
      Object.values(LeaveRequestStatus),
    ),
    type: parseOptionalEnum(queryString(query.type, "type"), "type", Object.values(LeaveType)),
    userId: userId === undefined ? undefined : parseObjectIdString(userId, "userId"),
    from,
    to,
  };
}

export function parseDayOffListQuery(query: Record<string, unknown>): DayOffListFilters {
  const from = parseDateOnly(queryString(query.from, "from"), "from");
  const to = parseDateOnly(queryString(query.to, "to"), "to");
  assertRangeWithinSpan({ from, to }, LIST_MAX_SPAN_DAYS, "The list range");

  const userId = queryString(query.userId, "userId");

  return {
    ...parsePage(query),
    from,
    to,
    userId: userId === undefined ? undefined : parseObjectIdString(userId, "userId"),
    type: parseOptionalEnum(queryString(query.type, "type"), "type", Object.values(DayOffType)),
  };
}

/**
 * Parses an optional `from`/`to` pair for the employee's own offs view.
 * Missing values default to today through the next 30 days, in the business
 * timezone (passed in so the caller controls the clock).
 */
export function parseMyDayOffQuery(
  query: Record<string, unknown>,
  today: Date,
): DateRange {
  const from = parseOptionalDate(query.from, "from") ?? today;
  const to = parseOptionalDate(query.to, "to") ?? addDays(today, 30);
  assertRangeWithinSpan({ from, to }, LIST_MAX_SPAN_DAYS, "The list range");
  return { from, to };
}

function parseOptionalDate(value: unknown, field: string): Date | undefined {
  const raw = queryString(value, field);
  return raw === undefined ? undefined : parseDateOnly(raw, field);
}

function asRecord(body: unknown): Record<string, unknown> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw LeaveErrors.validation("Request body must be a JSON object");
  }
  return body as Record<string, unknown>;
}
