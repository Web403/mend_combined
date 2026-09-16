import {
  IconAnalytics,
  IconCategory,
  IconCompliance,
  IconCourse,
  IconEnrollments,
  IconHotel,
  IconOverview,
  IconShieldKey,
  IconUsers,
} from "../components/ui/Icons"

/**
 * Single source of truth for the console's information architecture.
 * The sidebar, breadcrumbs and route metadata are all derived from this tree,
 * so navigation and context can never drift apart.
 *
 * Sidebar answers: "what type of thing am I managing?"
 */
export const NAV_SECTIONS = [
  {
    label: null, // Overview stands alone
    items: [{ to: "/dashboard", label: "Overview", end: true, icon: IconOverview }],
  },
  {
    label: "Organizations",
    items: [{ to: "/dashboard/hotels", label: "Hotels", icon: IconHotel }],
  },
  {
    label: "People",
    items: [{ to: "/dashboard/users", label: "Users", icon: IconUsers }],
  },
  {
    label: "Learning",
    items: [
      { to: "/dashboard/learning/courses", label: "Courses", icon: IconCourse },
      { to: "/dashboard/learning/categories", label: "Categories", icon: IconCategory },
      { to: "/dashboard/learning/enrollments", label: "Enrollments", icon: IconEnrollments },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/dashboard/analytics", label: "Analytics", icon: IconAnalytics },
      { to: "/dashboard/compliance", label: "Compliance", icon: IconCompliance },
    ],
  },
  {
    label: "Platform",
    items: [{ to: "/dashboard/rbac", label: "Access control", icon: IconShieldKey }],
  },
]

/** Static breadcrumb words for first path segments under /dashboard. */
const SEGMENT_LABELS = {
  hotels: { label: "Hotels", to: "/dashboard/hotels" },
  new: { label: "New hotel" },
  edit: { label: "Edit" },
  users: { label: "Users", to: "/dashboard/users" },
  learning: { label: "Learning" },
  courses: { label: "Courses", to: "/dashboard/learning/courses" },
  categories: { label: "Categories", to: "/dashboard/learning/categories" },
  enrollments: { label: "Enrollments", to: "/dashboard/learning/enrollments" },
  analytics: { label: "Analytics", to: "/dashboard/analytics" },
  compliance: { label: "Compliance", to: "/dashboard/compliance" },
  rbac: { label: "Access control", to: "/dashboard/rbac" },
}

export const ROOT_CRUMB = { label: "Mend Admin", to: "/dashboard" }

/**
 * Default breadcrumbs derived from the URL. Detail pages override with a
 * human name via useSetCrumbs (e.g. the actual hotel / course title).
 */
export function crumbsFromPath(pathname) {
  const segments = pathname.split("/").filter(Boolean).filter((s) => s !== "dashboard")
  if (!segments.length) return [ROOT_CRUMB, { label: "Overview" }]
  const crumbs = [ROOT_CRUMB]
  segments.forEach((seg) => {
    const meta = SEGMENT_LABELS[seg]
    if (meta) crumbs.push({ ...meta, to: meta.to ?? undefined })
    // dynamic ids get no crumb here; detail pages replace the trail via useSetCrumbs
  })
  return crumbs
}
