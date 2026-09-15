import { useCallback, useEffect, useMemo, useState } from "react";
import PageLayout from "../../../components/PageLayout";
import { getEmployees } from "../../../api/services/employees";
import {
  createShift,
  deleteShift,
  getAllShifts,
  updateShift,
} from "../../../api/services/shifts";

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
};

const formatDuration = (startTime, endTime) => {
  const duration = new Date(endTime) - new Date(startTime);
  if (!Number.isFinite(duration) || duration < 0) return "-";

  const totalMinutes = Math.round(duration / 60000);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
};

const getEmployeeName = (employee) => {
  if (typeof employee === "string") return employee;

  const firstName = employee?.profile?.firstName || "";
  const lastName = employee?.profile?.lastName || "";
  return `${firstName} ${lastName}`.trim() || employee?.id || employee?._id || "Unknown employee";
};

const emptyForm = {
  startTime: "",
  endTime: "",
  employees: "",
};

const Shifts = () => {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [formState, setFormState] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchShifts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAllShifts();
      setShifts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to fetch shifts.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await getEmployees({ page: 1, limit: 500 });
      const employeeList = Array.isArray(response?.data) ? response.data : [];
      setEmployees(employeeList);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchShifts();
      fetchEmployees();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchEmployees, fetchShifts]);

  const actionMessage = useMemo(() => error, [error]);

  const openCreateModal = () => {
    setEditingShift(null);
    setFormState(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (shift) => {
    setEditingShift(shift);
    setFormState({
      startTime: shift.startTime ? new Date(shift.startTime).toISOString().slice(0, 16) : "",
      endTime: shift.endTime ? new Date(shift.endTime).toISOString().slice(0, 16) : "",
      employees: Array.isArray(shift.employees)
        ? shift.employees.map((employee) => employee?.id || employee?._id || employee).join(", ")
        : "",
    });
    setIsModalOpen(true);
  };

  const selectedEmployeeIds = useMemo(() => {
    return formState.employees
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [formState.employees]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingShift(null);
    setFormState(emptyForm);
  };

  const onFieldChange = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const submitShift = async (event) => {
    event.preventDefault();

    const employeeIds = selectedEmployeeIds;

    const payload = {
      startTime: formState.startTime ? new Date(formState.startTime).toISOString() : undefined,
      endTime: formState.endTime ? new Date(formState.endTime).toISOString() : undefined,
      employees: employeeIds,
    };

    try {
      setSubmitting(true);
      setError("");

      if (editingShift) {
        const response = await updateShift(editingShift.id || editingShift._id, payload);
        const updatedShift = response.data;
        setShifts((prev) => prev.map((item) => (item.id || item._id) === (updatedShift?.id || updatedShift?._id) ? updatedShift : item));
      } else {
        const response = await createShift(payload);
        const createdShift = response.data;
        setShifts((prev) => [createdShift, ...prev]);
      }

      closeModal();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save shift.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (shift) => {
    const shiftId = shift.id || shift._id;

    if (!window.confirm(`Delete shift ${shift.id || shift._id}?`)) {
      return;
    }

    try {
      setError("");
      await deleteShift(shiftId);
      setShifts((prev) => prev.filter((item) => (item.id || item._id) !== shiftId));
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to delete shift.");
    }
  };

  return (
    <PageLayout
      title="Shifts"
      description="Manage employee shifts and schedules."
    >
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            All scheduled shifts for your hotel.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-lg bg-[#1A2F5E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#152549]"
            >
              Add Shift
            </button>
            <button
              type="button"
              onClick={fetchShifts}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {actionMessage && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionMessage}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-5 py-4 font-semibold">Shift ID</th>
                  <th className="px-5 py-4 font-semibold">Start time</th>
                  <th className="px-5 py-4 font-semibold">End time</th>
                  <th className="px-5 py-4 font-semibold">Duration</th>
                  <th className="px-5 py-4 font-semibold">Assigned employees</th>
                  <th className="px-5 py-4 font-semibold">Attendance</th>
                  <th className="px-5 py-4 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {loading ? (
                  <tr><td colSpan="7" className="px-5 py-16 text-center">Loading shifts...</td></tr>
                ) : shifts.length === 0 ? (
                  <tr><td colSpan="7" className="px-5 py-16 text-center">No shifts found.</td></tr>
                ) : shifts.map((shift) => {
                  const employees = Array.isArray(shift.employees) ? shift.employees : [];

                  return (
                    <tr key={shift.id || shift._id} className="align-top hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-800">{shift.id || shift._id}</td>
                      <td className="px-5 py-4 whitespace-nowrap">{formatDateTime(shift.startTime)}</td>
                      <td className="px-5 py-4 whitespace-nowrap">{formatDateTime(shift.endTime)}</td>
                      <td className="px-5 py-4 whitespace-nowrap">{formatDuration(shift.startTime, shift.endTime)}</td>
                      <td className="px-5 py-4">
                        {employees.length ? (
                          <div className="flex max-w-xs flex-wrap gap-1.5">
                            {employees.map((employee, index) => (
                              <span key={employee?.id || employee?._id || `${shift.id}-${index}`} className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                                {getEmployeeName(employee)}
                              </span>
                            ))}
                          </div>
                        ) : "Unassigned"}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${shift.actualAttendanceId ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"}`}>
                          {shift.actualAttendanceId ? "Recorded" : "Not recorded"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(shift)}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-yellow-700 hover:bg-yellow-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(shift)}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">
                  {editingShift ? "Edit Shift" : "Add Shift"}
                </h3>
                <p className="text-sm text-slate-500">
                  Add the shift timing and assigned employee IDs.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600"
              >
                Close
              </button>
            </div>

            <form onSubmit={submitShift} className="space-y-4">
              <label className="block space-y-1 text-sm text-slate-600">
                <span>Start time</span>
                <input
                  type="datetime-local"
                  value={formState.startTime}
                  onChange={(event) => onFieldChange("startTime", event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  required
                />
              </label>

              <label className="block space-y-1 text-sm text-slate-600">
                <span>End time</span>
                <input
                  type="datetime-local"
                  value={formState.endTime}
                  onChange={(event) => onFieldChange("endTime", event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  required
                />
              </label>

              <label className="block space-y-1 text-sm text-slate-600">
                <span>Assigned employees</span>
                <select
                  multiple
                  value={selectedEmployeeIds}
                  onChange={(event) => {
                    const values = Array.from(event.target.selectedOptions, (option) => option.value);
                    onFieldChange("employees", values.join(", "));
                  }}
                  className="min-h-44 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                >
                  {employees.map((employee) => {
                    const employeeId =employee?._id || employee?.id || employee?.email || employee?.phone || employee?.profile?.firstName || employee?.profile?.lastName || "Unknown";
                    const fullName = `${employee?.profile?.firstName || ""} ${employee?.profile?.lastName || ""}`.trim();

                    return (
                      <option key={employeeId} value={employeeId}>
                        {fullName || employee?.email || employeeId}
                      </option>
                    );
                  })}
                </select>
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#1A2F5E] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Saving..." : editingShift ? "Update Shift" : "Create Shift"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Shifts;
