import { useCallback, useEffect, useMemo, useState } from "react";
import PageLayout from "../../../components/PageLayout";
import { getPublicGigs, getPublicJobs } from "../../../api/services/recruitment";

const jobsInitial = { page: 1, limit: 10, search: "", department: "", employmentType: "", certificationRequired: "", sortBy: "createdAt", sortOrder: "desc" };
const gigsInitial = { page: 1, limit: 10, department: "", certificationRequired: "", startAfter: "", startBefore: "" };
const formatDate = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-";

const JobOpenings = () => {
  const [mode, setMode] = useState("jobs");
  const [jobFilters, setJobFilters] = useState(jobsInitial);
  const [gigFilters, setGigFilters] = useState(gigsInitial);
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const filters = mode === "jobs" ? jobFilters : gigFilters;
  const query = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "")), [filters]);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const response = mode === "jobs" ? await getPublicJobs(query) : await getPublicGigs(query);
      setListings(Array.isArray(response.data) ? response.data : []);
      setPagination(response.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (err) { setError(err?.response?.data?.message || `Unable to fetch ${mode}.`); }
    finally { setLoading(false); }
  }, [mode, query]);

  useEffect(() => { const timer = setTimeout(load, 0); return () => clearTimeout(timer); }, [load]);
  const update = (key, value) => {
    const set = mode === "jobs" ? setJobFilters : setGigFilters;
    set((current) => ({ ...current, page: key === "page" ? value : 1, [key]: value }));
  };
  const switchMode = (value) => { setMode(value); setListings([]); };

  return <PageLayout title="Job Openings" description="Browse open jobs and upcoming gigs."><div className="space-y-5">
    <div className="inline-flex rounded-lg bg-slate-100 p-1"><button type="button" onClick={() => switchMode("jobs")} className={`rounded-md px-5 py-2 text-sm font-semibold ${mode === "jobs" ? "bg-white text-[#1A2F5E] shadow-sm" : "text-slate-600"}`}>Jobs</button><button type="button" onClick={() => switchMode("gigs")} className={`rounded-md px-5 py-2 text-sm font-semibold ${mode === "gigs" ? "bg-white text-[#1A2F5E] shadow-sm" : "text-slate-600"}`}>Gigs</button></div>
    {mode === "jobs" ? <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4"><input type="search" value={jobFilters.search} onChange={(event) => update("search", event.target.value)} placeholder="Search title or description" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" /><input value={jobFilters.department} onChange={(event) => update("department", event.target.value)} placeholder="Department" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" /><select value={jobFilters.employmentType} onChange={(event) => update("employmentType", event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">All employment types</option><option value="FULL_TIME">Full time</option><option value="PART_TIME">Part time</option><option value="CONTRACT">Contract</option></select><input value={jobFilters.certificationRequired} onChange={(event) => update("certificationRequired", event.target.value)} placeholder="Certification" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" /></div> : <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4"><input value={gigFilters.department} onChange={(event) => update("department", event.target.value)} placeholder="Department" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" /><input value={gigFilters.certificationRequired} onChange={(event) => update("certificationRequired", event.target.value)} placeholder="Certification" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm" /><label className="text-xs text-slate-600">Start after<input type="date" value={gigFilters.startAfter} onChange={(event) => update("startAfter", event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label><label className="text-xs text-slate-600">Start before<input type="date" value={gigFilters.startBefore} onChange={(event) => update("startBefore", event.target.value)} className="mt-1 block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" /></label></div>}
    <div className="flex justify-between"><p className="text-sm text-slate-500">{pagination.total || 0} open {mode}</p><button type="button" onClick={load} disabled={loading} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm disabled:opacity-60">{loading ? "Loading..." : "Refresh"}</button></div>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {loading ? <div className="flex h-64 items-center justify-center rounded-xl border bg-white text-slate-500">Loading {mode}...</div> : listings.length === 0 ? <div className="flex h-64 items-center justify-center rounded-xl border bg-white text-slate-500">No open {mode} found.</div> : <div className="grid gap-4 lg:grid-cols-2">{listings.map((listing) => <article key={listing.id || listing._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-800">{listing.title || listing.name || "Untitled listing"}</h2><p className="mt-1 text-sm text-slate-500">{listing.department || "No department"} {listing.employmentType && `• ${listing.employmentType}`}</p></div><span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">OPEN</span></div><p className="mt-4 line-clamp-3 text-sm text-slate-600">{listing.description || "No description provided."}</p><div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-sm"><span><span className="text-slate-500">Certification: </span>{listing.certificationRequired || "None"}</span>{mode === "gigs" ? <span><span className="text-slate-500">Starts: </span>{formatDate(listing.startAt)}</span> : <span><span className="text-slate-500">Posted: </span>{formatDate(listing.createdAt)}</span>}</div></article>)}</div>}
    <div className="flex justify-end gap-3 text-sm"><button type="button" onClick={() => update("page", pagination.page - 1)} disabled={loading || pagination.page <= 1} className="rounded border px-3 py-1 disabled:opacity-50">Previous</button><span>Page {pagination.page} of {pagination.totalPages || 1}</span><button type="button" onClick={() => update("page", pagination.page + 1)} disabled={loading || pagination.page >= pagination.totalPages} className="rounded border px-3 py-1 disabled:opacity-50">Next</button></div>
  </div></PageLayout>;
};
export default JobOpenings;
