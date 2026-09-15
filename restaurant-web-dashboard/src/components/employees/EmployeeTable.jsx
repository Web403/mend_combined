export default function EmployeeTable({
  employees = [],
  loading = false,

  onView,
  onEdit,
  onSuspend,
  onDelete,
}) {
  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="animate-spin" aria-hidden="true">↻</span>
          <span>Loading employees...</span>
        </div>
      </div>
    );
  }

  if (!employees.length) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-slate-200 bg-white">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-700">
            No Employees Found
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Try changing filters or add a new employee.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-slate-100">
            <tr className="text-left text-sm font-semibold text-slate-700">
              <th className="px-6 py-4">Employee</th>

              <th className="px-6 py-4">Email</th>

              <th className="px-6 py-4">Profession</th>

              <th className="px-6 py-4">Experience</th>

              <th className="px-6 py-4">Availability</th>

              <th className="px-6 py-4">Status</th>

              <th className="px-6 py-4 text-center">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {employees.map((employee) => (
              <tr
                key={employee.id || employee._id}
                className="hover:bg-slate-50 transition"
              >
                <td className="px-6 py-4">
                  <div>
                    <h4 className="font-medium text-slate-800">
                      {employee.profile?.firstName || "-"} {employee.profile?.lastName || ""}
                    </h4>

                    <p className="text-xs text-slate-500">
                      {employee.phone || "-"}
                    </p>
                  </div>
                </td>

                <td className="px-6 py-4 text-sm text-slate-600">
                  {employee.email}
                </td>

                <td className="px-6 py-4 text-sm">
                  {employee.profession}
                </td>

                <td className="px-6 py-4 text-sm">
                  {employee.yearsOfExperience}
                </td>

                <td className="px-6 py-4">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    {employee.availability}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold
                    ${
                      employee.status === "ACTIVE"
                        ? "bg-green-100 text-green-700"
                        : employee.status === "INACTIVE"
                        ? "bg-gray-100 text-gray-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {employee.status}
                  </span>
                </td>

                <td className="px-6 py-4">
                  {(onView || onEdit || onSuspend || onDelete) && (
                    <div className="flex items-center justify-center gap-2">
                    {onView && (
                    <button
                      onClick={() => onView(employee)}
                      className="rounded-lg p-2 hover:bg-blue-50"
                    >
                      <span className="text-blue-600" aria-hidden="true">View</span>
                    </button>
                    )}

                    {onEdit && (
                    <button
                      onClick={() => onEdit(employee)}
                      className="rounded-lg p-2 hover:bg-yellow-50"
                    >
                      <span className="text-yellow-600" aria-hidden="true">Edit</span>
                    </button>
                    )}

                    {onSuspend && (
                    <button
                      onClick={() => onSuspend(employee)}
                      className="rounded-lg p-2 hover:bg-orange-50"
                    >
                      <span className="text-orange-600" aria-hidden="true">Suspend</span>
                    </button>
                    )}

                    {onDelete && (
                    <button
                      onClick={() => onDelete(employee)}
                      className="rounded-lg p-2 hover:bg-red-50"
                    >
                      <span className="text-red-600" aria-hidden="true">Delete</span>
                    </button>
                    )}
                  </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
