// ─────────────────────────────────────────────────────────────────────────────
// shared/interfaces/wellbeing.d.ts
// ─────────────────────────────────────────────────────────────────────────────

import { IBaseDocument } from "./base.types";
import { FatigueRisk } from "../enums/wellbeing.enum";

export interface IWellbeing extends IBaseDocument {
  userId: string;
  /** 1 (worst) – 5 (best) daily self-reported rating (FR15) */
  rating: number;
  /** Optional sleep hours reported by staff (FR16) */
  sleepHours?: number;
  /** Optional self-reported stress level 1–10 (FR16) */
  stressLevel?: number;
  /**
   * Computed fatigue score 0–100 (FR17).
   * Derived from: hoursWorked + recoveryGap + wellbeing rating + stress.
   * Higher = more fatigued.
   */
  fatigueScore: number;
  /** Fatigue risk tier derived from fatigueScore (FR17) */
  fatigueRisk: FatigueRisk;

  fatigueRiskLevel: "LOW" | "MEDIUM" | "HIGH";

  fatigueReasons?: string[];

  alertManagers: boolean;
  alertStatus: "NONE" | "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  alertedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  /** Whether a manager alert was fired for this record (FR18) */
  alertFired: boolean;
  /** Date string YYYY-MM-DD — one entry per user per day */
  date: string;
}

// ── Request / Response DTOs ───────────────────────────────────────────────────

export interface SubmitWellbeingDto {
  userId: string;
  rating: number;
  sleepHours?: number;
  stressLevel?: number;
}

export interface WellbeingResponseDto {
  id: string;
  hotelId: string;
  userId: string;
  rating: number;
  sleepHours?: number;
  stressLevel?: number;
  fatigueScore?: number;
  fatigueRiskLevel?: "LOW" | "MEDIUM" | "HIGH";
  fatigueReasons?: string[];
  alertManagers?: boolean;
  alertStatus?: "NONE" | "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  alertedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}
