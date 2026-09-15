// ─────────────────────────────────────────────────────────────────────────────
// shared/enums/recruitment.ts
// ─────────────────────────────────────────────────────────────────────────────

export enum JobStatus {
  OPEN     = "OPEN",
  CLOSED   = "CLOSED",
  /** Hotel is non-compliant — blocked from hiring (FR38, FR61) */
  BLOCKED  = "BLOCKED",
  DRAFT    = "DRAFT",
}

export enum JobDepartment {
  HOUSEKEEPING      = "Housekeeping",
  FRONT_OFFICE      = "Front Office",
  FOOD_AND_BEVERAGE = "Food & Beverage",
  MAINTENANCE       = "Maintenance",
  SECURITY          = "Security",
  CONCIERGE         = "Concierge",
  MANAGEMENT        = "Management",
  OTHER             = "Other",
}

export enum EmploymentType {
  FULL_TIME  = "Full Time",
  PART_TIME  = "Part Time",
  CONTRACT   = "Contract",
  INTERNSHIP = "Internship",
  GIG        = "Gig",
}

export enum ApplicationStatus {
  APPLIED      = "APPLIED",
  UNDER_REVIEW = "UNDER_REVIEW",
  SHORTLISTED  = "SHORTLISTED",
  REJECTED     = "REJECTED",
  HIRED        = "HIRED",
  WITHDRAWN    = "WITHDRAWN",
}

export enum CertificationLevel {
  NONE            = "None",
  MEND_CERTIFIED  = "Mend Certified",
  MEND_GOLD_SEAL  = "Mend Gold Seal",
}

export enum GigStatus {
  DRAFT     = "DRAFT",
  OPEN      = "OPEN",
  FULL      = "FULL",
  CLOSED    = "CLOSED",
  CANCELLED = "CANCELLED",
}

export enum BookingStatus {
  CONFIRMED = "CONFIRMED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
  NO_SHOW   = "NO_SHOW",
}

export enum RateUnit {
  HOURLY = "HOURLY",
  DAILY  = "DAILY",
}
