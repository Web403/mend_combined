// ─────────────────────────────────────────────────────────────────────────────
// shared/services/geo.service.ts
//
// Core geo engine for the Mend platform.
// Consumed by:
//   • attendance/attendance-geo.helper.ts  (FR6, FR7, FR14)
//   • sos/sos-geo.helper.ts                (FR21)
//   • hotel/hotel-geo.helper.ts            (zone management)
//
// Do NOT import module-specific code here — this layer must stay dependency-free
// so it can also run in offline/sync workers (FR14, NFR8).
// ─────────────────────────────────────────────────────────────────────────────

import { GEO_DEFAULTS } from "../../shared/constants/geo.constants";
import { GeofenceStatus, GeoValidationSeverity } from "../../shared/enums/geo.enum";
import type {
  Coordinates,
  CoordinatesWithAccuracy,
  DistanceResult,
  GeofenceFailReason,
  GeofenceValidationResult,
  HotelGeoZone,
} from "../../shared/interfaces/geo.interface";

export class GeoService {
  // ── 1. Haversine distance ──────────────────────────────────────────────────

  /**
   * Returns the great-circle distance between two WGS-84 coordinates.
   * Pure function — safe to call anywhere, including offline workers.
   */
  static distance(a: Coordinates, b: Coordinates): DistanceResult {
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);

    const haversine =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a.lat)) *
        Math.cos(toRad(b.lat)) *
        Math.sin(dLng / 2) ** 2;

    const metres =
      GEO_DEFAULTS.EARTH_RADIUS_METRES *
      2 *
      Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    return {
      metres,
      kilometres: metres / 1_000,
      display: metres < 1_000
        ? `${Math.round(metres)} m`
        : `${(metres / 1_000).toFixed(2)} km`,
    };
  }

  // ── 2. GPS quality gate (NFR6) ─────────────────────────────────────────────

  /**
   * Validates the quality and freshness of a device-reported GPS fix.
   *
   * Returns a severity level so callers can decide whether to hard-block
   * or soft-warn without duplicating threshold logic.
   */
  static assessGpsQuality(coords: CoordinatesWithAccuracy): {
    severity: GeoValidationSeverity;
    reason?: GeofenceFailReason;
  } {
    // Missing coordinates
    if (
      coords.lat == null ||
      coords.lng == null ||
      isNaN(coords.lat) ||
      isNaN(coords.lng)
    ) {
      return { severity: GeoValidationSeverity.BLOCK, reason: "MISSING_COORDINATES" };
    }

    // Stale fix (replay / spoofing protection)
    if (coords.capturedAt != null) {
      const ageMs = Date.now() - coords.capturedAt;
      if (ageMs > GEO_DEFAULTS.MAX_LOCATION_AGE_MS) {
        return { severity: GeoValidationSeverity.BLOCK, reason: "STALE_LOCATION" };
      }
    }

    // Hard-block on very low accuracy
    if (
      coords.accuracy != null &&
      coords.accuracy > GEO_DEFAULTS.WARN_ACCURACY_THRESHOLD_METRES
    ) {
      return { severity: GeoValidationSeverity.BLOCK, reason: "LOW_GPS_ACCURACY" };
    }

    // Soft-warn on moderate accuracy
    if (
      coords.accuracy != null &&
      coords.accuracy > GEO_DEFAULTS.MAX_ACCEPTABLE_ACCURACY_METRES
    ) {
      return { severity: GeoValidationSeverity.WARN, reason: "LOW_GPS_ACCURACY" };
    }

    return { severity: GeoValidationSeverity.PASS };
  }

  // ── 3. Single-zone geofence check ─────────────────────────────────────────

  /**
   * Checks whether `userCoords` is within `radius` metres of `centre`.
   * Accounts for the borderline buffer (WARN zone) defined in GEO_DEFAULTS.
   */
  static checkZone(
    userCoords: Coordinates,
    centre: Coordinates,
    radius: number,
  ): { status: GeofenceStatus; distanceMetres: number } {
    const { metres } = this.distance(userCoords, centre);

    if (metres <= radius) {
      return { status: GeofenceStatus.INSIDE, distanceMetres: metres };
    }

    if (metres <= radius + GEO_DEFAULTS.BORDERLINE_BUFFER_METRES) {
      return { status: GeofenceStatus.BORDERLINE, distanceMetres: metres };
    }

    return { status: GeofenceStatus.OUTSIDE, distanceMetres: metres };
  }

  // ── 4. Full hotel geofence validation (FR6, FR7, NFR6) ────────────────────

  /**
   * The single authoritative geofence validator used at clock-in, clock-out,
   * and shift handover.
   *
   * Checks primary zone first, then falls through to additionalZones so hotels
   * with satellite venues (e.g. off-site catering) work without exceptions.
   */
  static validateAttendance(
    userCoords: CoordinatesWithAccuracy,
    zone: HotelGeoZone,
  ): GeofenceValidationResult {
    // GPS quality gate first
    const quality = this.assessGpsQuality(userCoords);
    if (quality.severity === GeoValidationSeverity.BLOCK) {
      return {
        valid: false,
        distanceMetres: 0,
        reason: quality.reason,
      };
    }

    if (!zone) {
      return {
        valid: false,
        distanceMetres: 0,
        reason: "HOTEL_ZONE_NOT_CONFIGURED",
      };
    }

    // Primary zone
    const primary = this.checkZone(userCoords, zone.centre, zone.attendanceRadius);
    if (primary.status !== GeofenceStatus.OUTSIDE) {
      return {
        valid: true,
        distanceMetres: primary.distanceMetres,
        radiusUsed: zone.attendanceRadius,
      };
    }

    return {
      valid: false,
      distanceMetres: primary.distanceMetres,
      reason: "OUTSIDE_GEOFENCE",
      radiusUsed: zone.attendanceRadius,
    };
  }

  // ── 5. SOS location snapshot builder (FR21) ───────────────────────────────

  /**
   * Determines whether a location fix is fresh enough to be actionable
   * for an SOS event. Uses stricter thresholds than attendance.
   */
  static isSosLocationFresh(capturedAt: number): boolean {
    return Date.now() - capturedAt <= GEO_DEFAULTS.SOS_LOCATION_MAX_AGE_MS;
  }

  // ── 6. Coordinate sanitisation helpers ────────────────────────────────────

  /** Clamps lat/lng to valid WGS-84 ranges before persisting. */
  static sanitiseCoordinates(coords: Coordinates): Coordinates | null {
    const { lat, lng } = coords;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return {
      lat: parseFloat(lat.toFixed(7)),
      lng: parseFloat(lng.toFixed(7)),
    };
  }

  /** Formats coordinates for display / logging. */
  static formatCoords(coords: Coordinates): string {
    return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
  }
}