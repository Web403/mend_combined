import { Link } from "react-router-dom"

/**
 * Page header used by every route inside the shell: title + one-sentence
 * context + status + right-aligned actions (primary action goes last).
 */
export default function PageHeader({ title, description, status, actions, backLink }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {backLink && (
          <Link
            to={backLink.to}
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-700"
          >
            ← {backLink.label}
          </Link>
        )}
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {description && <p className="text-[13px] text-slate-500">{description}</p>}
          {status}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
