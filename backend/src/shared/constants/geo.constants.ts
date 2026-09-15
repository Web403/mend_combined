// ─────────────────────────────────────────────
// shared/constants/geo.constants.ts
// All geo-related tuneable defaults.
// Override per-hotel in HotelGeoZone if needed.
// ─────────────────────────────────────────────

export const GEO_DEFAULTS = {
  /** Earth mean radius in metres — used in Haversine */
  EARTH_RADIUS_METRES: 6_371_000,

  // ── Attendance / clock-in (FR6, FR7) ──────────────────────────────────────
  /** Default allowed clock-in radius from hotel centre (metres) */
  ATTENDANCE_RADIUS_METRES: 200,

  /**
   * Borderline buffer: if the user is within ATTENDANCE_RADIUS + this value,
   * issue a WARN instead of hard BLOCK so marginal GPS readings don't
   * unfairly deny clock-in. (GeofenceStatus.BORDERLINE)
   */
  BORDERLINE_BUFFER_METRES: 20,

  // ── GPS quality gates (NFR6) ───────────────────────────────────────────────
  /** Reject fixes with horizontal accuracy worse than this (metres) */
  MAX_ACCEPTABLE_ACCURACY_METRES: 50,

  /**
   * Accuracy tier that triggers a WARN (not a hard block).
   * 50 < accuracy ≤ 100 → warn but allow, accuracy > 100 → block.
   */
  WARN_ACCURACY_THRESHOLD_METRES: 100,

  // ── Staleness (replay / spoofing protection, NFR6) ────────────────────────
  /** Location fixes older than this are rejected outright (ms) */
  MAX_LOCATION_AGE_MS: 5 * 60 * 1_000, // 5 minutes

  // ── SOS (FR21) ────────────────────────────────────────────────────────────
  /** How frequently (ms) to re-snapshot location during an open SOS */
  SOS_LOCATION_POLL_INTERVAL_MS: 30_000, // 30 seconds

  /** SOS fixes are considered stale after this many ms */
  SOS_LOCATION_MAX_AGE_MS: 2 * 60 * 1_000, // 2 minutes
} as const;