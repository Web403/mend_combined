/**
 * Single icon set for the admin console. All icons inherit `currentColor`,
 * use a 24x24 grid with a 1.8 stroke, and take a `size` prop (default 16).
 * Keeping one source guarantees consistent visual weight across nav, buttons
 * and tables (the previous UI mixed three icon styles).
 */
function Svg({ size = 16, className = "", children, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const IconOverview = (p) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </Svg>
)

export const IconHotel = (p) => (
  <Svg {...p}>
    <path d="M3 21V8l7-5 7 5v13" />
    <path d="M3 21h18" />
    <path d="M9 21v-5h4v5" />
    <path d="M10 11h2M17 12v4" />
  </Svg>
)

export const IconUsers = (p) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.8 20a6.4 6.4 0 0 1 12.4 0" />
    <path d="M16 5.2a3.4 3.4 0 0 1 0 5.8" />
    <path d="M17.8 14.5a6.4 6.4 0 0 1 3.4 5.5" />
  </Svg>
)

export const IconCourse = (p) => (
  <Svg {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M20 18v3H6.5A2.5 2.5 0 0 1 4 18.5" />
    <path d="M8.5 7h7M8.5 10.5h5" />
  </Svg>
)

export const IconCategory = (p) => (
  <Svg {...p}>
    <path d="M3.5 4.5h6v6h-6z" />
    <path d="M14.5 4.5h6v6h-6z" />
    <path d="M3.5 15.5h6v6h-6z" />
    <path d="M14.5 15.5h6v6h-6z" />
  </Svg>
)

export const IconEnrollments = (p) => (
  <Svg {...p}>
    <path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M8.5 11.5l2 2 4-4" />
  </Svg>
)

export const IconAnalytics = (p) => (
  <Svg {...p}>
    <path d="M4 4v16h16" />
    <path d="M8 15v2M12.5 10v7M17 6v11" />
  </Svg>
)

export const IconCompliance = (p) => (
  <Svg {...p}>
    <path d="M12 21.5s7.5-3.7 7.5-9.5V5.5L12 2.5 4.5 5.5V12c0 5.8 7.5 9.5 7.5 9.5z" />
    <path d="M8.8 11.8l2.3 2.3 4.4-4.4" />
  </Svg>
)

export const IconShieldKey = (p) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7a4 4 0 0 1 7.9-.9" />
    <circle cx="12" cy="15.5" r="1.4" />
    <path d="M12 16.9v1.6" />
  </Svg>
)

export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.5 15.5 21 21" />
  </Svg>
)

export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const IconMinus = (p) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
)

export const IconChevronDown = (p) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
)

export const IconChevronLeft = (p) => (
  <Svg {...p}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
)

export const IconChevronRight = (p) => (
  <Svg {...p}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
)

export const IconChevronsLeft = (p) => (
  <Svg {...p}>
    <path d="m11 6-6 6 6 6M18 6l-6 6 6 6" />
  </Svg>
)

export const IconChevronsRight = (p) => (
  <Svg {...p}>
    <path d="m13 6 6 6-6 6M6 6l6 6-6 6" />
  </Svg>
)

export const IconChevronUp = (p) => (
  <Svg {...p}>
    <path d="m6 15 6-6 6 6" />
  </Svg>
)

export const IconArrowRight = (p) => (
  <Svg {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Svg>
)

export const IconClose = (p) => (
  <Svg {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
)

export const IconMenu = (p) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
)

export const IconDots = (p) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconRefresh = (p) => (
  <Svg {...p}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    <path d="M21 3v6h-6" />
  </Svg>
)

export const IconAlert = (p) => (
  <Svg {...p}>
    <path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Svg>
)

export const IconCheck = (p) => (
  <Svg {...p}>
    <path d="m20 6.5-11 11-5-5" />
  </Svg>
)

export const IconCheckCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.3 2.4 2.4 4.7-4.9" />
  </Svg>
)

export const IconInfo = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </Svg>
)

export const IconErrorCircle = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4.5" />
    <path d="M12 16h.01" />
  </Svg>
)

export const IconEye = (p) => (
  <Svg {...p}>
    <path d="M2.5 12S6.4 5.5 12 5.5 21.5 12 21.5 12 17.6 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)

export const IconPencil = (p) => (
  <Svg {...p}>
    <path d="M17 3.5a2.1 2.1 0 0 1 3 3L8 18.5l-4.5 1.5 1.5-4.5z" />
    <path d="m14.5 6 3 3" />
  </Svg>
)

export const IconTrash = (p) => (
  <Svg {...p}>
    <path d="M4 6.5h16" />
    <path d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5" />
    <path d="M6 6.5 6.9 20a1.5 1.5 0 0 0 1.5 1.4h7.2a1.5 1.5 0 0 0 1.5-1.4L19 6.5" />
    <path d="M10 10.5v7M14 10.5v7" />
  </Svg>
)

export const IconMail = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Svg>
)

export const IconPhone = (p) => (
  <Svg {...p}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.8.7a2 2 0 0 1 1.7 2z" />
  </Svg>
)

export const IconMapPin = (p) => (
  <Svg {...p}>
    <path d="M20 10.5c0 5.5-8 11-8 11s-8-5.5-8-11a8 8 0 1 1 16 0z" />
    <circle cx="12" cy="10.5" r="2.8" />
  </Svg>
)

export const IconCard = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="M2.5 10h19" />
    <path d="M6.5 14.5h4" />
  </Svg>
)

export const IconClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </Svg>
)

export const IconBuilding = IconHotel

export const IconLogout = (p) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Svg>
)

export const IconUserPlus = (p) => (
  <Svg {...p}>
    <path d="M15 20v-1.8a4.5 4.5 0 0 0-4.5-4.4h-4A4.5 4.5 0 0 0 2 18.2V20" />
    <circle cx="8.2" cy="7.5" r="4" />
    <path d="M19 8v6M22 11h-6" />
  </Svg>
)

export const IconUpload = (p) => (
  <Svg {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7.5 8 4.5-4.5L16.5 8" />
    <path d="M12 3.5V15" />
  </Svg>
)

export const IconDownload = (p) => (
  <Svg {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    <path d="M12 15V3.5" />
  </Svg>
)

export const IconFile = (p) => (
  <Svg {...p}>
    <path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z" />
    <path d="M14 2.5V8h5.5" />
    <path d="M9 13h6M9 16.5h4" />
  </Svg>
)

export const IconArrowUp = (p) => (
  <Svg {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Svg>
)

export const IconArrowDown = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M18 13l-6 6-6-6" />
  </Svg>
)

export const IconSort = (p) => (
  <Svg {...p}>
    <path d="M8 5v14M8 5 5 8M8 5l3 3" opacity="0.9" />
    <path d="M16 19V5M16 19l3-3M16 19l-3-3" opacity="0.35" />
  </Svg>
)

export const IconSortAsc = (p) => (
  <Svg {...p}>
    <path d="M8 19V5M8 5 5 8M8 5l3 3" />
    <path d="M16 5v14M16 19l-3-3M16 19l3-3" opacity="0.3" />
  </Svg>
)

export const IconSortDesc = (p) => (
  <Svg {...p}>
    <path d="M8 5v14M8 19l-3-3M8 19l3-3" opacity="0.3" />
    <path d="M16 5v14M16 19l-3-3M16 19l3-3" />
  </Svg>
)

export const IconFilter = (p) => (
  <Svg {...p}>
    <path d="M3.5 5.5h17l-6.6 7.6a2 2 0 0 0-.4 1.2V19l-3 2.5V14.3a2 2 0 0 0-.4-1.2z" />
  </Svg>
)

export const IconExternal = (p) => (
  <Svg {...p}>
    <path d="M13 5h6v6" />
    <path d="M19 5 10.5 13.5" />
    <path d="M18 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4.5" />
  </Svg>
)

export const IconBook = IconCourse

export const IconSpinner = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`animate-spin ${className}`}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.6" opacity="0.25" />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
  </svg>
)

export const IconInbox = (p) => (
  <Svg {...p}>
    <path d="M21.5 13.5 18.5 5a2 2 0 0 0-1.9-1.3H7.4A2 2 0 0 0 5.5 5L2.5 13.5" />
    <path d="M2.5 13.5h5a2.5 2.5 0 0 1 2.5 2.5v.5h4v-.5a2.5 2.5 0 0 1 2.5-2.5h5v5a2 2 0 0 1-2 2H4.5a2 2 0 0 1-2-2z" />
  </Svg>
)

export const IconFilterOff = (p) => (
  <Svg {...p}>
    <path d="M3.5 5.5h17l-6.6 7.6a2 2 0 0 0-.4 1.2V19l-3 2.5V14.3a2 2 0 0 0-.4-1.2z" opacity="0.6" />
    <path d="m4 20 16-16" />
  </Svg>
)
