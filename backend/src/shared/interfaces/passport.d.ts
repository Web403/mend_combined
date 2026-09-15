// ─────────────────────────────────────────────────────────────────────────────
// shared/interfaces/passport.d.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Types } from "mongoose";
import { IBaseDocument } from "./base.types";

export interface IPassportComplianceHistory {
  hotelId:   string;
  hotelName: string;
  score:     number;
  from:      Date;
  to?:       Date;
}

export interface IPassportCareerEntry {
  title:   string;
  hotel?:  string;
  from:    Date;
  to?:     Date;
}

export interface IPassport extends IBaseDocument {
  userId: string;

  // FR49 — profile fields
  skills:         string[];
  certifications: string[];  // LMS certificate IDs (denormalised labels stored here)
  efficiencyScore: number;   // synced from task performance score (0–100)

  complianceHistory: IPassportComplianceHistory[];
  careerProgression: IPassportCareerEntry[];

  /** Unique human-readable credential identifier (FR50) */
  credentialNumber: string;

  /** ISO timestamp of the last time scores were synced from live data */
  lastSyncedAt: Date;
}

// ── Request / Response DTOs ───────────────────────────────────────────────────

export interface UpsertPassportDto {
  skills?:           string[];
  careerProgression?: {
    title:  string;
    hotel?: string;
    from:   string; // ISO date string
    to?:    string;
  }[];
}

export interface PassportResponseDto {
  id:                 string;
  hotelId:            Types.ObjectId;
  userId:             string;
  credentialNumber:   string;
  skills:             string[];
  certifications:     string[];
  efficiencyScore:    number;
  complianceHistory:  IPassportComplianceHistory[];
  careerProgression:  IPassportCareerEntry[];
  lastSyncedAt:       string;
  createdAt:          string;
  updatedAt:          string;
}
