import { useId } from "react"

/**
 * Form primitives with consistent label/hint/error treatment and full
 * aria wiring (label association + aria-invalid + aria-describedby).
 */
export const CONTROL =
  "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 " +
  "outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"

export const CONTROL_ERROR = "border-red-400 focus:border-red-400 focus:ring-red-100"
export const CONTROL_OK = "border-slate-300"

export function Label({ htmlFor, required, children, hint }) {
  return (
    <span className="mb-1 flex items-baseline justify-between gap-2">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-slate-600">
        {children}
        {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
      </label>
      {hint && <span className="text-[11px] font-normal text-slate-400">{hint}</span>}
    </span>
  )
}

export function FieldError({ id, children }) {
  if (!children) return null
  return (
    <p id={id} className="mt-1 text-[11px] font-medium text-red-600" role="alert">
      {children}
    </p>
  )
}

function useFieldProps({ id, error, hint }) {
  const auto = useId()
  const inputId = id ?? `field-${auto}`
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined
  return { inputId, errorId, hintId, describedBy }
}

export function TextField({
  label,
  required,
  error,
  hint,
  className = "",
  id,
  type = "text",
  ...rest
}) {
  const f = useFieldProps({ id, error, hint })
  return (
    <div className={`min-w-0 ${className}`}>
      {label && <Label htmlFor={f.inputId} required={required} hint={hint}>{label}</Label>}
      <input
        id={f.inputId}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={f.describedBy}
        className={`${CONTROL} ${error ? CONTROL_ERROR : CONTROL_OK}`}
        {...rest}
      />
      {hint && !error && (
        <p id={f.hintId} className="mt-1 text-[11px] text-slate-400">
          {hint}
        </p>
      )}
      <FieldError id={f.errorId}>{error}</FieldError>
    </div>
  )
}

export function SelectField({ label, required, error, hint, className = "", id, children, ...rest }) {
  const f = useFieldProps({ id, error, hint })
  return (
    <div className={`min-w-0 ${className}`}>
      {label && <Label htmlFor={f.inputId} required={required} hint={hint}>{label}</Label>}
      <select
        id={f.inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={f.describedBy}
        className={`${CONTROL} ${error ? CONTROL_ERROR : CONTROL_OK}`}
        {...rest}
      >
        {children}
      </select>
      <FieldError id={f.errorId}>{error}</FieldError>
    </div>
  )
}

export function TextAreaField({ label, required, error, hint, className = "", id, rows = 3, ...rest }) {
  const f = useFieldProps({ id, error, hint })
  return (
    <div className={`min-w-0 ${className}`}>
      {label && <Label htmlFor={f.inputId} required={required} hint={hint}>{label}</Label>}
      <textarea
        id={f.inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={f.describedBy}
        className={`${CONTROL} resize-y ${error ? CONTROL_ERROR : CONTROL_OK}`}
        {...rest}
      />
      {hint && !error && (
        <p id={f.hintId} className="mt-1 text-[11px] text-slate-400">
          {hint}
        </p>
      )}
      <FieldError id={f.errorId}>{error}</FieldError>
    </div>
  )
}

export function CheckboxField({ label, checked, onChange, id, description, disabled }) {
  const auto = useId()
  const inputId = id ?? `chk-${auto}`
  return (
    <label
      htmlFor={inputId}
      className={`flex items-start gap-2.5 ${disabled ? "opacity-50" : "cursor-pointer"}`}
    >
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-[var(--color-brand-800)]"
      />
      <span>
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        {description && <span className="block text-xs text-slate-400">{description}</span>}
      </span>
    </label>
  )
}
