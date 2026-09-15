// ─────────────────────────────────────────────────────────────────────────────
// modules/attendance/attendance.errors.ts
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from "mongoose";

export class AttendanceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = "AttendanceError";
  }
}

export const AttendanceErrors = {
  alreadyClockedIn: () =>
    new AttendanceError(
      "ALREADY_CLOCKED_IN",
      "User already has an active clock-in. Clock out first.",
      409,
    ),

  notClockedIn: () =>
    new AttendanceError(
      "NOT_CLOCKED_IN",
      "No active clock-in found for this user.",
      404,
    ),

  geoBlocked: (reason: string) =>
    new AttendanceError("GEO_BLOCKED", reason, 403),

  hotelZoneMissing: (hotelId: mongoose.Types.ObjectId) =>
    new AttendanceError(
      "HOTEL_ZONE_NOT_CONFIGURED",
      `Geo zone for hotel "${hotelId}" is not configured.`,
      422,
    ),

  invalidCoords: () =>
    new AttendanceError(
      "INVALID_COORDINATES",
      "Coordinates are missing or malformed.",
      422,
    ),
} as const;