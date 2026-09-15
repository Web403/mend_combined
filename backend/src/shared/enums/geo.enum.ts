// ─────────────────────────────────────────────
// shared/enums/geo.enum.ts
// ─────────────────────────────────────────────

export enum GeofenceStatus {
  INSIDE = "INSIDE",
  OUTSIDE = "OUTSIDE",
  BORDERLINE = "BORDERLINE", // within 10 % buffer — warn but allow
}

export enum LocationCaptureEvent {
  CLOCK_IN = "CLOCK_IN",
  CLOCK_OUT = "CLOCK_OUT",
  SOS_TRIGGER = "SOS_TRIGGER",
  SOS_UPDATE = "SOS_UPDATE",
  SHIFT_HANDOVER = "SHIFT_HANDOVER",
}

export enum GeoValidationSeverity {
  /** Hard block — do not proceed */
  BLOCK = "BLOCK",
  /** Soft warn — log and proceed with manager notification */
  WARN = "WARN",
  /** All good */
  PASS = "PASS",
}