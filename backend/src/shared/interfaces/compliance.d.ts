// ─────────────────────────────────────────────────────────────────────────────
// shared/interfaces/compliance.d.ts
// ─────────────────────────────────────────────────────────────────────────────

import { CertificationLevel } from "../enums/recruitment";
import { ComplianceStatus } from "../enums/compliance.enum";

export interface ICompliance {
  _id: any;
  id: string;
  hotelId: string;
  schemaVersion: number;

  /** Computed compliance percentage 0–100 (FR34) */
  complianceScore: number;

  /** Resolved certification tier (FR35) */
  certificationLevel: CertificationLevel;

  /** Breakdown of what drove the score */
  breakdown: {
    attendanceScore:  number; // 0–100: HES violation rate
    wellbeingScore:   number; // 0–100: avg wellbeing rating
    fatigueScore:     number; // 0–100: absence of HIGH/CRITICAL fatigue events
    efficiencyScore:  number; // 0–100: hotel-level OPH normalised
  };

  /** Number of HES violations in the evaluated window */
  hesViolationCount: number;

  /** Total shifts evaluated */
  shiftCount: number;

  /** ISO date of the last time this record was recomputed */
  lastEvaluatedAt: Date;

  /** Human-readable evaluation window */
  windowDays: number;

  createdAt: Date;
  updatedAt: Date;
}

// ── DTOs ─────────────────────────────────────────────────────────────────────

export interface ComplianceReportDto {
  hotelId:            string;
  complianceScore:    number;
  certificationLevel: CertificationLevel;
  breakdown: {
    attendanceScore:  number;
    wellbeingScore:   number;
    fatigueScore:     number;
    efficiencyScore:  number;
  };
  hesViolationCount:  number;
  shiftCount:         number;
  lastEvaluatedAt:    string;
  windowDays:         number;
  isEligibleToHire:   boolean;
}

export interface AuditLogDto {
  id:         string;
  hotelId:    string;
  action:     string;
  actorId:    string;
  actorRole:  string;
  meta?:      Record<string, unknown>;
  createdAt:  string;
}
