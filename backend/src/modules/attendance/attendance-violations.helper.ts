// ─────────────────────────────────────────────────────────────────────────────
// modules/attendance/attendance-violations.helper.ts
//
// Pure business-rule calculations for compliance flags (FR11).
// No I/O — safe to unit-test in isolation.
// ─────────────────────────────────────────────────────────────────────────────

import type { IViolationFlags } from "../../shared/interfaces/attendance";

/** Thresholds — keep in one place so they're easy to configure later */
export const VIOLATION_THRESHOLDS = {
  /** Maximum consecutive work duration before the flag fires */
  MAX_WORK_MINUTES: 10 * 60, // 600 min = 10 h

  /** Minimum rest gap between shifts */
  MIN_RECOVERY_MINUTES: 11 * 60, // 660 min = 11 h
} as const;

export class AttendanceViolationHelper {
  /**
   * Computes work duration in whole minutes from clockIn → clockOut.
   */
  static workDurationMinutes(clockIn: Date, clockOut: Date): number {
    return Math.round((clockOut.getTime() - clockIn.getTime()) / 60_000);
  }

  /**
   * Minutes elapsed between the end of the previous shift and the new clockIn.
   * Returns undefined when there is no prior shift to compare against.
   */
  static recoveryMinutes(
    prevClockOut: Date | undefined,
    nextClockIn: Date,
  ): number | undefined {
    if (!prevClockOut) return undefined;
    return Math.round((nextClockIn.getTime() - prevClockOut.getTime()) / 60_000);
  }

  /**
   * Evaluates all violation rules for a completed shift.
   */
  static evaluateClockOut(data: {
    workDurationMinutes: number;
  }): Pick<IViolationFlags, "exceeds10Hours"> {
    return {
      exceeds10Hours:
        data.workDurationMinutes > VIOLATION_THRESHOLDS.MAX_WORK_MINUTES,
    };
  }

  /**
   * Evaluates rules that are knowable at clock-in time (recovery gap).
   */
  static evaluateClockIn(data: {
    recoveryMinutes?: number;
  }): Pick<IViolationFlags, "insufficientRecovery"> {
    if (data.recoveryMinutes == null) {
      return { insufficientRecovery: false };
    }
    return {
      insufficientRecovery:
        data.recoveryMinutes < VIOLATION_THRESHOLDS.MIN_RECOVERY_MINUTES,
    };
  }

  /** Merges partial flag objects into a complete IViolationFlags record. */
  static merge(
    ...partials: Partial<IViolationFlags>[]
  ): IViolationFlags {
    return Object.assign(
      { exceeds10Hours: false, insufficientRecovery: false },
      ...partials,
    );
  }
}