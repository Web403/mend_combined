// ─────────────────────────────────────────────
// shared/interfaces/geo.interface.ts
// Geo types used across attendance, SOS, hotel
// ─────────────────────────────────────────────
import mongoose from "mongoose";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface CoordinatesWithAccuracy extends Coordinates {
  /** GPS accuracy radius in metres, as reported by the device */
  accuracy?: number;
  /** Unix timestamp (ms) when the fix was taken — used for staleness checks */
  capturedAt?: number;
}

// ── Hotel geofence zone (stored in DB / config) ──────────────────────────────

export interface HotelGeoZone {
  hotelId: mongoose.Types.ObjectId;
  /** Centre of the property */
  centre: Coordinates;
  /** Allowed clock-in radius in metres (default: GEO_DEFAULTS.ATTENDANCE_RADIUS) */
  attendanceRadius: number;
}

// ── Validation results ────────────────────────────────────────────────────────

export interface GeofenceValidationResult {
  valid: boolean;
  distanceMetres: number;
  /** Human-readable reason when valid === false */
  reason?: GeofenceFailReason;
  /** Effective radius used for the check */
  radiusUsed?: number;
}

export type GeofenceFailReason =
  | "OUTSIDE_GEOFENCE"
  | "LOW_GPS_ACCURACY"
  | "STALE_LOCATION"
  | "MISSING_COORDINATES"
  | "HOTEL_ZONE_NOT_CONFIGURED";

// ── SOS location snapshot ─────────────────────────────────────────────────────

export interface SosLocationSnapshot {
  userId: string;
  hotelId: string;
  coordinates: CoordinatesWithAccuracy;
  /** True when the fix is fresh enough to be actionable */
  isFresh: boolean;
  /** Distance from hotel centre at time of SOS (metres) */
  distanceFromHotel?: number;
  /** ISO timestamp */
  recordedAt: string;
}

// ── Distance result (utility) ─────────────────────────────────────────────────

export interface DistanceResult {
  metres: number;
  kilometres: number;
  /** Rounded metres for display */
  display: string;
}