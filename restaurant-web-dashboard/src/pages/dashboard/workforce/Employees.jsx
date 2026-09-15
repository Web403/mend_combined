import { useMemo, useState } from "react";
import PageLayout from "../../../components/PageLayout";
import EmployeeFilters from "../../../components/employees/EmployeeFilters";
import EmployeeTable from "../../../components/employees/EmployeeTable";
import EmployeeToolbar from "../../../components/employees/EmployeeToolbar";
import useEmployeeActions from "../../../hooks/employee/useEmployeeActions";
import useEmployeeFilters from "../../../hooks/employee/useEmployeeFilters";
import useEmployees from "../../../hooks/employee/useEmployees";

const formatCount = (count) => `${count.toLocaleString()} employee${count === 1 ? "" : "s"}`;

const ROLE_OPTIONS = ["ADMIN", "MANAGER", "EMPLOYEE", "STUDENT", "PROFESSIONAL", "HR"];
const PROFESSION_OPTIONS = ["Captain", "Chef", "Waiter", "Bartender", "Hostess", "Management", "Student", "Other"];
const AVAILABILITY_OPTIONS = ["Weekdays", "Weekends", "Both weekdays & weekends", "Flexible / Any time"];
const EXPERIENCE_OPTIONS = ["Less than 1 year", "1–2 years", "3–5 years", "5–10 years", "10+ years"];
const DEPARTMENT_TYPE_OPTIONS = ["FRONT_OFFICE", "HOUSEKEEPING", "FOOD_AND_BEVERAGE", "KITCHEN", "ENGINEERING_AND_MAINTENANCE", "SECURITY", "HUMAN_RESOURCES", "FINANCE_AND_ACCOUNTS", "SALES_AND_MARKETING", "IT"];
const DEPARTMENT_ROLE_OPTIONS = ["FRONT_OFFICE_MANAGER", "DUTY_MANAGER", "RECEPTIONIST", "GUEST_RELATIONS_EXECUTIVE", "CONCIERGE", "BELLBOY", "HOUSEKEEPING_MANAGER", "HOUSEKEEPING_SUPERVISOR", "ROOM_ATTENDANT", "LAUNDRY_ATTENDANT", "PUBLIC_AREA_ATTENDANT", "FNB_MANAGER", "RESTAURANT_MANAGER", "CAPTAIN", "WAITER", "BARTENDER", "BANQUET_EXECUTIVE", "EXECUTIVE_CHEF", "SOUS_CHEF", "CHEF_DE_PARTIE", "COMMIS_CHEF", "BAKERY_CHEF", "PASTRY_CHEF", "ENGINEERING_MANAGER", "MAINTENANCE_SUPERVISOR", "ELECTRICIAN", "PLUMBER", "HVAC_TECHNICIAN", "SECURITY_MANAGER", "SECURITY_SUPERVISOR", "SECURITY_OFFICER", "SECURITY_GUARD", "HR_MANAGER", "HR_EXECUTIVE", "RECRUITER", "TRAINING_COORDINATOR", "FINANCE_MANAGER", "ACCOUNTANT", "AUDITOR", "CASHIER", "SALES_MANAGER", "SALES_EXECUTIVE", "CORPORATE_SALES_EXECUTIVE", "MARKETING_EXECUTIVE", "IT_MANAGER", "SYSTEM_ADMINISTRATOR", "NETWORK_ENGINEER", "IT_SUPPORT_EXECUTIVE"];
const ID_TYPE_OPTIONS = ["Aadhar Card", "PAN Card", "Passport", "Driving License"];
const GENDER_OPTIONS = ["MALE", "FEMALE", "OTHER"];

const emptyForm = {
  email: "",
  role: "EMPLOYEE",
  phone: "",
  whatsappNumber: "",
  profession: "",
  availability: "",
  yearsOfExperience: "",
  departmentType: "",
  departmentRole: "",
  idType: "",
  idNumber: "",
  profile: {
    firstName: "",
    lastName: "",
    dob: "",
    gender: "",
    department: "",
  },
};

const Employees = () => {
  const {
    filters,
    query,
    updateFilter,
    changePage,
    resetFilters,
  } = useEmployeeFilters();

  const {
    employees,
    pagination,
    loading,
    error,
    refreshEmployees,
    addEmployee,
    updateEmployee,
    removeEmployee,
  } = useEmployees(query);

  const {
    create,
    update,
    suspend,
    remove,
    loading: actionLoading,
    error: actionError,
  } = useEmployeeActions({
    addEmployee,
    updateEmployeeState: updateEmployee,
    removeEmployee,
    refreshEmployees,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formState, setFormState] = useState(emptyForm);

  const start = pagination.total === 0
    ? 0
    : (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  const actionMessage = useMemo(() => actionError || error, [actionError, error]);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setFormState(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (employee) => {
    setEditingEmployee(employee);
    setFormState({
      email: employee.email || "",
      role: employee.role || "EMPLOYEE",
      phone: employee.phone || "",
      whatsappNumber: employee.whatsappNumber || "",
      profession: employee.profession || "",
      availability: employee.availability || "",
      yearsOfExperience: employee.yearsOfExperience || "",
      departmentType: employee.departmentType || "",
      departmentRole: employee.departmentRole || "",
      idType: employee.idType || "",
      idNumber: employee.idNumber || "",
      profile: {
        firstName: employee.profile?.firstName || "",
        lastName: employee.profile?.lastName || "",
        dob: employee.profile?.dob ? new Date(employee.profile.dob).toISOString().slice(0, 10) : "",
        gender: employee.profile?.gender || "",
        department: employee.profile?.department || "",
      },
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormState(emptyForm);
  };

  const onFieldChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const onProfileFieldChange = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      ...formState,
      profile: {
        firstName: formState.profile.firstName.trim(),
        lastName: formState.profile.lastName.trim(),
        dob: formState.profile.dob || undefined,
        gender: formState.profile.gender || undefined,
        department: formState.profile.department || undefined,
      },
      yearsOfExperience: formState.yearsOfExperience || undefined,
      phone: formState.phone || undefined,
      whatsappNumber: formState.whatsappNumber || undefined,
      role: formState.role || "EMPLOYEE",
      profession: formState.profession || undefined,
      availability: formState.availability || undefined,
      departmentType: formState.departmentType || undefined,
      departmentRole: formState.departmentRole || undefined,
      idType: formState.idType || undefined,
      idNumber: formState.idNumber || undefined,
    };

    try {
      if (editingEmployee) {
        const employeeId = editingEmployee.id || editingEmployee._id;
        await update(employeeId, payload);
      } else {
        await create(payload);
      }

      closeModal();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (employee) => {
    const employeeId = employee.id || employee._id;

    if (!window.confirm(`Delete ${employee.profile?.firstName || employee.email}?`)) {
      return;
    }

    await remove(employeeId);
  };

  const handleSuspend = async (employee) => {
    const employeeId = employee.id || employee._id;

    if (!window.confirm(`Suspend ${employee.profile?.firstName || employee.email}?`)) {
      return;
    }

    await suspend(employeeId);
  };

  return (
    <PageLayout
      title="Employees"
      description="Manage all employees, profiles, attendance and status."
    >
      <div className="space-y-5">
        <EmployeeToolbar
          filters={filters}
          onSearch={(value) => updateFilter("search", value)}
          onAdd={openCreateModal}
          onRefresh={refreshEmployees}
          loading={loading || actionLoading}
        />

        <EmployeeFilters
          filters={filters}
          onStatusChange={(value) => updateFilter("status", value)}
          onProfessionChange={(value) => updateFilter("profession", value)}
          onAvailabilityChange={(value) => updateFilter("availability", value)}
          onExperienceChange={(value) => updateFilter("yearsOfExperience", value)}
          onSortByChange={(value) => updateFilter("sortBy", value)}
          onSortOrderChange={(value) => updateFilter("sortOrder", value)}
          onReset={resetFilters}
        />

        {actionMessage && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {actionMessage}
          </div>
        )}

        <EmployeeTable
          employees={employees}
          loading={loading}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onSuspend={handleSuspend}
        />

        <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Showing {start}-{end} of {formatCount(pagination.total)}
          </p>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <span>Rows</span>
              <select
                value={filters.limit}
                onChange={(event) => updateFilter("limit", Number(event.target.value))}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 outline-none focus:border-blue-500"
              >
                {[10, 25, 50, 100].map((limit) => (
                  <option key={limit} value={limit}>{limit}</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={() => changePage(pagination.page - 1)}
              disabled={loading || pagination.page <= 1}
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span>Page {pagination.page} of {pagination.totalPages || 1}</span>
            <button
              type="button"
              onClick={() => changePage(pagination.page + 1)}
              disabled={loading || pagination.page >= pagination.totalPages}
              className="rounded-md border border-slate-300 px-3 py-1.5 font-medium transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-800">
                  {editingEmployee ? "Edit Employee" : "Add Employee"}
                </h3>
                <p className="text-sm text-slate-500">
                  Fill in the employee details and save.
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm text-slate-600">
                  <span>First name</span>
                  <input
                    value={formState.profile.firstName}
                    onChange={(event) => onProfileFieldChange("firstName", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span>Last name</span>
                  <input
                    value={formState.profile.lastName}
                    onChange={(event) => onProfileFieldChange("lastName", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span>Email</span>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(event) => onFieldChange("email", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span>Role</span>
                  <select
                    value={formState.role}
                    onChange={(event) => onFieldChange("role", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  >
                    <option value="">Select role</option>
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span>Phone</span>
                  <input
                    value={formState.phone}
                    onChange={(event) => onFieldChange("phone", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span>WhatsApp</span>
                  <input
                    value={formState.whatsappNumber}
                    onChange={(event) => onFieldChange("whatsappNumber", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span>Profession</span>
                  <select
                    value={formState.profession}
                    onChange={(event) => onFieldChange("profession", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  >
                    <option value="">Select profession</option>
                    {PROFESSION_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span>Availability</span>
                  <select
                    value={formState.availability}
                    onChange={(event) => onFieldChange("availability", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  >
                    <option value="">Select availability</option>
                    {AVAILABILITY_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span>Experience</span>
                  <select
                    value={formState.yearsOfExperience}
                    onChange={(event) => onFieldChange("yearsOfExperience", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  >
                    <option value="">Select experience</option>
                    {EXPERIENCE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span>Department type</span>
                  <select
                    value={formState.departmentType}
                    onChange={(event) => onFieldChange("departmentType", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  >
                    <option value="">Select department type</option>
                    {DEPARTMENT_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span>Department role</span>
                  <select
                    value={formState.departmentRole}
                    onChange={(event) => onFieldChange("departmentRole", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  >
                    <option value="">Select department role</option>
                    {DEPARTMENT_ROLE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span>ID type</span>
                  <select
                    value={formState.idType}
                    onChange={(event) => onFieldChange("idType", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  >
                    <option value="">Select ID type</option>
                    {ID_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span>ID number</span>
                  <input
                    value={formState.idNumber}
                    onChange={(event) => onFieldChange("idNumber", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span>Date of birth</span>
                  <input
                    type="date"
                    value={formState.profile.dob}
                    onChange={(event) => onProfileFieldChange("dob", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span>Gender</span>
                  <select
                    value={formState.profile.gender}
                    onChange={(event) => onProfileFieldChange("gender", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  >
                    <option value="">Select gender</option>
                    {GENDER_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1 text-sm text-slate-600 md:col-span-2">
                  <span>Department</span>
                  <input
                    value={formState.profile.department}
                    onChange={(event) => onProfileFieldChange("department", event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  />
                </label>
              </div>

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
                  disabled={actionLoading}
                  className="rounded-lg bg-[#1A2F5E] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? "Saving..." : editingEmployee ? "Update Employee" : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageLayout>
  );
};

export default Employees;
