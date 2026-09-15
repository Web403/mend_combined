export default function EmployeeToolbar({
  filters,

  onSearch,

  onAdd,

  onRefresh,

  onExport,

  loading = false,
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      {/* Search */}
      <div className="relative w-full lg:max-w-md">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">⌕</span>

        <input
          type="text"
          placeholder="Search employee..."
          value={filters.search}
          onChange={(e) => onSearch(e.target.value)}
          className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-blue-500"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className={loading ? "animate-spin" : ""} aria-hidden="true">↻</span>

          Refresh
        </button>

        {onExport && (
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium transition hover:bg-slate-100"
          >
            <span aria-hidden="true">↓</span>

            Export
          </button>
        )}

        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1A2F5E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#152549]"
          >
            <span aria-hidden="true">+</span>

            Add Employee
          </button>
        )}
      </div>
    </div>
  );
}
