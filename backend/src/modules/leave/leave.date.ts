// ─────────────────────────────────────────────────────────────────────────────
// modules/leave/leave.date.ts
//
// Leave and off dates are CALENDAR DATES (YYYY-MM-DD), not instants. They are
// stored as UTC midnight of that date so that day arithmetic never drifts with
// the server's timezone or DST. Only "what is today?" consults a real timezone.
// ─────────────────────────────────────────────────────────────────────────────

import { LEAVE_TIMEZONE } from "./leave.constants";
import { LeaveErrors } from "./leave.error";

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parses a strict `YYYY-MM-DD` string into UTC midnight of that date.
 * Rejects other formats (ISO timestamps, `2026/10/18`) and impossible dates
 * such as `2026-02-30`, which `new Date()` would silently roll over.
 */
export function parseDateOnly(value: unknown, field: string): Date {
  const invalid = () =>
    LeaveErrors.validation(`${field} must be a valid date in YYYY-MM-DD format`);

  if (typeof value !== "string") throw invalid();

  const match = DATE_ONLY_PATTERN.exec(value.trim());
  if (!match) throw invalid();

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw invalid();
  }
  return date;
}

/** Formats a stored calendar-date value back to `YYYY-MM-DD`. */
export function toDateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Inclusive number of calendar days between two calendar dates. */
export function inclusiveDayCount(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1;
}

/** Every calendar date from `from` to `to`, inclusive, at UTC midnight. */
export function enumerateDays(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  for (let t = from.getTime(); t <= to.getTime(); t += DAY_MS) {
    days.push(new Date(t));
  }
  return days;
}

/** Adds whole calendar days to a calendar-date value. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * Today's calendar date in the business timezone, as UTC midnight. Uses the
 * `en-CA` locale because it formats as `YYYY-MM-DD`.
 */
export function todayInBusinessTimezone(now: Date = new Date()): Date {
  const key = new Intl.DateTimeFormat("en-CA", {
    timeZone: LEAVE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return new Date(`${key}T00:00:00.000Z`);
}
