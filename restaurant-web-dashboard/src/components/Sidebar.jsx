import { NavLink, useNavigate, useLocation } from "react-router-dom"
import { useState } from "react"

// ─── Icons ───────────────────────────────────────────────────────────────────

const Icon = ({ d, viewBox = "0 0 24 24", children, ...props }) => (
  <svg width="14" height="14" viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    {d ? <path d={d} /> : children}
  </svg>
)

const icons = {
  overview: (
    <Icon>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Icon>
  ),
  employees: <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z" />,
  departments: (
    <Icon>
      <rect x="2" y="7" width="6" height="14" rx="1" />
      <rect x="9" y="3" width="6" height="18" rx="1" />
      <rect x="16" y="10" width="6" height="11" rx="1" />
    </Icon>
  ),
  attendance: (
    <Icon>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </Icon>
  ),
  shifts: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </Icon>
  ),
  health: (
    <Icon>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </Icon>
  ),
  fatigue: (
    <Icon>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </Icon>
  ),
  sos: (
    <Icon>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Icon>
  ),
  complaints: <Icon d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
  tasks: (
    <Icon>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <polyline points="3 6 4 7 6 5" />
      <polyline points="3 12 4 13 6 11" />
      <polyline points="3 18 4 19 6 17" />
    </Icon>
  ),
  performance: (
    <Icon>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </Icon>
  ),
  compliance: (
    <Icon>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="12" y2="17" />
    </Icon>
  ),
  audits: (
    <Icon>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </Icon>
  ),
  certifications: (
    <Icon>
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </Icon>
  ),
  recruitment: (
    <Icon>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </Icon>
  ),
  candidates: (
    <Icon>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  ),
  courses: (
    <Icon>
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </Icon>
  ),
  assessments: (
    <Icon>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
    </Icon>
  ),
  reports: (
    <Icon>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </Icon>
  ),
  analytics: (
    <Icon>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </Icon>
  ),
  geofence: (
    <Icon>
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </Icon>
  ),
  roles: (
    <Icon>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Icon>
  ),
  chevron: (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
}

// ─── Nav structure ────────────────────────────────────────────────────────────

const NAV = [
  {
    id: "dashboard",
    type: "link",
    to: "/dashboard",
    label: "Overview",
    end: true,
    icon: icons.overview,
  },
  {
    id: "workforce",
    type: "group",
    label: "Workforce",
    children: [
      { to: "/dashboard/employees",   label: "Employees",   icon: icons.employees },
      { to: "/dashboard/departments", label: "Departments", icon: icons.departments },
      { to: "/dashboard/attendance",  label: "Attendance",  icon: icons.attendance },
      { to: "/dashboard/shifts",      label: "Shifts",      icon: icons.shifts },
    ],
  },
  {
    id: "wellbeing",
    type: "group",
    label: "Wellbeing",
    children: [
      { to: "/dashboard/employee-health", label: "Employee Health", icon: icons.health },
      { to: "/dashboard/fatigue-alerts",  label: "Fatigue Alerts",  icon: icons.fatigue },
    ],
  },
  {
    id: "sos",
    type: "group",
    label: "SOS & Helpdesk",
    children: [
      { to: "/dashboard/active-sos",  label: "Active SOS",  icon: icons.sos },
      { to: "/dashboard/complaints",  label: "Complaints",  icon: icons.complaints },
    ],
  },
  {
    id: "tasks",
    type: "group",
    label: "Tasks & Efficiency",
    children: [
      { to: "/dashboard/tasks",       label: "Tasks",       icon: icons.tasks },
      { to: "/dashboard/performance", label: "Performance", icon: icons.performance },
    ],
  },
  {
    id: "compliance",
    type: "group",
    label: "Compliance",
    children: [
      { to: "/dashboard/compliance-score", label: "Compliance Score", icon: icons.compliance },
      { to: "/dashboard/audits",           label: "Audits",           icon: icons.audits },
      { to: "/dashboard/certifications",   label: "Certifications",   icon: icons.certifications },
    ],
  },
  {
    id: "recruitment",
    type: "group",
    label: "Recruitment",
    children: [
      { to: "/dashboard/job-openings", label: "Job Openings", icon: icons.recruitment },
      { to: "/dashboard/candidates",   label: "Candidates",   icon: icons.candidates },
    ],
  },
  {
    id: "learning",
    type: "group",
    label: "Learning",
    children: [
      { to: "/dashboard/courses",     label: "Courses",     icon: icons.courses },
      { to: "/dashboard/assessments", label: "Assessments", icon: icons.assessments },
    ],
  },
  {
    id: "reports",
    type: "group",
    label: "Reports",
    children: [
      { to: "/dashboard/attendance-reports",  label: "Attendance Reports",  icon: icons.attendance },
      { to: "/dashboard/compliance-reports",  label: "Compliance Reports",  icon: icons.reports },
      { to: "/dashboard/analytics",           label: "Analytics",           icon: icons.analytics },
    ],
  },
  {
    id: "settings",
    type: "group",
    label: "Settings",
    children: [
      { to: "/dashboard/hotel-profile",     label: "Hotel Profile",     icon: icons.settings },
      { to: "/dashboard/geofence",          label: "Geofence",          icon: icons.geofence },
      { to: "/dashboard/roles-permissions", label: "Roles & Permissions", icon: icons.roles },
    ],
  },
]

// ─── NavGroup ─────────────────────────────────────────────────────────────────

function NavGroup({ group, defaultOpen }) {
  const location = useLocation()
  const isAnyChildActive = group.children.some((c) => location.pathname.startsWith(c.to))
  const [open, setOpen] = useState(defaultOpen || !isAnyChildActive)

  return (
    <div>
      {/* Group header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`
          flex items-center justify-between w-full px-3 py-1.5 rounded-md
          text-[10.5px] font-semibold tracking-widest uppercase
          transition-colors select-none
          ${isAnyChildActive ? "text-slate-300" : "text-slate-500 hover:text-slate-400"}
        `}
      >
        {group.label}
        <span
          className="transition-transform duration-200 shrink-0"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
        >
          {icons.chevron}
        </span>
      </button>

      {/* Children */}
      {open && (
        <div className="mt-0.5 mb-1 flex flex-col gap-0.5">
          {group.children.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 pl-3 pr-2 py-[7px] rounded-lg text-[13px] font-medium no-underline transition-colors ${
                  isActive
                    ? "bg-white/[0.09] text-slate-100"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
                }`
              }
            >
              <span className="flex items-center shrink-0 opacity-80">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const navigate = useNavigate()

  return (
    <aside className="w-[220px] min-h-screen bg-slate-900 flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.07]">
        <div className="w-8 h-8 rounded-lg bg-[#1A2F5E] border border-white/10 flex items-center justify-center text-white font-bold text-sm">
          R
        </div>
        <span className="text-slate-100 font-semibold text-sm tracking-tight">Restaurant AdminPanel</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-3 pb-2 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map((item) =>
          item.type === "link" ? (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium no-underline transition-colors ${
                  isActive
                    ? "bg-white/[0.09] text-slate-100"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
                }`
              }
            >
              <span className="flex items-center shrink-0">{item.icon}</span>
              {item.label}
            </NavLink>
          ) : (
            <NavGroup key={item.id} group={item} />
          )
        )}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-4 pt-3 border-t border-white/[0.07]">
        <button
          onClick={() => { localStorage.clear(); navigate("/") }}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] font-medium text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  )
}