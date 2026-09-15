import { useCallback, useEffect, useMemo, useState } from "react";
import PageLayout from "../../../components/PageLayout";
import { getUsersWithWellbeing } from "../../../api/services/wellbeing";

const DEFAULT_FILTERS = { page: 1, limit: 10, userId: "", alertStatus: "", fatigueRiskLevel: "", fromDate: "", toDate: "" };

const formatDate = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "-";
};

const riskClass = (risk) => ({ LOW: "bg-green-100 text-green-700", MEDIUM: "bg-amber-100 text-amber-700", HIGH: "bg-red-100 text-red-700" }[risk] || "bg-slate-100 text-slate-700");

const EmployeeHealth = () => {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "")), [filters]);

  const fetchWellbeing = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getUsersWithWellbeing(query);
      setRecords(Array.isArray(response.data) ? response.data : []);
      setPagination(response.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to fetch employee health records.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(fetchWellbeing, 0);
    return () => clearTimeout(timer);
  }, [fetchWellbeing]);

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, page: key === "page" ? value : 1, [key]: value }));
  const start = pagination.total ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <PageLayout title="Employee Health" description="Monitor employee health and wellness.">
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-xs font-medium text-slate-600">Employee ID
            <input type="search" value={filters.userId} onChange={(event) => updateFilter("userId", event.target.value)} placeholder="Search user ID" className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500" />
          </label>
          <label className="text-xs font-medium text-slate-600">Risk level
            <select value={filters.fatigueRiskLevel} onChange={(event) => updateFilter("fatigueRiskLevel", event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500">
              <option value="">All risks</option><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">Alert status
            <select value={filters.alertStatus} onChange={(event) => updateFilter("alertStatus", event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500">
              <option value="">All alerts</option><option value="NONE">None</option><option value="OPEN">Open</option><option value="ACKNOWLEDGED">Acknowledged</option><option value="RESOLVED">Resolved</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">From date<input type="date" value={filters.fromDate} onChange={(event) => updateFilter("fromDate", event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500" /></label>
          <label className="text-xs font-medium text-slate-600">To date<input type="date" value={filters.toDate} onChange={(event) => updateFilter("toDate", event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-blue-500" /></label>
          <div className="flex items-end gap-2"><button type="button" onClick={fetchWellbeing} disabled={loading} className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Loading..." : "Refresh"}</button><button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="h-10 text-sm font-medium text-blue-700 hover:text-blue-800">Reset</button></div>
        </div>
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700"><tr><th className="px-5 py-4 font-semibold">Employee ID</th><th className="px-5 py-4 font-semibold">Submitted</th><th className="px-5 py-4 font-semibold">Wellbeing</th><th className="px-5 py-4 font-semibold">Sleep</th><th className="px-5 py-4 font-semibold">Stress</th><th className="px-5 py-4 font-semibold">Fatigue risk</th><th className="px-5 py-4 font-semibold">Alert</th></tr></thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {loading ? <tr><td colSpan="7" className="px-5 py-16 text-center">Loading health records...</td></tr>
              : records.length === 0 ? <tr><td colSpan="7" className="px-5 py-16 text-center">No health records found.</td></tr>
                : records.map((record) => <tr key={record.id || record._id} className="hover:bg-slate-50"><td className="px-5 py-4 font-medium text-slate-800">{record.userId || "-"}</td><td className="px-5 py-4 whitespace-nowrap">{formatDate(record.createdAt)}</td><td className="px-5 py-4">{record.rating ?? "-"}/5</td><td className="px-5 py-4">{record.sleepHours ?? "-"}{record.sleepHours !== undefined ? " hours" : ""}</td><td className="px-5 py-4">{record.stressLevel ?? "-"}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${riskClass(record.fatigueRiskLevel)}`}>{record.fatigueRiskLevel || "UNKNOWN"}</span></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${record.alertStatus === "OPEN" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>{record.alertStatus || "NONE"}</span></td></tr>)}
          </tbody>
        </table></div></div>
        <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between"><span>Showing {start}-{end} of {pagination.total || 0} records</span><div className="flex items-center gap-3"><select value={filters.limit} onChange={(event) => updateFilter("limit", Number(event.target.value))} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 outline-none focus:border-blue-500">{[10, 25, 50, 100].map((limit) => <option key={limit} value={limit}>{limit} per page</option>)}</select><button type="button" onClick={() => updateFilter("page", pagination.page - 1)} disabled={loading || pagination.page <= 1} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50">Previous</button><span>Page {pagination.page} of {pagination.totalPages || 1}</span><button type="button" onClick={() => updateFilter("page", pagination.page + 1)} disabled={loading || pagination.page >= pagination.totalPages} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50">Next</button></div></div>
      </div>
    </PageLayout>
  );
};

export default EmployeeHealth;
