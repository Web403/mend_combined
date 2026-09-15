import { useCallback, useEffect, useState } from "react";
import PageLayout from "../../../components/PageLayout";
import { evaluateCompliance, getComplianceReport } from "../../../api/services/compliance";

const formatDate = (value) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date)
    : "Not evaluated";
};

const scoreColor = (score) => score >= 80 ? "text-green-600" : score >= 50 ? "text-amber-600" : "text-red-600";

const ComplianceScore = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState("");
  const [windowDays, setWindowDays] = useState(30);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await getComplianceReport();
      setReport(response.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to fetch the compliance report.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const evaluate = async () => {
    try {
      setEvaluating(true);
      setError("");
      const response = await evaluateCompliance({ windowDays });
      setReport(response.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to evaluate compliance.");
    } finally {
      setEvaluating(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchReport, 0);
    return () => clearTimeout(timer);
  }, [fetchReport]);

  const metrics = [
    ["Attendance", report?.breakdown?.attendanceScore],
    ["Wellbeing", report?.breakdown?.wellbeingScore],
    ["Fatigue", report?.breakdown?.fatigueScore],
    ["Efficiency", report?.breakdown?.efficiencyScore],
  ];

  return (
    <PageLayout title="Compliance Score" description="Monitor compliance score and status.">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-end gap-3"><label className="text-sm text-slate-600">Evaluation window<select value={windowDays} onChange={(event) => setWindowDays(Number(event.target.value))} disabled={evaluating} className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"><option value={7}>7 days</option><option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option></select></label><button type="button" onClick={evaluate} disabled={loading || evaluating} className="rounded-lg bg-[#1A2F5E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#152549] disabled:cursor-not-allowed disabled:opacity-60">{evaluating ? "Evaluating..." : "Evaluate compliance"}</button><button type="button" onClick={fetchReport} disabled={loading || evaluating} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Loading..." : "Refresh"}</button></div>
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {loading ? <div className="flex h-72 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500">Loading compliance report...</div>
          : report && <><div className="grid gap-5 lg:grid-cols-3"><div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-8"><p className="text-sm font-medium text-slate-500">Overall compliance score</p><p className={`mt-2 text-6xl font-bold ${scoreColor(report.complianceScore || 0)}`}>{report.complianceScore ?? 0}</p><p className="mt-1 text-slate-500">out of 100</p></div><div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2"><p className="text-sm font-medium text-slate-500">Certification level</p><p className="mt-1 text-2xl font-bold text-slate-900">{report.certificationLevel || "NONE"}</p><dl className="mt-6 grid gap-4 sm:grid-cols-3"><div><dt className="text-sm text-slate-500">Evaluation window</dt><dd className="mt-1 font-semibold text-slate-800">{report.windowDays ?? 30} days</dd></div><div><dt className="text-sm text-slate-500">Shift count</dt><dd className="mt-1 font-semibold text-slate-800">{report.shiftCount ?? 0}</dd></div><div><dt className="text-sm text-slate-500">HES violations</dt><dd className="mt-1 font-semibold text-slate-800">{report.hesViolationCount ?? 0}</dd></div></dl><p className="mt-6 text-sm text-slate-500">Last evaluated: {formatDate(report.lastEvaluatedAt)}</p></div></div><div className="rounded-xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-semibold text-slate-800">Score breakdown</h2><div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label, score]) => <div key={label}><div className="flex justify-between text-sm"><span className="text-slate-600">{label}</span><span className="font-semibold text-slate-800">{score ?? 0}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#1A2F5E]" style={{ width: `${Math.max(0, Math.min(100, score || 0))}%` }} /></div></div>)}</div></div></>}
      </div>
    </PageLayout>
  );
};

export default ComplianceScore;
