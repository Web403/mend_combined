// ─────────────────────────────────────────────────────────────────────────────
// modules/compliance/compliance.service.ts
//
// Implements:
//   FR34 — Hotel compliance % computation
//   FR35 — Certification tiers: Non-Compliant / Mend Certified / Mend Gold Seal
//   FR36 — Audit logs (immutable, append-only)
//   FR38 — Block non-compliant hotels from hiring
//   FR39 — Compliance reports
// ─────────────────────────────────────────────────────────────────────────────

import { nanoid } from "nanoid";
import { ComplianceRepository } from "./compliance.repository";
import { AttendanceModel } from "../attendance/attendance.model";
import { WellbeingModel } from "../wellbeing/wellbeing.model";
import { HotelModel } from "../hotel/hotel.model";
import { AppError } from "../../core/middleware/error.middleware";
import { CertificationLevel } from "../../shared/enums/recruitment";
import { AuditAction } from "../../shared/enums/compliance.enum";
import { FatigueRisk } from "../../shared/enums/wellbeing.enum";
import { logger } from "../../core/utils/logger";
import type {
  ICompliance,
  ComplianceReportDto,
  AuditLogDto,
} from "../../shared/interfaces/compliance.d";

// ── Scoring constants ─────────────────────────────────────────────────────────

/**
 * Weights for each compliance component (must sum to 100).
 *
 *  - attendance  40 pts: HES violation rate is the core metric
 *  - wellbeing   25 pts: average staff wellbeing rating
 *  - fatigue     25 pts: absence of HIGH/CRITICAL fatigue events
 *  - efficiency  10 pts: hotel OPH relative to baseline
 */
const WEIGHT_ATTENDANCE  = 40;
const WEIGHT_WELLBEING   = 25;
const WEIGHT_FATIGUE     = 25;
const WEIGHT_EFFICIENCY  = 10;

/**
 * Certification tier thresholds (FR35).
 *
 *  < 60  → Non-Compliant  (CertificationLevel.NONE)
 *  60–84 → Mend Certified
 *  85+   → Mend Gold Seal
 */
const TIER_GOLD_SEAL    = 85;
const TIER_CERTIFIED    = 60;

/** Minimum OPH considered "efficient"; used to cap efficiency contribution */
const BASELINE_OPH = 2;

const DEFAULT_WINDOW_DAYS = 30;

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveCertification(score: number): CertificationLevel {
  if (score >= TIER_GOLD_SEAL) return CertificationLevel.MEND_GOLD_SEAL;
  if (score >= TIER_CERTIFIED) return CertificationLevel.MEND_CERTIFIED;
  return CertificationLevel.NONE;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mapToReport(record: ICompliance): ComplianceReportDto {
  return {
    hotelId:            record.hotelId,
    complianceScore:    record.complianceScore,
    certificationLevel: record.certificationLevel,
    breakdown:          record.breakdown,
    hesViolationCount:  record.hesViolationCount,
    shiftCount:         record.shiftCount,
    lastEvaluatedAt:    (record.lastEvaluatedAt as Date).toISOString(),
    windowDays:         record.windowDays,
    isEligibleToHire:   record.certificationLevel !== CertificationLevel.NONE,
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ComplianceService {
  private readonly repo = new ComplianceRepository();

  // ── FR34, FR35 — Evaluate and persist compliance ───────────────────────────

  async evaluateHotel(
    hotelId: string,
    actorId: string,
    actorRole: string,
    windowDays: number = DEFAULT_WINDOW_DAYS
  ): Promise<ComplianceReportDto> {
    const hotel = await HotelModel.findById(hotelId).lean();
    if (!hotel) throw new AppError("Hotel not found.", 404);

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - windowDays);
    fromDate.setHours(0, 0, 0, 0);

    const [
      attendanceScore,
      hesViolationCount,
      shiftCount,
      wellbeingScore,
      fatigueScore,
    ] = await Promise.all([
      this.computeAttendanceScore(hotelId, fromDate),
      this.countHesViolations(hotelId, fromDate),
      this.countShifts(hotelId, fromDate),
      this.computeWellbeingScore(hotelId, fromDate),
      this.computeFatigueScore(hotelId, fromDate),
    ]);

    // Efficiency component: uses task performance data if available,
    // falls back to a neutral 50 so missing task data does not penalise a hotel
    const efficiencyScore = await this.computeEfficiencyScore(hotelId, fromDate);

    const complianceScore = Math.round(
      (attendanceScore  / 100) * WEIGHT_ATTENDANCE  +
      (wellbeingScore   / 100) * WEIGHT_WELLBEING   +
      (fatigueScore     / 100) * WEIGHT_FATIGUE     +
      (efficiencyScore  / 100) * WEIGHT_EFFICIENCY
    );

    const certificationLevel = resolveCertification(complianceScore);

    // Fetch previous certification to detect upgrades / downgrades for audit log
    const previous = await this.repo.findByHotel(hotelId);
    const prevCert = previous?.certificationLevel ?? CertificationLevel.NONE;

    const record = await this.repo.upsertCompliance(hotelId, {
      id:                 previous?.id ?? `compliance_${nanoid(10)}`,
      hotelId,
      schemaVersion:      1,
      complianceScore,
      certificationLevel,
      breakdown: {
        attendanceScore:  Math.round(attendanceScore),
        wellbeingScore:   Math.round(wellbeingScore),
        fatigueScore:     Math.round(fatigueScore),
        efficiencyScore:  Math.round(efficiencyScore),
      },
      hesViolationCount,
      shiftCount,
      lastEvaluatedAt:   new Date(),
      windowDays,
    });

    // Append evaluation to audit trail (FR36)
    await this.repo.appendAuditLog({
      hotelId,
      action:    AuditAction.COMPLIANCE_EVALUATED,
      actorId,
      actorRole,
      meta: {
        complianceScore,
        certificationLevel,
        hesViolationCount,
        shiftCount,
        windowDays,
      },
    });

    // Log certification level changes
    if (certificationLevel !== prevCert) {
      const action =
        this.certificationRank(certificationLevel) > this.certificationRank(prevCert)
          ? AuditAction.CERTIFICATION_UPGRADED
          : AuditAction.CERTIFICATION_DOWNGRADED;

      await this.repo.appendAuditLog({
        hotelId,
        action,
        actorId,
        actorRole,
        meta: { from: prevCert, to: certificationLevel },
      });

      logger.info("Hotel certification level changed", {
        hotelId,
        from: prevCert,
        to:   certificationLevel,
      });
    }

    // FR38 — block hotel from hiring if non-compliant
    await this.syncHiringBlock(hotelId, certificationLevel, actorId, actorRole);

    return mapToReport(record);
  }

  // ── FR39 — Get compliance report ──────────────────────────────────────────

  async getReport(hotelId: string): Promise<ComplianceReportDto> {
    const record = await this.repo.findByHotel(hotelId);
    if (!record) {
      throw new AppError(
        "Compliance has not been evaluated for this hotel yet. " +
        "Call POST /compliance/evaluate to generate the first report.",
        404
      );
    }
    return mapToReport(record);
  }

  async getAllReports(
    opts: { page?: number; limit?: number } = {}
  ): Promise<{ reports: ComplianceReportDto[]; total: number }> {
    const { records, total } = await this.repo.findAll(opts);
    return { reports: records.map(mapToReport), total };
  }

  // ── FR36 — Audit logs ─────────────────────────────────────────────────────

  async getAuditLogs(
    hotelId: string,
    opts: { page?: number; limit?: number; action?: AuditAction } = {}
  ): Promise<{ logs: AuditLogDto[]; total: number }> {
    const { logs, total } = await this.repo.findAuditLogs(hotelId, opts);

    return {
      logs: logs.map((l) => ({
        id:        l.id,
        hotelId:   l.hotelId,
        action:    l.action,
        actorId:   l.actorId,
        actorRole: l.actorRole,
        meta:      l.meta,
        createdAt: (l.createdAt as Date).toISOString(),
      })),
      total,
    };
  }

  // ── FR38 — Hiring eligibility check ──────────────────────────────────────

  async isEligibleToHire(hotelId: string): Promise<boolean> {
    const record = await this.repo.findByHotel(hotelId);
    if (!record) return false;
    return record.certificationLevel !== CertificationLevel.NONE;
  }

  // ── Private score computation methods ─────────────────────────────────────

  /**
   * Attendance score (0–100):
   * Measures HES compliance rate — percentage of shifts with NO violations.
   * Score = (compliantShifts / totalShifts) × 100
   * Falls back to 100 when there are no shifts (no data = assume compliant).
   */
  private async computeAttendanceScore(hotelId: string, fromDate: Date): Promise<number> {
    try {
      const result = await AttendanceModel.aggregate([
        {
          $match: {
            hotelId,
            clockIn:  { $gte: fromDate },
            clockOut: { $exists: true },
          },
        },
        {
          $group: {
            _id:   null,
            total: { $sum: 1 },
            violations: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$violationFlags.exceeds10Hours", true] },
                      { $eq: ["$violationFlags.insufficientRecovery", true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      if (!result.length || result[0].total === 0) return 100;

      const { total, violations } = result[0];
      const complianceRate = (total - violations) / total;
      return clamp(complianceRate * 100, 0, 100);
    } catch (err) {
      logger.error("computeAttendanceScore failed", { hotelId, error: err });
      return 100; // fail open
    }
  }

  private async countHesViolations(hotelId: string, fromDate: Date): Promise<number> {
    return AttendanceModel.countDocuments({
      hotelId,
      clockIn: { $gte: fromDate },
      clockOut: { $exists: true },
      $or: [
        { "violationFlags.exceeds10Hours": true },
        { "violationFlags.insufficientRecovery": true },
      ],
    });
  }

  private async countShifts(hotelId: string, fromDate: Date): Promise<number> {
    return AttendanceModel.countDocuments({
      hotelId,
      clockIn:  { $gte: fromDate },
      clockOut: { $exists: true },
    });
  }

  /**
   * Wellbeing score (0–100):
   * Average wellbeing rating across all submissions in the window,
   * normalised to 0–100 (rating scale 1–5 → score 0–100).
   */
  private async computeWellbeingScore(hotelId: string, fromDate: Date): Promise<number> {
    try {
      const fromDateStr = fromDate.toISOString().slice(0, 10);

      const result = await WellbeingModel.aggregate([
        {
          $match: {
            hotelId,
            date: { $gte: fromDateStr },
          },
        },
        {
          $group: {
            _id:       null,
            avgRating: { $avg: "$rating" },
          },
        },
      ]);

      if (!result.length) return 75; // default: assume moderate wellbeing if no data

      // Convert 1–5 rating to 0–100 score
      const avg = result[0].avgRating as number;
      return clamp(((avg - 1) / 4) * 100, 0, 100);
    } catch (err) {
      logger.error("computeWellbeingScore failed", { hotelId, error: err });
      return 75;
    }
  }

  /**
   * Fatigue score (0–100):
   * Percentage of wellbeing submissions that are NOT HIGH or CRITICAL risk.
   * Falls back to 80 when no wellbeing data exists.
   */
  private async computeFatigueScore(hotelId: string, fromDate: Date): Promise<number> {
    try {
      const fromDateStr = fromDate.toISOString().slice(0, 10);

      const result = await WellbeingModel.aggregate([
        {
          $match: {
            hotelId,
            date: { $gte: fromDateStr },
          },
        },
        {
          $group: {
            _id:           null,
            total:         { $sum: 1 },
            highRiskCount: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$fatigueRisk",
                      [FatigueRisk.HIGH, FatigueRisk.CRITICAL],
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      if (!result.length || result[0].total === 0) return 80;

      const { total, highRiskCount } = result[0];
      const safeRate = (total - highRiskCount) / total;
      return clamp(safeRate * 100, 0, 100);
    } catch (err) {
      logger.error("computeFatigueScore failed", { hotelId, error: err });
      return 80;
    }
  }

  /**
   * Efficiency score (0–100):
   * Derived from average task OPH for the hotel.
   * A hotel achieving BASELINE_OPH (2 tasks/hr) scores 50.
   * Scores scale linearly up to 100 at 2×BASELINE_OPH.
   * Falls back to 50 when no task data exists.
   */
  private async computeEfficiencyScore(hotelId: string, fromDate: Date): Promise<number> {
    try {
      // Import TaskModel dynamically to avoid circular deps
      const { TaskModel } = await import("../tasks/task.model");

      const result = await TaskModel.aggregate([
        {
          $match: {
            hotelId,
            status:      "COMPLETED",
            isDeleted:   false,
            completedAt: { $gte: fromDate },
          },
        },
        {
          $group: {
            _id:                  null,
            totalWeightedTasks:   { $sum: "$weight" },
            totalDurationMinutes: { $sum: "$durationMinutes" },
          },
        },
      ]);

      if (!result.length || !result[0].totalDurationMinutes) return 50;

      const { totalWeightedTasks, totalDurationMinutes } = result[0];
      const hotelOph = totalWeightedTasks / (totalDurationMinutes / 60);
      const normalized = clamp((hotelOph / BASELINE_OPH) * 50, 0, 100);
      return normalized;
    } catch (err) {
      logger.error("computeEfficiencyScore failed", { hotelId, error: err });
      return 50;
    }
  }

  /**
   * FR38 — Sync hotel's hiring block status based on certification level.
   * Non-compliant hotels are struck from hiring; compliant hotels are unblocked.
   */
  private async syncHiringBlock(
    hotelId:            string,
    certificationLevel: CertificationLevel,
    actorId:            string,
    actorRole:          string
  ): Promise<void> {
    try {
      const hotel = await HotelModel.findOne({ id: hotelId }).lean();
      if (!hotel) return;

      const shouldBlock = certificationLevel === CertificationLevel.NONE;
      const isCurrentlyBlocked = hotel.isStriked;

      if (shouldBlock && !isCurrentlyBlocked) {
        await HotelModel.updateOne({ id: hotelId }, { $set: { isStriked: true } });
        await this.repo.appendAuditLog({
          hotelId,
          action:    AuditAction.HOTEL_BLOCKED,
          actorId,
          actorRole,
          meta: { reason: "Non-compliant: compliance score below threshold." },
        });
        logger.info("Hotel blocked from hiring due to non-compliance", { hotelId });
      } else if (!shouldBlock && isCurrentlyBlocked) {
        await HotelModel.updateOne({ id: hotelId }, { $set: { isStriked: false } });
        await this.repo.appendAuditLog({
          hotelId,
          action:    AuditAction.HOTEL_UNBLOCKED,
          actorId,
          actorRole,
          meta: { certificationLevel },
        });
        logger.info("Hotel hiring block lifted due to improved compliance", { hotelId });
      }
    } catch (err) {
      logger.error("syncHiringBlock failed", { hotelId, error: err });
    }
  }

  private certificationRank(level: CertificationLevel): number {
    switch (level) {
      case CertificationLevel.MEND_GOLD_SEAL:  return 2;
      case CertificationLevel.MEND_CERTIFIED:  return 1;
      default:                                 return 0;
    }
  }
}
