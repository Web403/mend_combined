export default function EmployeeFilters({
  filters,

  onStatusChange,
  onProfessionChange,
  onAvailabilityChange,
  onExperienceChange,

  onSortByChange,
  onSortOrderChange,

  onReset,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-slate-600" aria-hidden="true">⚙</span>

          <h2 className="text-sm font-semibold text-slate-700">
            Filters
          </h2>
        </div>

        <button
          onClick={onReset}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
        >
          <span aria-hidden="true">↺</span>

          Reset
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        {/* Status */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Status
          </label>

          <select
            value={filters.status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
        </div>

        {/* Profession */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Profession
          </label>

          <select
            value={filters.profession}
            onChange={(e) => onProfessionChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All</option>

            <option value="CHEF">Chef</option>
            <option value="WAITER">Waiter</option>
            <option value="MANAGER">Manager</option>
            <option value="CASHIER">Cashier</option>
            <option value="RECEPTIONIST">Receptionist</option>
            <option value="HOUSEKEEPING">Housekeeping</option>
          </select>
        </div>

        {/* Availability */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Availability
          </label>

          <select
            value={filters.availability}
            onChange={(e) => onAvailabilityChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All</option>

            <option value="AVAILABLE">Available</option>
            <option value="BUSY">Busy</option>
            <option value="ON_LEAVE">On Leave</option>
          </select>
        </div>

        {/* Experience */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Experience
          </label>

          <select
            value={filters.yearsOfExperience}
            onChange={(e) => onExperienceChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All</option>

            <option value="LESS_THAN_ONE_YEAR">
              Less than 1 Year
            </option>

            <option value="ONE_TO_THREE_YEARS">
              1 - 3 Years
            </option>

            <option value="THREE_TO_FIVE_YEARS">
              3 - 5 Years
            </option>

            <option value="FIVE_TO_TEN_YEARS">
              5 - 10 Years
            </option>

            <option value="MORE_THAN_TEN_YEARS">
              10+ Years
            </option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Sort By
          </label>

          <select
            value={filters.sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="createdAt">Created Date</option>

            <option value="profile.firstName">First Name</option>

            <option value="profile.lastName">Last Name</option>

            <option value="profession">Profession</option>

            <option value="status">Status</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Sort Order
          </label>

          <select
            value={filters.sortOrder}
            onChange={(e) => onSortOrderChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="asc">Ascending</option>

            <option value="desc">Descending</option>
          </select>
        </div>
      </div>
    </div>
  );
}
