import { useCallback, useEffect, useMemo, useState } from "react"
import {
  bulkUploadHotelUsers,
  createHotel,
  createHotelUsers,
  deleteHotel,
  getHotelAnalytics,
  getHotelProfile,
  getHotels,
  promoteHotelUser,
  updateHotel,
  updateHotelStatus,
  updateHotelSubscription,
} from "../api/hotels"
import { sendCredentials } from "../api/credentials"
import ConfirmModal from "../components/ConfirmModal"

const PAIN_POINT_OPTIONS = [
  "Staff Attrition",
  "Service Quality",
  "Operational Efficiency",
  "Hiring Delays",
  "Other",
]
const PROPERTY_TYPE_OPTIONS = ["Luxury Hotel", "Boutique Hotel", "Resort", "Banquet / Event Venue", "Restaurant / F&B", "Other"]
const MONTHLY_EVENTS_OPTIONS = ["1–5 events/month", "5–15 events/month", "15–30 events/month", "Daily operations"]
const PLAN_OPTIONS = ["FREE", "BASIC", "PREMIUM", "ENTERPRISE"]
const STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "EXPIRED", "CANCELLED"]
const HOTEL_USER_ROLE_OPTIONS = ["ADMIN", "MANAGER", "EMPLOYEE", "STUDENT", "PROFESSIONAL"]
const DEPARTMENT_TYPE_OPTIONS = [
  "FRONT_OFFICE",
  "HOUSEKEEPING",
  "FOOD_AND_BEVERAGE",
  "KITCHEN",
  "ENGINEERING_AND_MAINTENANCE",
  "SECURITY",
  "HUMAN_RESOURCES",
  "FINANCE_AND_ACCOUNTS",
  "SALES_AND_MARKETING",
  "IT",
]
const DEPARTMENT_ROLE_OPTIONS = [
  "FRONT_OFFICE_MANAGER",
  "DUTY_MANAGER",
  "RECEPTIONIST",
  "GUEST_RELATIONS_EXECUTIVE",
  "CONCIERGE",
  "BELLBOY",
  "HOUSEKEEPING_MANAGER",
  "HOUSEKEEPING_SUPERVISOR",
  "ROOM_ATTENDANT",
  "LAUNDRY_ATTENDANT",
  "PUBLIC_AREA_ATTENDANT",
  "FNB_MANAGER",
  "RESTAURANT_MANAGER",
  "CAPTAIN",
  "WAITER",
  "BARTENDER",
  "BANQUET_EXECUTIVE",
  "EXECUTIVE_CHEF",
  "SOUS_CHEF",
  "CHEF_DE_PARTIE",
  "COMMIS_CHEF",
  "BAKERY_CHEF",
  "PASTRY_CHEF",
  "ENGINEERING_MANAGER",
  "MAINTENANCE_SUPERVISOR",
  "ELECTRICIAN",
  "PLUMBER",
  "HVAC_TECHNICIAN",
  "SECURITY_MANAGER",
  "SECURITY_SUPERVISOR",
  "SECURITY_OFFICER",
  "SECURITY_GUARD",
  "HR_MANAGER",
  "HR_EXECUTIVE",
  "RECRUITER",
  "TRAINING_COORDINATOR",
  "FINANCE_MANAGER",
  "ACCOUNTANT",
  "AUDITOR",
  "CASHIER",
  "SALES_MANAGER",
  "SALES_EXECUTIVE",
  "CORPORATE_SALES_EXECUTIVE",
  "MARKETING_EXECUTIVE",
  "IT_MANAGER",
  "SYSTEM_ADMINISTRATOR",
  "NETWORK_ENGINEER",
  "IT_SUPPORT_EXECUTIVE",
]
const AVATAR_PALETTES = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-sky-100 text-sky-700",
  "bg-orange-100 text-orange-700",
]

const SEL = "text-xs px-2.5 py-1.5 pr-7 border border-slate-200 rounded-lg bg-white text-slate-600 cursor-pointer outline-none focus:border-blue-300 appearance-none"
const INPUT = "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition"

function avatarClass(id = "") {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % AVATAR_PALETTES.length
  return AVATAR_PALETTES[hash]
}

function getInitials(name = "") {
  return name.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase()
}

function formatValue(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback
  if (typeof value === "number") return value.toLocaleString("en-IN")
  return value
}

function formatDate(value) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
}

function compactObject(value) {
  if (Array.isArray(value)) {
    return value.map(compactObject).filter((item) => item !== undefined)
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, item]) => [key, compactObject(item)])
      .filter(([, item]) => item !== undefined)
    return entries.length ? Object.fromEntries(entries) : undefined
  }

  return value === "" || value === null || value === undefined ? undefined : value
}

function getInitialHotelForm(hotel) {
  return {
    name: hotel?.name || "",
    contactPersonName: hotel?.contactPersonName || "",
    email: hotel?.email || "",
    phoneNumber: hotel?.phoneNumber || "",
    primaryPainPoint: hotel?.primaryPainPoint || "Staff Attrition",
    propertyType: hotel?.propertyType || "Luxury Hotel",
    monthlyEvents: hotel?.monthlyEvents || "Daily operations",
    staffStrength: hotel?.staffStrength?.toString() || "",
    address: hotel?.location?.address || "",
    city: hotel?.location?.city || "",
    state: hotel?.location?.state || "",
    country: hotel?.location?.country || "India",
    pincode: hotel?.location?.pincode?.toString() || "",
    lat: hotel?.location?.codePointAttr?.lat?.toString() || "",
    lng: hotel?.location?.codePointAttr?.lng?.toString() || "",
    subscriptionPlan: hotel?.subscriptionPlan || "FREE",
    subscriptionStatus: hotel?.subscriptionStatus || "ACTIVE",
  }
}

function buildHotelPayload(form) {
  return compactObject({
    name: form.name.trim(),
    contactPersonName: form.contactPersonName.trim(),
    email: form.email.trim(),
    phoneNumber: form.phoneNumber.trim(),
    primaryPainPoint: form.primaryPainPoint,
    propertyType: form.propertyType,
    monthlyEvents: form.monthlyEvents,
    staffStrength: form.staffStrength === "" ? undefined : Number(form.staffStrength),
    location: {
      address: form.address.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      country: form.country.trim(),
      pincode: form.pincode === "" ? undefined : Number(form.pincode),
      codePointAttr: {
        lat: form.lat === "" ? undefined : Number(form.lat),
        lng: form.lng === "" ? undefined : Number(form.lng),
      },
    },
    subscriptionPlan: form.subscriptionPlan,
    subscriptionStatus: form.subscriptionStatus,
  }) || {}
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${tones[tone]}`}>
      {children}
    </span>
  )
}

function SortIcon({ col, sortBy, sortOrder }) {
  if (sortBy !== col) return <span className="ml-1 opacity-30 text-[10px]">+-</span>
  return <span className="ml-1 text-[10px] text-blue-500">{sortOrder === "asc" ? "ASC" : "DESC"}</span>
}

function PageBtn({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[32px] h-8 px-2 text-xs rounded-lg border transition font-medium ${
        active
          ? "border-blue-400 bg-blue-50 text-blue-600"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
      }`}
    >
      {children}
    </button>
  )
}

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`fixed top-5 right-5 z-[70] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
      {toast.message}
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-slate-800 break-words">{formatValue(value)}</p>
    </div>
  )
}

function UserOperationResult({ result }) {
  if (!result) return null

  const items = Array.isArray(result.data) ? result.data : result.data ? [result.data] : []
  const successCount = items.filter((item) => item?.success !== false).length
  const failureCount = items.filter((item) => item?.success === false).length

  return (
    <div className="mt-4 border border-slate-200 rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-700">{result.message || "Operation completed"}</p>
      {items.length > 0 ? (
        <p className="text-xs text-slate-500 mt-1">
          {successCount} succeeded, {failureCount} failed
        </p>
      ) : null}
      {items.slice(0, 4).map((item, index) => (
        <div key={index} className="mt-2 text-xs">
          <span className={item?.success === false ? "text-red-600 font-semibold" : "text-emerald-700 font-semibold"}>
            {item?.success === false ? "Failed" : "Success"}
          </span>
          <span className="text-slate-500">
            {" "}
            {item?.user?.email || item?.email || item?.data?.email || item?.error || item?.user?.id || item?.id || ""}
          </span>
        </div>
      ))}
    </div>
  )
}

function MetricCard({ label, value, sub }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{formatValue(value)}</p>
      {sub ? <p className="text-xs text-slate-500 mt-1">{sub}</p> : null}
    </div>
  )
}

function HotelFormModal({ open, mode, form, saving, onChange, onClose, onSubmit }) {
  if (!open) return null

  const title = mode === "edit" ? "Edit hotel" : "Create hotel"

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={!saving ? onClose : undefined} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto z-10">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hotel admin</p>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50 transition"
            aria-label="Close hotel form"
          >
            X
          </button>
        </div>

        <div className="p-6 space-y-5">
          <section>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Basic information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className={INPUT} placeholder="Hotel name" value={form.name} onChange={(e) => onChange("name", e.target.value)} />
              <input className={INPUT} placeholder="Contact person" value={form.contactPersonName} onChange={(e) => onChange("contactPersonName", e.target.value)} />
              <input className={INPUT} type="email" placeholder="Email" value={form.email} onChange={(e) => onChange("email", e.target.value)} />
              <input className={INPUT} placeholder="Phone number" value={form.phoneNumber} onChange={(e) => onChange("phoneNumber", e.target.value)} />
              <select className={`${SEL} w-full py-2 text-sm`} value={form.primaryPainPoint} onChange={(e) => onChange("primaryPainPoint", e.target.value)}>
                {PAIN_POINT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <select className={`${SEL} w-full py-2 text-sm`} value={form.propertyType} onChange={(e) => onChange("propertyType", e.target.value)}>
                {PROPERTY_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <select className={`${SEL} w-full py-2 text-sm`} value={form.monthlyEvents} onChange={(e) => onChange("monthlyEvents", e.target.value)}>
                {MONTHLY_EVENTS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <input className={INPUT} type="number" min="0" placeholder="Staff strength" value={form.staffStrength} onChange={(e) => onChange("staffStrength", e.target.value)} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input className={INPUT} placeholder="Address" value={form.address} onChange={(e) => onChange("address", e.target.value)} />
              <input className={INPUT} placeholder="City" value={form.city} onChange={(e) => onChange("city", e.target.value)} />
              <input className={INPUT} placeholder="State" value={form.state} onChange={(e) => onChange("state", e.target.value)} />
              <input className={INPUT} placeholder="Country" value={form.country} onChange={(e) => onChange("country", e.target.value)} />
              <input className={INPUT} type="number" min="0" placeholder="Pincode" value={form.pincode} onChange={(e) => onChange("pincode", e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input className={INPUT} type="number" step="any" placeholder="Lat" value={form.lat} onChange={(e) => onChange("lat", e.target.value)} />
                <input className={INPUT} type="number" step="any" placeholder="Lng" value={form.lng} onChange={(e) => onChange("lng", e.target.value)} />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Subscription</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select className={`${SEL} w-full py-2 text-sm`} value={form.subscriptionPlan} onChange={(e) => onChange("subscriptionPlan", e.target.value)}>
                {PLAN_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <select className={`${SEL} w-full py-2 text-sm`} value={form.subscriptionStatus} onChange={(e) => onChange("subscriptionStatus", e.target.value)}>
                {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </section>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={saving}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#1A2F5E] text-white hover:bg-[#152549] disabled:opacity-60 transition"
            >
              {saving ? "Saving..." : mode === "edit" ? "Save changes" : "Create hotel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function HotelDrawer({
  open,
  hotel,
  analytics,
  loading,
  error,
  subscriptionForm,
  hotelUserForm,
  bulkFile,
  promoteForm,
  userOperationResult,
  savingSubscription,
  updatingStatus,
  creatingHotelUser,
  uploadingBulkUsers,
  promotingHotelUser,
  onClose,
  onRetry,
  onSubscriptionChange,
  onHotelUserFormChange,
  onBulkFileChange,
  onPromoteFormChange,
  onSaveSubscription,
  onToggleStatus,
  onEditHotel,
  onDeleteHotel,
  onCreateHotelUser,
  onBulkUploadUsers,
  onPromoteHotelUser,
}) {
  if (!open) return null

  const attendance = analytics?.attendanceSummary ?? {}
  const activeTone = hotel?.isActive ? "emerald" : "red"
  const subscriptionTone = hotel?.subscriptionStatus === "ACTIVE" ? "blue" : "amber"

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside className="relative z-10 h-full w-full max-w-4xl bg-slate-50 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hotel profile</p>
            <h2 className="text-xl font-bold text-slate-900 mt-1">{hotel?.name || "Loading hotel..."}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge tone={activeTone}>{hotel?.isActive ? "Active" : "Inactive"}</Badge>
              <Badge tone={subscriptionTone}>{hotel?.subscriptionStatus || "No subscription"}</Badge>
              <Badge>{hotel?.subscriptionPlan || "No plan"}</Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
            aria-label="Close hotel profile"
          >
            X
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 flex items-center justify-center gap-2 text-sm text-slate-500">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-[#1A2F5E] rounded-full animate-spin" />
              Loading hotel profile...
            </div>
          )}

          {error && (
            <div className="flex items-center justify-between mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
              <button onClick={onRetry} className="text-xs px-2.5 py-1 border border-red-300 rounded-lg hover:bg-red-100 transition ml-3 shrink-0">
                Retry
              </button>
            </div>
          )}

          {!loading && hotel && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <MetricCard label="Compliance score" value={analytics?.complianceScore !== undefined ? `${analytics.complianceScore}%` : "-"} sub={analytics?.certificationStatus || "Certification pending"} />
                <MetricCard label="Employees" value={analytics?.employeeCount ?? hotel.staffStrength} sub={`${formatValue(analytics?.managerCount)} managers`} />
                <MetricCard label="Open jobs" value={analytics?.openJobs} sub={analytics?.hiringEligibility ? "Hiring eligible" : "Hiring not eligible"} />
              </div>

              <section className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">Hotel information</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={onEditHotel}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition"
                    >
                      Edit hotel
                    </button>
                    <button
                      onClick={onToggleStatus}
                      disabled={updatingStatus}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition disabled:opacity-50 ${
                        hotel.isActive
                          ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {updatingStatus ? "Updating..." : hotel.isActive ? "Deactivate hotel" : "Activate hotel"}
                    </button>
                    <button
                      onClick={onDeleteHotel}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition"
                    >
                      Delete hotel
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <DetailRow label="Contact person" value={hotel.contactPersonName} />
                  <DetailRow label="Email" value={hotel.email} />
                  <DetailRow label="Phone" value={hotel.phoneNumber} />
                  <DetailRow label="Property type" value={hotel.propertyType} />
                  <DetailRow label="Pain point" value={hotel.primaryPainPoint} />
                  <DetailRow label="Monthly events" value={hotel.monthlyEvents} />
                  <DetailRow label="Staff strength" value={hotel.staffStrength} />
                  <DetailRow label="Payment id" value={hotel.paymentId} />
                  <DetailRow label="Initial payment" value={hotel.initialPaymentDone ? "Done" : "Pending"} />
                  <DetailRow label="Address" value={hotel.location?.address} />
                  <DetailRow label="City" value={hotel.location?.city} />
                  <DetailRow label="State" value={hotel.location?.state} />
                  <DetailRow label="Country" value={hotel.location?.country} />
                  <DetailRow label="Pincode" value={hotel.location?.pincode} />
                  <DetailRow label="Coordinates" value={hotel.location?.codePointAttr ? `${hotel.location.codePointAttr.lat}, ${hotel.location.codePointAttr.lng}` : "-"} />
                </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Attendance summary</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricCard label="Total" value={attendance.total} />
                  <MetricCard label="Geo validated" value={attendance.geoValidated} />
                  <MetricCard label="Over 10 hours" value={attendance.exceeds10Hours} />
                  <MetricCard label="Low recovery" value={attendance.insufficientRecovery} />
                </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Manage subscription</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <label className="text-xs font-semibold text-slate-500">
                    Plan
                    <select
                      className={`${SEL} mt-1 w-full`}
                      value={subscriptionForm.subscriptionPlan}
                      onChange={(e) => onSubscriptionChange("subscriptionPlan", e.target.value)}
                    >
                      <option value="">Select plan</option>
                      {PLAN_OPTIONS.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-500">
                    Status
                    <select
                      className={`${SEL} mt-1 w-full`}
                      value={subscriptionForm.subscriptionStatus}
                      onChange={(e) => onSubscriptionChange("subscriptionStatus", e.target.value)}
                    >
                      <option value="">Select status</option>
                      {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-500">
                    Expires at
                    <input
                      type="date"
                      className={`${INPUT} mt-1`}
                      value={subscriptionForm.subscriptionExpiresAt}
                      onChange={(e) => onSubscriptionChange("subscriptionExpiresAt", e.target.value)}
                    />
                  </label>
                  <button
                    onClick={onSaveSubscription}
                    disabled={savingSubscription}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#1A2F5E] text-white hover:bg-[#152549] disabled:opacity-60 transition"
                  >
                    {savingSubscription ? "Saving..." : "Save subscription"}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-3">Current expiry: {formatDate(hotel.subscriptionExpiresAt)}</p>
              </section>

              <section className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-4">User management</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-3">Create hotel user</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input className={INPUT} placeholder="Email" value={hotelUserForm.email} onChange={(e) => onHotelUserFormChange("email", e.target.value)} />
                      <input className={INPUT} placeholder="Phone" value={hotelUserForm.phone} onChange={(e) => onHotelUserFormChange("phone", e.target.value)} />
                      <input className={INPUT} placeholder="First name" value={hotelUserForm.firstName} onChange={(e) => onHotelUserFormChange("firstName", e.target.value)} />
                      <input className={INPUT} placeholder="Last name" value={hotelUserForm.lastName} onChange={(e) => onHotelUserFormChange("lastName", e.target.value)} />
                      <select className={SEL} value={hotelUserForm.role} onChange={(e) => onHotelUserFormChange("role", e.target.value)}>
                        {HOTEL_USER_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                      <input className={INPUT} placeholder="Profession" value={hotelUserForm.profession} onChange={(e) => onHotelUserFormChange("profession", e.target.value)} />
                      <select className={SEL} value={hotelUserForm.departmentType} onChange={(e) => onHotelUserFormChange("departmentType", e.target.value)}>
                        <option value="">Department type</option>
                        {DEPARTMENT_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                      <select className={SEL} value={hotelUserForm.departmentRole} onChange={(e) => onHotelUserFormChange("departmentRole", e.target.value)}>
                        <option value="">Department role</option>
                        {DEPARTMENT_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                      <input className={INPUT} type="date" value={hotelUserForm.dob} onChange={(e) => onHotelUserFormChange("dob", e.target.value)} />
                      <input className={INPUT} placeholder="City" value={hotelUserForm.city} onChange={(e) => onHotelUserFormChange("city", e.target.value)} />
                    </div>
                    <button
                      onClick={onCreateHotelUser}
                      disabled={creatingHotelUser}
                      className="mt-3 px-4 py-2 text-sm font-semibold rounded-lg bg-[#1A2F5E] text-white hover:bg-[#152549] disabled:opacity-60 transition"
                    >
                      {creatingHotelUser ? "Creating..." : "Create user"}
                    </button>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 mb-3">Bulk upload</p>
                    <div className="flex items-center gap-2">
                      <input
                        key={bulkFile?.name || "empty-file"}
                        className="block w-full text-xs text-slate-500 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 file:font-semibold"
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => onBulkFileChange(e.target.files?.[0] ?? null)}
                      />
                      <button
                        onClick={onBulkUploadUsers}
                        disabled={uploadingBulkUsers || !bulkFile}
                        className="shrink-0 px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                      >
                        {uploadingBulkUsers ? "Uploading..." : "Upload"}
                      </button>
                    </div>

                    <p className="text-xs font-semibold text-slate-500 mt-5 mb-3">Promote user</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input className={INPUT} placeholder="User id" value={promoteForm.userId} onChange={(e) => onPromoteFormChange("userId", e.target.value)} />
                      <select className={SEL} value={promoteForm.role} onChange={(e) => onPromoteFormChange("role", e.target.value)}>
                        {HOTEL_USER_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                      <select className={SEL} value={promoteForm.departmentType} onChange={(e) => onPromoteFormChange("departmentType", e.target.value)}>
                        <option value="">Department type</option>
                        {DEPARTMENT_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}
                      </select>
                      <select className={SEL} value={promoteForm.departmentRole} onChange={(e) => onPromoteFormChange("departmentRole", e.target.value)}>
                        <option value="">Department role</option>
                        {DEPARTMENT_ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </div>
                    <button
                      onClick={onPromoteHotelUser}
                      disabled={promotingHotelUser}
                      className="mt-3 px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                    >
                      {promotingHotelUser ? "Promoting..." : "Promote user"}
                    </button>
                  </div>
                </div>

                <UserOperationResult result={userOperationResult} />
              </section>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

export default function Hotels() {
  const [hotels, setHotels] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [painPoint, setPainPoint] = useState("")
  const [city, setCity] = useState("")
  const [subscriptionPlan, setSubscriptionPlan] = useState("")
  const [subscriptionStatus, setSubscriptionStatus] = useState("")
  const [activeFilter, setActiveFilter] = useState("")
  const [paymentFilter, setPaymentFilter] = useState("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState("desc")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)

  const [confirmTarget, setConfirmTarget] = useState(null)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState(null)
  const [sending, setSending] = useState(false)
  const [deletingHotel, setDeletingHotel] = useState(false)
  const [toast, setToast] = useState(null)
  const [hotelFormMode, setHotelFormMode] = useState("create")
  const [hotelFormOpen, setHotelFormOpen] = useState(false)
  const [hotelForm, setHotelForm] = useState(() => getInitialHotelForm())
  const [hotelFormTarget, setHotelFormTarget] = useState(null)
  const [savingHotel, setSavingHotel] = useState(false)

  const [selectedHotelId, setSelectedHotelId] = useState(null)
  const [selectedHotel, setSelectedHotel] = useState(null)
  const [selectedAnalytics, setSelectedAnalytics] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState("")
  const [subscriptionForm, setSubscriptionForm] = useState({
    subscriptionPlan: "",
    subscriptionStatus: "",
    subscriptionExpiresAt: "",
  })
  const [hotelUserForm, setHotelUserForm] = useState({
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    dob: "",
    role: "EMPLOYEE",
    profession: "",
    city: "",
    departmentType: "",
    departmentRole: "",
  })
  const [bulkFile, setBulkFile] = useState(null)
  const [promoteForm, setPromoteForm] = useState({
    userId: "",
    role: "MANAGER",
    departmentType: "",
    departmentRole: "",
  })
  const [userOperationResult, setUserOperationResult] = useState(null)
  const [savingSubscription, setSavingSubscription] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [creatingHotelUser, setCreatingHotelUser] = useState(false)
  const [uploadingBulkUsers, setUploadingBulkUsers] = useState(false)
  const [promotingHotelUser, setPromotingHotelUser] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchHotels = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const initialPaymentDone = paymentFilter === "paid" ? true : paymentFilter === "unpaid" ? false : undefined
      const isActive = activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined
      const result = await getHotels({
        page,
        limit,
        sortBy,
        sortOrder,
        search,
        primaryPainPoint: painPoint,
        city,
        subscriptionPlan,
        subscriptionStatus,
        isActive,
        initialPaymentDone,
      })
      setHotels(result.hotels)
      setPagination(result.pagination)
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load hotels.")
    } finally {
      setLoading(false)
    }
  }, [activeFilter, city, limit, page, painPoint, paymentFilter, search, sortBy, sortOrder, subscriptionPlan, subscriptionStatus])

  useEffect(() => {
    fetchHotels()
  }, [fetchHotels])

  const loadHotelDetails = useCallback(async (hotelId) => {
    if (!hotelId) return
    setDetailLoading(true)
    setDetailError("")
    try {
      const [profile, analytics] = await Promise.all([
        getHotelProfile(hotelId),
        getHotelAnalytics(hotelId),
      ])
      setSelectedHotel(profile)
      setSelectedAnalytics(analytics)
      setSubscriptionForm({
        subscriptionPlan: profile?.subscriptionPlan || "",
        subscriptionStatus: profile?.subscriptionStatus || "",
        subscriptionExpiresAt: profile?.subscriptionExpiresAt ? profile.subscriptionExpiresAt.slice(0, 10) : "",
      })
    } catch (e) {
      setDetailError(e?.response?.data?.message || "Failed to load hotel profile.")
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedHotelId) loadHotelDetails(selectedHotelId)
  }, [loadHotelDetails, selectedHotelId])

  const hasFilters = searchInput || painPoint || city || subscriptionPlan || subscriptionStatus || activeFilter || paymentFilter
  const start = Math.min((page - 1) * limit + 1, pagination.total)
  const end = Math.min(page * limit, pagination.total)

  const columns = useMemo(
    () => [
      { key: "name", label: "Hotel" },
      { key: "city", label: "Location" },
      { key: "contactPersonName", label: "Contact" },
      { key: "subscriptionPlan", label: "Plan" },
      { key: "subscriptionStatus", label: "Subscription" },
      { key: "isActive", label: "Status" },
      { key: "initialPaymentDone", label: "Payment" },
      { key: "actions", label: "" },
    ],
    []
  )

  function clearFilters() {
    setSearchInput("")
    setSearch("")
    setPainPoint("")
    setCity("")
    setSubscriptionPlan("")
    setSubscriptionStatus("")
    setActiveFilter("")
    setPaymentFilter("")
    setPage(1)
  }

  function handleSort(key) {
    if (key === "actions") return
    if (sortBy === key) setSortOrder((d) => (d === "asc" ? "desc" : "asc"))
    else {
      setSortBy(key)
      setSortOrder("asc")
    }
    setPage(1)
  }

  function showToast(type, message) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  function openCreateHotel() {
    setHotelFormMode("create")
    setHotelFormTarget(null)
    setHotelForm(getInitialHotelForm())
    setHotelFormOpen(true)
  }

  function openEditHotel(hotel) {
    if (!hotel) return
    setHotelFormMode("edit")
    setHotelFormTarget(hotel)
    setHotelForm(getInitialHotelForm(hotel))
    setHotelFormOpen(true)
  }

  function closeHotelForm() {
    if (savingHotel) return
    setHotelFormOpen(false)
    setHotelFormTarget(null)
  }

  function handleHotelFormChange(key, value) {
    setHotelForm((form) => ({ ...form, [key]: value }))
  }

  async function handleSaveHotel() {
    if (!hotelForm.name.trim() || !hotelForm.email.trim() || !hotelForm.phoneNumber.trim()) {
      showToast("error", "Hotel name, email, and phone number are required.")
      return
    }

    setSavingHotel(true)
    try {
      const payload = buildHotelPayload(hotelForm)
      const saved = hotelFormMode === "edit"
        ? await updateHotel(hotelFormTarget.id, payload)
        : await createHotel(payload)

      if (hotelFormMode === "edit") {
        setHotels((items) => items.map((item) => (item.id === hotelFormTarget.id ? { ...item, ...saved } : item)))
        setSelectedHotel((current) => (current?.id === hotelFormTarget.id ? { ...current, ...saved } : current))
        showToast("success", "Hotel updated successfully")
      } else {
        showToast("success", "Hotel created successfully")
        await fetchHotels()
      }

      setHotelFormOpen(false)
      setHotelFormTarget(null)
    } catch (e) {
      showToast("error", e?.response?.data?.message || `Failed to ${hotelFormMode === "edit" ? "update" : "create"} hotel.`)
    } finally {
      setSavingHotel(false)
    }
  }

  function openHotel(hotelId) {
    setSelectedHotelId(hotelId)
    setSelectedHotel(null)
    setSelectedAnalytics(null)
    setDetailError("")
    setBulkFile(null)
    setUserOperationResult(null)
  }

  async function handleSendCredentials() {
    if (!confirmTarget) return
    setSending(true)
    try {
      await sendCredentials({ hotelId: confirmTarget.id })
      setConfirmTarget(null)
      showToast("success", `Credentials sent to ${confirmTarget.name}`)
    } catch (e) {
      setConfirmTarget(null)
      showToast("error", e?.response?.data?.message || "Failed to send credentials.")
    } finally {
      setSending(false)
    }
  }

  async function handleDeleteHotel() {
    if (!deleteConfirmTarget) return
    setDeletingHotel(true)
    try {
      await deleteHotel(deleteConfirmTarget.id)
      setHotels((items) => items.filter((item) => item.id !== deleteConfirmTarget.id))
      setPagination((current) => ({ ...current, total: Math.max(0, current.total - 1) }))
      if (selectedHotelId === deleteConfirmTarget.id) {
        setSelectedHotelId(null)
        setSelectedHotel(null)
        setSelectedAnalytics(null)
      }
      showToast("success", "Hotel deleted successfully")
      setDeleteConfirmTarget(null)
      fetchHotels()
    } catch (e) {
      showToast("error", e?.response?.data?.message || "Failed to delete hotel.")
    } finally {
      setDeletingHotel(false)
    }
  }

  async function handleToggleStatus() {
    if (!selectedHotel) return
    setUpdatingStatus(true)
    try {
      const updated = await updateHotelStatus(selectedHotel.id, !selectedHotel.isActive)
      setSelectedHotel((current) => ({ ...current, ...updated }))
      setHotels((items) => items.map((item) => (item.id === selectedHotel.id ? { ...item, ...updated } : item)))
      showToast("success", `Hotel ${updated?.isActive ? "activated" : "deactivated"} successfully`)
    } catch (e) {
      showToast("error", e?.response?.data?.message || "Failed to update hotel status.")
    } finally {
      setUpdatingStatus(false)
    }
  }

  async function handleSaveSubscription() {
    if (!selectedHotel) return
    setSavingSubscription(true)
    try {
      const payload = Object.fromEntries(
        Object.entries(subscriptionForm)
          .filter(([, value]) => value)
          .map(([key, value]) => [key, key === "subscriptionExpiresAt" ? new Date(`${value}T00:00:00.000Z`).toISOString() : value])
      )
      const updated = await updateHotelSubscription(selectedHotel.id, payload)
      setSelectedHotel((current) => ({ ...current, ...updated }))
      setHotels((items) => items.map((item) => (item.id === selectedHotel.id ? { ...item, ...updated } : item)))
      showToast("success", "Subscription updated successfully")
    } catch (e) {
      showToast("error", e?.response?.data?.message || "Failed to update subscription.")
    } finally {
      setSavingSubscription(false)
    }
  }

  async function handleCreateHotelUser() {
    if (!selectedHotel) return
    if (!hotelUserForm.email.trim()) {
      showToast("error", "Email is required to create a hotel user.")
      return
    }

    setCreatingHotelUser(true)
    try {
      const payload = compactObject({
        email: hotelUserForm.email.trim(),
        phone: hotelUserForm.phone.trim(),
        role: hotelUserForm.role,
        profession: hotelUserForm.profession.trim(),
        departmentType: hotelUserForm.departmentType,
        departmentRole: hotelUserForm.departmentRole,
        profile: {
          firstName: hotelUserForm.firstName.trim(),
          lastName: hotelUserForm.lastName.trim(),
          dob: hotelUserForm.dob,
          location: {
            city: hotelUserForm.city.trim(),
          },
        },
      }) || {}
      const result = await createHotelUsers(selectedHotel.id, payload)
      setUserOperationResult(result)
      setHotelUserForm({
        email: "",
        phone: "",
        firstName: "",
        lastName: "",
        dob: "",
        role: "EMPLOYEE",
        profession: "",
        city: "",
        departmentType: "",
        departmentRole: "",
      })
      showToast("success", result?.message || "Hotel user creation completed")
    } catch (e) {
      showToast("error", e?.response?.data?.message || "Failed to create hotel user.")
    } finally {
      setCreatingHotelUser(false)
    }
  }

  async function handleBulkUploadUsers() {
    if (!selectedHotel || !bulkFile) return

    setUploadingBulkUsers(true)
    try {
      const result = await bulkUploadHotelUsers(selectedHotel.id, bulkFile)
      setUserOperationResult(result)
      setBulkFile(null)
      showToast("success", result?.message || "Bulk hotel user upload completed")
    } catch (e) {
      showToast("error", e?.response?.data?.message || "Failed to upload hotel users.")
    } finally {
      setUploadingBulkUsers(false)
    }
  }

  async function handlePromoteHotelUser() {
    if (!selectedHotel) return
    if (!promoteForm.userId.trim()) {
      showToast("error", "User id is required to promote a hotel user.")
      return
    }

    setPromotingHotelUser(true)
    try {
      const payload = compactObject({
        role: promoteForm.role,
        departmentType: promoteForm.departmentType,
        departmentRole: promoteForm.departmentRole,
      }) || {}
      const result = await promoteHotelUser(selectedHotel.id, promoteForm.userId.trim(), payload)
      setUserOperationResult(result)
      setPromoteForm({
        userId: "",
        role: "MANAGER",
        departmentType: "",
        departmentRole: "",
      })
      showToast("success", result?.message || "User role updated successfully")
    } catch (e) {
      showToast("error", e?.response?.data?.message || "Failed to promote hotel user.")
    } finally {
      setPromotingHotelUser(false)
    }
  }

  return (
    <div>
      <Toast toast={toast} />
      <ConfirmModal
        open={!!confirmTarget}
        title="Send credentials"
        description={`Send login credentials to "${confirmTarget?.name}"? They will receive an email with their access details.`}
        confirmLabel="Send credentials"
        loading={sending}
        onConfirm={handleSendCredentials}
        onCancel={() => !sending && setConfirmTarget(null)}
      />
      <ConfirmModal
        open={!!deleteConfirmTarget}
        title="Delete hotel"
        description={`Delete "${deleteConfirmTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete hotel"
        loading={deletingHotel}
        onConfirm={handleDeleteHotel}
        onCancel={() => !deletingHotel && setDeleteConfirmTarget(null)}
      />
      <HotelFormModal
        open={hotelFormOpen}
        mode={hotelFormMode}
        form={hotelForm}
        saving={savingHotel}
        onChange={handleHotelFormChange}
        onClose={closeHotelForm}
        onSubmit={handleSaveHotel}
      />
      <HotelDrawer
        open={!!selectedHotelId}
        hotel={selectedHotel}
        analytics={selectedAnalytics}
        loading={detailLoading}
        error={detailError}
        subscriptionForm={subscriptionForm}
        hotelUserForm={hotelUserForm}
        bulkFile={bulkFile}
        promoteForm={promoteForm}
        userOperationResult={userOperationResult}
        savingSubscription={savingSubscription}
        updatingStatus={updatingStatus}
        creatingHotelUser={creatingHotelUser}
        uploadingBulkUsers={uploadingBulkUsers}
        promotingHotelUser={promotingHotelUser}
        onClose={() => setSelectedHotelId(null)}
        onRetry={() => loadHotelDetails(selectedHotelId)}
        onSubscriptionChange={(key, value) => setSubscriptionForm((form) => ({ ...form, [key]: value }))}
        onHotelUserFormChange={(key, value) => setHotelUserForm((form) => ({ ...form, [key]: value }))}
        onBulkFileChange={setBulkFile}
        onPromoteFormChange={(key, value) => setPromoteForm((form) => ({ ...form, [key]: value }))}
        onSaveSubscription={handleSaveSubscription}
        onToggleStatus={handleToggleStatus}
        onEditHotel={() => openEditHotel(selectedHotel)}
        onDeleteHotel={() => selectedHotel && setDeleteConfirmTarget({ id: selectedHotel.id, name: selectedHotel.name })}
        onCreateHotelUser={handleCreateHotelUser}
        onBulkUploadUsers={handleBulkUploadUsers}
        onPromoteHotelUser={handlePromoteHotelUser}
      />

      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-0.5">Hotel Directory</h1>
          <p className="text-sm text-slate-500">{loading ? "Loading..." : `${pagination.total} hotels found`}</p>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end min-w-[280px]">
          <div className="relative min-w-[220px] max-w-xs flex-1">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="7" cy="7" r="5" /><path d="M11 11l3 3" />
            </svg>
            <input
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition"
              placeholder="Search hotels, email, city..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button
            onClick={openCreateHotel}
            className="shrink-0 px-4 py-2 text-sm font-semibold rounded-lg bg-[#1A2F5E] text-white hover:bg-[#152549] transition"
          >
            Create hotel
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input
          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 outline-none focus:border-blue-300"
          placeholder="City"
          value={city}
          onChange={(e) => {
            setCity(e.target.value)
            setPage(1)
          }}
        />
        <select className={SEL} value={painPoint} onChange={(e) => { setPainPoint(e.target.value); setPage(1) }}>
          <option value="">All pain points</option>
          {PAIN_POINT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className={SEL} value={subscriptionPlan} onChange={(e) => { setSubscriptionPlan(e.target.value); setPage(1) }}>
          <option value="">All plans</option>
          {PLAN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className={SEL} value={subscriptionStatus} onChange={(e) => { setSubscriptionStatus(e.target.value); setPage(1) }}>
          <option value="">All subscriptions</option>
          {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className={SEL} value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value); setPage(1) }}>
          <option value="">All activity</option>
          <option value="active">Active hotels</option>
          <option value="inactive">Inactive hotels</option>
        </select>
        <select className={SEL} value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); setPage(1) }}>
          <option value="">All payment</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 hover:border-slate-300 transition bg-white">
            Clear filters
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">Show</span>
          <select className={SEL} value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}>
            {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
          <button onClick={fetchHotels} className="text-xs px-2.5 py-1 border border-red-300 rounded-lg hover:bg-red-100 transition ml-3 shrink-0">Retry</button>
        </div>
      )}

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white relative">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50">
              <tr>
                {columns.map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`px-4 py-3 text-left text-[11px] font-semibold text-slate-500 border-b border-slate-200 select-none whitespace-nowrap transition-colors ${key !== "actions" ? "cursor-pointer hover:text-slate-700" : ""}`}
                  >
                    {label}
                    {key !== "actions" && <SortIcon col={key} sortBy={sortBy} sortOrder={sortOrder} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && hotels.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">No hotels found for the current filters.</td></tr>
              )}
              {hotels.map((h) => (
                <tr key={h.id} className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 min-w-[220px]">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${avatarClass(h.id)}`}>
                        {getInitials(h.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-slate-900 truncate">{h.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{h.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 min-w-[150px]">
                    <p className="text-[13px] text-slate-700 truncate">{h.location?.city || "-"}</p>
                    <p className="text-[11px] text-slate-400 truncate">{h.location?.state || h.location?.country || "-"}</p>
                  </td>
                  <td className="px-4 py-3 min-w-[160px]">
                    <p className="text-[13px] text-slate-700 truncate">{h.contactPersonName || "-"}</p>
                    <p className="text-[11px] text-slate-400">{h.phoneNumber || "-"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge>{h.subscriptionPlan || "-"}</Badge>
                    {h.subscriptionAmount ? <p className="text-[11px] text-slate-400 mt-1">Rs. {h.subscriptionAmount.toLocaleString("en-IN")}</p> : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={h.subscriptionStatus === "ACTIVE" ? "blue" : "amber"}>{h.subscriptionStatus || "-"}</Badge>
                    <p className="text-[11px] text-slate-400 mt-1">{formatDate(h.subscriptionExpiresAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={h.isActive ? "emerald" : "red"}>{h.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={h.initialPaymentDone ? "blue" : "red"}>{h.initialPaymentDone ? "Paid" : "Unpaid"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openHotel(h.id)}
                        className="inline-flex items-center px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition whitespace-nowrap"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEditHotel(h)}
                        className="inline-flex items-center px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition whitespace-nowrap"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setConfirmTarget({ id: h.id, name: h.name })}
                        className="inline-flex items-center px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition whitespace-nowrap"
                      >
                        Credentials
                      </button>
                      <button
                        onClick={() => setDeleteConfirmTarget({ id: h.id, name: h.name })}
                        className="inline-flex items-center px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition whitespace-nowrap"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-[#1A2F5E] rounded-full animate-spin" />
            <span className="text-sm text-slate-500">Loading hotels...</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
        <p className="text-xs text-slate-500">
          {pagination.total === 0 ? "No results" : `${start}-${end} of ${pagination.total} hotels`}
        </p>
        <div className="flex gap-1">
          <PageBtn onClick={() => setPage(1)} disabled={page === 1}>First</PageBtn>
          <PageBtn onClick={() => setPage((p) => p - 1)} disabled={page === 1}>Prev</PageBtn>
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            let p
            if (pagination.totalPages <= 5) p = i + 1
            else if (page <= 3) p = i + 1
            else if (page >= pagination.totalPages - 2) p = pagination.totalPages - 4 + i
            else p = page - 2 + i
            return <PageBtn key={p} onClick={() => setPage(p)} active={p === page}>{p}</PageBtn>
          })}
          <PageBtn onClick={() => setPage((p) => p + 1)} disabled={page === pagination.totalPages || pagination.totalPages === 0}>Next</PageBtn>
          <PageBtn onClick={() => setPage(pagination.totalPages)} disabled={page === pagination.totalPages || pagination.totalPages === 0}>Last</PageBtn>
        </div>
      </div>
    </div>
  )
}
