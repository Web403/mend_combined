export enum CourseBadge {
  NEW = "new",
  POPULAR = "popular",
  UPDATED = "updated",
  FEATURED = "featured",
}

export enum CourseStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

export enum CourseDifficulty {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  PROFESSIONAL = "professional",
}

export enum EnrollmentStatus {
  APPLIED = "applied",
  ENROLLED = "enrolled",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  DROPPED = "dropped",
}

export enum QuestionType {
  MULTIPLE_CHOICE = "multiple_choice",
  TRUE_FALSE = "true_false",
  ORDERING = "ordering",
  MULTI_SELECT = "multi_select",
}

export enum ContentBlockType {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  EMBED = "embed",
  CALLOUT = "callout",
  LIST = "list",
}

export enum AssessmentStatus {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  PASSED = "passed",
  FAILED = "failed",
}

export enum CertificateStatus {
  ACTIVE = "ACTIVE",
  REVOKED = "REVOKED",
}