/**
 * Semantic label + badge tone maps shared by every table/detail screen so the
 * same status looks identical everywhere (the old UI invented its own tones per page).
 */

const HOTEL_STATUS = {
  ACTIVE: { label: "Active", tone: "success" },
  INACTIVE: { label: "Inactive", tone: "neutral" },
}

const SUBSCRIPTION_STATUS = {
  ACTIVE: { label: "Active", tone: "success" },
  PAUSED: { label: "Paused", tone: "warning" },
  EXPIRED: { label: "Expired", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
}

const USER_STATUS = {
  ACTIVE: { label: "Active", tone: "success" },
  CREATED: { label: "Invited", tone: "info" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
  INACTIVE: { label: "Inactive", tone: "neutral" },
}

const COURSE_STATUS = {
  PUBLISHED: { label: "Published", tone: "success" },
  published: { label: "Published", tone: "success" },
  DRAFT: { label: "Draft", tone: "warning" },
  draft: { label: "Draft", tone: "warning" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
  archived: { label: "Archived", tone: "neutral" },
}

const ENROLLMENT_STATUS = {
  applied: { label: "Needs approval", tone: "warning" },
  PENDING: { label: "Needs approval", tone: "warning" },
  enrolled: { label: "Enrolled", tone: "info" },
  in_progress: { label: "In progress", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  dropped: { label: "Dropped", tone: "danger" },
}

export function hotelStatusLabel(isActive) {
  if (isActive === undefined || isActive === null) return { label: "Unknown", tone: "neutral" }
  return HOTEL_STATUS[isActive ? "ACTIVE" : "INACTIVE"]
}

export function subscriptionStatus(status) {
  if (!status) return { label: "No subscription", tone: "neutral" }
  return SUBSCRIPTION_STATUS[String(status).toUpperCase()] ?? { label: String(status), tone: "info" }
}

export function userStatus(status) {
  if (!status) return { label: "Unknown", tone: "neutral" }
  return USER_STATUS[String(status).toUpperCase()] ?? { label: String(status), tone: "neutral" }
}

export function courseStatus(course) {
  const s = course?.status ?? (course?.isPublished ? "published" : "draft")
  return COURSE_STATUS[s] ?? COURSE_STATUS[String(s).toUpperCase()] ?? { label: String(s), tone: "neutral" }
}

export function enrollmentStatus(status) {
  if (!status) return { label: "Unknown", tone: "neutral" }
  return ENROLLMENT_STATUS[status] ?? { label: String(status), tone: "neutral" }
}

export function isEnrollmentApprovable(status) {
  return ["applied", "PENDING"].includes(status)
}

export function paymentLabel(initialPaymentDone) {
  return initialPaymentDone ? { label: "Onboarding complete", tone: "success" } : { label: "Payment due", tone: "warning" }
}

/** "2025-06-30T..." → "30 Jun 2025"; expiring soon gets a warning tone. */
export function subscriptionExpiry(value) {
  if (!value) return { label: "No expiry set", tone: "neutral" }
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return { label: String(value), tone: "neutral" }
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000)
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, tone: "danger" }
  if (days <= 30) return { label: `Expires in ${days}d`, tone: "warning" }
  return { label: `Renews ${new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d)}`, tone: "neutral" }
}
