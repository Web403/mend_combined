import { Link } from "react-router-dom"
import { IconSpinner } from "./Icons"

/**
 * One button system for the whole console.
 * variants: primary (one per context), secondary, ghost, danger, dangerGhost.
 */
const BASE =
  "inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors " +
  "disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap focus-visible:outline-2 focus-visible:outline-brand-500"

const VARIANTS = {
  primary: "bg-brand-800 text-white hover:bg-brand-900 shadow-sm",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  dangerGhost: "border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300",
  link: "text-brand-600 hover:text-brand-800 underline-offset-2 hover:underline",
}

const SIZES = {
  xs: "h-7 px-2 text-[11px]",
  sm: "h-8 px-3 text-[13px]",
  md: "h-9 px-3.5 text-sm",
  lg: "h-10 px-4 text-sm",
}

function buttonClass({ variant = "secondary", size = "md", className = "" } = {}) {
  return `${BASE} ${VARIANTS[variant] ?? VARIANTS.secondary} ${SIZES[size] ?? SIZES.md} ${className}`
}

export default function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon = null,
  type = "button",
  className = "",
  children,
  disabled,
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClass({ variant, size, className })}
      {...rest}
    >
      {loading ? <IconSpinner size={14} /> : icon}
      {children}
    </button>
  )
}

/** Router link that looks like a button (keeps real anchors for a11y / cmd-click). */
export function LinkButton({ to, variant = "secondary", size = "md", icon = null, className = "", children, ...rest }) {
  return (
    <Link to={to} className={buttonClass({ variant, size, className })} {...rest}>
      {icon}
      {children}
    </Link>
  )
}
