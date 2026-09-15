// ─────────────────────────────────────────────────────────────────────────────
// modules/hotel/hotel-geo.helper.ts
//
// Zone management utilities used by the hotel admin screens and
// the hotel onboarding flow.
//
// SRS references:
//   FR3  – Multi-tenant hotel isolation
//   FR6  – Geofenced attendance (zone must be configured per hotel)
//   FR7  – Prevent clock-in outside allowed radius
//   NFR6 – Secure geolocation validation
// ─────────────────────────────────────────────────────────────────────────────

import { GeoService } from "../../shared/services/geo.service";
import { GEO_DEFAULTS } from "../../shared/constants/geo.constants";
import type {
  Coordinates,
  HotelGeoZone,
} from "../../shared/interfaces/geo.interface";

// ── Validation errors ─────────────────────────────────────────────────────────

export interface HotelZoneValidationError {
  field: string;
  message: string;
}

// ── Helper ────────────────────────────────────────────────────────────────────

export class HotelGeoHelper {
  /**
   * Validates a HotelGeoZone before it is persisted to the database.
   * Called by the hotel-settings service when an admin saves geo config.
   */
  static validateZoneConfig(zone: Partial<HotelGeoZone>): {
    valid: boolean;
    errors: HotelZoneValidationError[];
  } {
    const errors: HotelZoneValidationError[] = [];

    // Centre coordinates
    if (!zone.centre) {
      errors.push({ field: "centre", message: "Hotel centre coordinates are required." });
    } else {
      const sanitised = GeoService.sanitiseCoordinates(zone.centre);
      if (!sanitised) {
        errors.push({ field: "centre", message: "Hotel coordinates are out of valid WGS-84 range." });
      }
    }

    // Attendance radius
    if (zone.attendanceRadius == null) {
      errors.push({ field: "attendanceRadius", message: "Attendance radius is required." });
    } else if (zone.attendanceRadius < 50) {
      errors.push({ field: "attendanceRadius", message: "Attendance radius must be at least 50 m." });
    } else if (zone.attendanceRadius > 2_000) {
      errors.push({ field: "attendanceRadius", message: "Attendance radius must not exceed 2,000 m." });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Builds a default HotelGeoZone from a lat/lng supplied during onboarding.
   * Uses the platform default radius — HR can adjust later in settings.
   */
  static buildDefaultZone(hotelId: string, centre: Coordinates): HotelGeoZone {
    const sanitised = GeoService.sanitiseCoordinates(centre);
    if (!sanitised) throw new Error(`Invalid coordinates for hotel ${hotelId}`);

    return {
      hotelId: hotelId as any,
      centre: sanitised,
      attendanceRadius: GEO_DEFAULTS.ATTENDANCE_RADIUS_METRES,
    };
  }

  /**
   * Returns a human-readable summary of a hotel's geo config.
   * Used in the Auditor dashboard and compliance reports (FR39).
   */
  static summariseZone(zone: HotelGeoZone): string {
    const lines = [
      `Primary zone: ${GeoService.formatCoords(zone.centre)} | radius ${zone.attendanceRadius} m`,
    ];
    return lines.join("\n");
  }
}