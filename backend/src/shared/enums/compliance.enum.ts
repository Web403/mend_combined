// ─────────────────────────────────────────────────────────────────────────────
// shared/enums/compliance.enum.ts
// ─────────────────────────────────────────────────────────────────────────────

export enum ComplianceStatus {
  PENDING    = "PENDING",
  COMPUTED   = "COMPUTED",
  OVERRIDDEN = "OVERRIDDEN", // manually adjusted by Mend auditor
}

export enum AuditAction {
  // Hotel lifecycle
  HOTEL_CREATED          = "HOTEL_CREATED",
  HOTEL_STRUCK           = "HOTEL_STRUCK",
  HOTEL_UNSTRUCK         = "HOTEL_UNSTRUCK",
  HOTEL_BLOCKED          = "HOTEL_BLOCKED",
  HOTEL_UNBLOCKED        = "HOTEL_UNBLOCKED",

  // Compliance
  COMPLIANCE_EVALUATED   = "COMPLIANCE_EVALUATED",
  CERTIFICATION_UPGRADED = "CERTIFICATION_UPGRADED",
  CERTIFICATION_DOWNGRADED = "CERTIFICATION_DOWNGRADED",

  // Recruitment
  JOB_BLOCKED            = "JOB_BLOCKED",

  // Passport
  PASSPORT_CREATED       = "PASSPORT_CREATED",
  PASSPORT_UPDATED       = "PASSPORT_UPDATED",

  // Wellbeing
  FATIGUE_ALERT_FIRED    = "FATIGUE_ALERT_FIRED",
}
