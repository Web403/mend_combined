/**
 * Hotel option lists + payload helpers, extracted from the old monolithic
 * Hotels.jsx so the form modal, the detail tabs and the user modals all share
 * identical, validated option sets. Values mirror backend enums exactly
 * (shared/enums: PrimaryPainPoint, PropertyType, MonthlyEvents; hotel model:
 * subscriptionPlan/Status, UserRole, UserDepartmentType/Role).
 */

export const PAIN_POINT_OPTIONS = [
  "Staff Attrition",
  "Service Quality",
  "Operational Efficiency",
  "Hiring Delays",
  "Other",
]

export const PROPERTY_TYPE_OPTIONS = [
  "Luxury Hotel",
  "Boutique Hotel",
  "Resort",
  "Banquet / Event Venue",
  "Restaurant / F&B",
  "Other",
]

export const MONTHLY_EVENTS_OPTIONS = [
  "1–5 events/month",
  "5–15 events/month",
  "15–30 events/month",
  "Daily operations",
]

export const PLAN_OPTIONS = ["FREE", "BASIC", "PREMIUM", "ENTERPRISE"]
export const SUBSCRIPTION_STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "EXPIRED", "CANCELLED"]
export const HOTEL_USER_ROLE_OPTIONS = ["ADMIN", "MANAGER", "EMPLOYEE", "STUDENT", "PROFESSIONAL"]

export const DEPARTMENT_TYPE_OPTIONS = [
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

export const DEPARTMENT_ROLE_OPTIONS = [
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

export const EMPTY_HOTEL_FORM = {
  name: "",
  contactPersonName: "",
  email: "",
  phoneNumber: "",
  primaryPainPoint: "Staff Attrition",
  propertyType: "Luxury Hotel",
  monthlyEvents: "Daily operations",
  staffStrength: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  lat: "",
  lng: "",
  subscriptionPlan: "FREE",
  subscriptionStatus: "ACTIVE",
}

export function hotelFormFromRecord(hotel) {
  return {
    ...EMPTY_HOTEL_FORM,
    name: hotel?.name || "",
    contactPersonName: hotel?.contactPersonName || "",
    email: hotel?.email || "",
    phoneNumber: hotel?.phoneNumber || "",
    primaryPainPoint: hotel?.primaryPainPoint || EMPTY_HOTEL_FORM.primaryPainPoint,
    propertyType: hotel?.propertyType || EMPTY_HOTEL_FORM.propertyType,
    monthlyEvents: hotel?.monthlyEvents || EMPTY_HOTEL_FORM.monthlyEvents,
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

/** Identical payload shape the previous UI sent (PUT/POST /hotel/admin/Hotels). */
export function buildHotelPayload(form) {
  return (
    compactObject({
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
  )
}

export function validateHotelForm(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = "Hotel name is required."
  const email = form.email.trim()
  if (!email) errors.email = "Email is required."
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address."
  if (!form.phoneNumber.trim()) errors.phoneNumber = "Phone number is required."
  if (form.staffStrength !== "" && Number(form.staffStrength) < 0)
    errors.staffStrength = "Staff strength cannot be negative."
  return errors
}

export const compactHotelObject = compactObject
