// ─────────────────────────────────────────────────────────────────────────────
// shared/interfaces/attendance.interface.ts
// ─────────────────────────────────────────────────────────────────────────────

import { CoordinatesWithAccuracy } from "./geo.interface";

export interface IViolationFlags {
  exceeds10Hours: boolean;
  insufficientRecovery: boolean;
}

export interface IDeviceMeta {
  offlineSync: boolean;
  deviceId?: string;
}

/** Mongoose document shape */
export interface IAttendance {
  id: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;
  schemaVersion: number;

  userId: mongoose.Types.ObjectId;
  shiftId?: string;

  clockIn: Date;
  clockOut?: Date;
  workDurationMinutes?: number;
  recoveryMinutes?: number;

  geoValidated: boolean;

  violationFlags: IViolationFlags;
  deviceMeta: IDeviceMeta;

  createdAt?: Date;
  updatedAt?: Date;
}

// ── Request / Response DTOs ───────────────────────────────────────────────────

export interface ClockInRequestDto {
  userId: mongoose.Types.ObjectId;
  /** hotelId doubles as the tenant identifier for geo-zone lookup */
  hotelId: mongoose.Types.ObjectId;
  coords: CoordinatesWithAccuracy;
  deviceId?: string;
  /** Epoch ms — supplied by the offline-sync worker (FR14) */
  offlineQueuedAt?: number;
}

export interface ClockOutRequestDto {
  userId: mongoose.Types.ObjectId;
  hotelId: mongoose.Types.ObjectId;
  coords: CoordinatesWithAccuracy;
  deviceId?: string;
  offlineQueuedAt?: number;
}

export interface AttendanceResponseDto {
  attendanceId: string;
  userId: mongoose.Types.ObjectId;
  clockIn: string;
  clockOut?: string;
  workDurationMinutes?: number;
  geoValidated: boolean;
  wasOffline: boolean;
  violationFlags: IViolationFlags;
  message?: string;
  blockReason?: string;
  violationReasons?: string[];
}

export interface ActiveShiftDto {
  attendanceId: string;
  userId: string;
  clockIn: string;
  geoValidated: boolean;
}