import { useCallback, useEffect, useState } from "react";
import PageLayout from "../../../components/PageLayout";
import { getEmployeesWithAttendance } from "../../../api/services/attendance";

const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
};

const formatDuration = (minutes) => {
  if (!Number.isFinite(minutes)) return "—";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

const Attendance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getEmployeesWithAttendance();
      setRecords(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err?.response?.data?.message || "Unable to fetch attendance records."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchAttendance, 0);
    return () => clearTimeout(timer);
  }, [fetchAttendance]);

  return (
    <PageLayout
      title="Attendance"
      description="View attendance records and check-in history."
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Latest clock-in record for each employee.
          </p>
          <button
            type="button"
            onClick={fetchAttendance}
            disabled={loading}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-5 py-4 font-semibold">Employee ID</th>
                  <th className="px-5 py-4 font-semibold">Clock in</th>
                  <th className="px-5 py-4 font-semibold">Clock out</th>
                  <th className="px-5 py-4 font-semibold">Work duration</th>
                  <th className="px-5 py-4 font-semibold">Location</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-16 text-center">Loading attendance records...</td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-16 text-center">No attendance records found.</td>
                  </tr>
                ) : records.map((record) => {
                  const hasViolation = record.violationFlags?.exceeds10Hours
                    || record.violationFlags?.insufficientRecovery;
                  const duration = record.workDurationMinutes ?? (
                    record.clockOut
                      ? Math.round((new Date(record.clockOut) - new Date(record.clockIn)) / 60000)
                      : undefined
                  );

                  return (
                    <tr key={record.id || record._id || record.userId} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-800">{record.userId || "—"}</td>
                      <td className="px-5 py-4">{formatDateTime(record.clockIn)}</td>
                      <td className="px-5 py-4">{formatDateTime(record.clockOut)}</td>
                      <td className="px-5 py-4">{formatDuration(duration)}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${record.geoValidated ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                          {record.geoValidated ? "Validated" : "Not validated"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${hasViolation ? "bg-red-100 text-red-700" : record.clockOut ? "bg-slate-100 text-slate-700" : "bg-blue-100 text-blue-700"}`}>
                          {hasViolation ? "Review needed" : record.clockOut ? "Clocked out" : "Clocked in"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Attendance;
