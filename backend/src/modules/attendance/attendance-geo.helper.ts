// ─────────────────────────────────────────────────────────────────────────────
// modules/attendance/attendance-geo.helper.ts
//
// Wraps GeoService for the attendance module.
// Called by the clock-in / clock-out service before writing attendance records.
//
// SRS references:
//   FR6  – Staff shall clock in/out using geofencing
//   FR7  – System shall prevent clock-in outside allowed radius
//   FR11 – System shall flag violations in real time
//   FR14 – System shall support offline sync for attendance
// ─────────────────────────────────────────────────────────────────────────────

import { GeoService } from "../../shared/services/geo.service";
import { LocationCaptureEvent } from "../../shared/enums/geo.enum";
import type {
  CoordinatesWithAccuracy,
  GeofenceValidationResult,
  HotelGeoZone,
} from "../../shared/interfaces/geo.interface";

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface ClockInGeoPayload {
  userId: string;
  hotelId: string;
  event: LocationCaptureEvent;
  coords: CoordinatesWithAccuracy;
  /** Supplied by offline-sync worker when replaying queued events (FR14) */
  offlineQueuedAt?: number;
}

export interface AttendanceGeoResult {
  allowed: boolean;
  distanceMetres: number;
  /** Present when allowed === false */
  blockReason?: string;
  /** True when the event was replayed from the offline queue (FR14) */
  wasOffline: boolean;
  /** ISO timestamp of when validation ran (server-side) */
  validatedAt: string;
}

// ── Helper ────────────────────────────────────────────────────────────────────

export class AttendanceGeoHelper {
  /**
   * Validates a clock-in or clock-out event against the hotel's geo zone.
   *
   * For offline-queued events (FR14):
   *   - The `offlineQueuedAt` timestamp is treated as `capturedAt` so the
   *     staleness check uses the original capture time, not the replay time.
   *   - Offline events are always marked `wasOffline: true` in the result so
   *     the attendance service can log them with the correct metadata.
   */
  static validate(
    payload: ClockInGeoPayload,
    hotelZone: HotelGeoZone,
  ): AttendanceGeoResult {
    const coords: CoordinatesWithAccuracy = {
      ...payload.coords,
      // For offline replay, substitute the original capture time
      capturedAt: payload.offlineQueuedAt ?? payload.coords.capturedAt,
    };

    const result: GeofenceValidationResult = GeoService.validateAttendance(
      coords,
      hotelZone,
    );

    return {
      allowed: result.valid,
      distanceMetres: result.distanceMetres,
      blockReason: result.reason
        ? AttendanceGeoHelper.humaniseReason(result.reason, result.distanceMetres, result.radiusUsed)
        : undefined,
      wasOffline: payload.offlineQueuedAt != null,
      validatedAt: new Date().toISOString(),
    };
  }

  // ── Readable violation messages (used in FR11 real-time flags) ────────────

  private static humaniseReason(
    reason: string,
    distanceMetres: number,
    radiusUsed?: number,
  ): string {
    switch (reason) {
      case "OUTSIDE_GEOFENCE":
        return radiusUsed
          ? `Location is ${Math.round(distanceMetres)} m from hotel (allowed: ${radiusUsed} m).`
          : `Location is outside the allowed hotel zone.`;
      case "LOW_GPS_ACCURACY":
        return "GPS signal is too weak for a reliable location fix. Please try again in an open area.";
      case "STALE_LOCATION":
        return "Location data is outdated. Please refresh your GPS and try again.";
      case "MISSING_COORDINATES":
        return "No location data received. Ensure location permissions are enabled.";
      case "HOTEL_ZONE_NOT_CONFIGURED":
        return "Hotel geofence has not been configured. Contact your administrator.";
      default:
        return "Clock-in was blocked due to a location issue.";
    }
  }
}