import { IconSearch, IconClose } from "./Icons"

/**
 * List toolbar: search + compact filters + active filter chips + clear-all.
 * Filters are real server-side query params everywhere they're used — no
 * decorative controls.
 */
export function Toolbar({ children, className = "" }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {children}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder = "Search…", className = "", label = "Search" }) {
  return (
    <div className={`relative ${className}`}>
      <IconSearch
        size={14}
        className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        type="search"
        role="searchbox"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full min-w-44 rounded-lg border border-slate-300 bg-white pl-8 pr-7 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <IconClose size={12} />
        </button>
      )}
    </div>
  )
}

export function FilterSelect({ label, value, onChange, options, className = "" }) {
  return (
    <label className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 cursor-pointer rounded-lg border bg-white pl-2 pr-6 text-xs font-medium outline-none transition focus:border-brand-400 ${
          value && value !== "" ? "border-brand-300 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600 hover:border-slate-400"
        }`}
      >
        {options.map((o) => (
          <option key={o.value ?? "all"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ActiveFilterChips({ chips, onRemove, onClear }) {
  if (!chips.length) return null
  return (
    <>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 py-0.5 pl-2.5 pr-1 text-[11px] font-medium text-brand-700"
        >
          {chip.label}
          <span className="font-semibold">{chip.value}</span>
          <button
            type="button"
            aria-label={`Remove filter ${chip.label}`}
            onClick={() => onRemove(chip.key)}
            className="rounded-full p-0.5 text-brand-400 hover:bg-brand-100 hover:text-brand-700"
          >
            <IconClose size={10} />
          </button>
        </span>
      ))}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClear}
          className="text-[11px] font-semibold text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
        >
          Clear all
        </button>
      )}
    </>
  )
}
