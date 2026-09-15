import { NavLink, useNavigate } from "react-router-dom"

const sections = [
  {
    label: "Workspace",
    links: [
      {
        to: "/dashboard",
        label: "Overview",
        end: true,
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Administration",
    links: [
      {
        to: "/dashboard/users",
        label: "Users",
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87" />
            <path d="M16 3.13a4 4 0 010 7.75" />
          </svg>
        ),
      },
      {
        to: "/dashboard/hotels",
        label: "Hotels",
        icon: (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Learning Management",
    links: [
      {
        to: "/dashboard/lms/courses",
        label: "Courses",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></svg>,
      },
      {
        to: "/dashboard/lms/categories",
        label: "Categories",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg>,
      },
      {
        to: "/dashboard/lms/enrollments",
        label: "Enrollments",
        icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>,
      },
    ],
  },
]

export default function Sidebar() {
  const navigate = useNavigate()

  return (
    <aside className="w-[220px] min-h-screen bg-slate-900 flex flex-col shrink-0">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.07]">
        <div className="w-8 h-8 rounded-lg bg-[#1A2F5E] border border-white/10 flex items-center justify-center text-white font-bold text-sm">
          A
        </div>
        <span className="text-slate-100 font-semibold text-sm tracking-tight">AdminPanel</span>
      </div>

      <nav className="flex-1 px-3 pt-4 space-y-5">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium no-underline transition-colors ${
                      isActive
                        ? "bg-white/[0.09] text-slate-100"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]"
                    }`
                  }
                >
                  <span className="flex items-center shrink-0">{link.icon}</span>
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

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
