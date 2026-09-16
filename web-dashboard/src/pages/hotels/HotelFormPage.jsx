import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { createHotel, getHotelProfile, hotelKey, updateHotel } from "../../api/hotels"
import useAsyncData from "../../hooks/useAsyncData"
import PageHeader from "../../components/ui/PageHeader"
import Button from "../../components/ui/Button"
import Card, { CardHeader } from "../../components/ui/Card"
import { SelectField, TextField } from "../../components/ui/Field"
import { useToast } from "../../hooks/useToast"
import { IconChevronLeft } from "../../components/ui/Icons"
import {
  MONTHLY_EVENTS_OPTIONS,
  PAIN_POINT_OPTIONS,
  PLAN_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  SUBSCRIPTION_STATUS_OPTIONS,
  buildHotelPayload,
  hotelFormFromRecord,
  validateHotelForm,
} from "./hotelOptions"

/**
 * Create/edit hotel as a full page with grouped sections — the previous UI
 * crammed ~18 fields into a modal. Same API + payload builder as before.
 */
export default function HotelFormPage() {
  const { hotelId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const isEdit = Boolean(hotelId)

  const [form, setForm] = useState(hotelFormFromRecord())
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!isEdit) return null
    return getHotelProfile(hotelId)
  }, [hotelId, isEdit])

  const { data: hotel, loading } = useAsyncData(load, { deps: [hotelId] })

  useEffect(() => {
    if (hotel) setForm(hotelFormFromRecord(hotel))
  }, [hotel])

  function change(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function handleSave() {
    const nextErrors = validateHotelForm(form)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      const first = document.getElementById(Object.keys(nextErrors)[0])
      first?.focus()
      return
    }
    setSaving(true)
    try {
      const payload = buildHotelPayload(form)
      if (isEdit) {
        await updateHotel(hotelKey(hotel) || hotelId, payload)
        toast.success("Hotel updated")
        navigate(`/dashboard/hotels/${hotelId}`)
      } else {
        const saved = await createHotel(payload)
        toast.success(`${form.name} created. Use “Send credentials” on its profile to deliver access details.`)
        navigate(saved?.id || saved?._id ? `/dashboard/hotels/${saved.id ?? saved._id}` : "/dashboard/hotels")
      }
    } catch (err) {
      setErrors({
        form:
          err?.response?.status === 403
            ? "Your account isn't permitted to manage hotels. Only platform super admins can create or edit tenants."
            : err?.response?.data?.message || err?.message || "Could not save the hotel. Please review the fields and try again.",
      })
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && loading) {
    return <p className="text-sm text-slate-500">Loading hotel…</p>
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isEdit ? `Edit ${form.name || "hotel"}` : "Create hotel"}
        description={
          isEdit
            ? "Update the tenant profile. Only the fields you change are sent to the API."
            : "Register a new hotel on the platform. The login password is provisioned by the backend; send credentials afterwards from the hotel profile."
        }
        backLink={
          isEdit
            ? { to: `/dashboard/hotels/${hotelId}`, label: "Back to hotel" }
            : { to: "/dashboard/hotels", label: "Back to hotels" }
        }
      />

      <div className="space-y-5">
        <Card>
          <CardHeader title="Basic information" subtitle="Who this organization is and how Mend reaches them." />
          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 px-5 pb-5 pt-4 sm:grid-cols-2">
            <TextField id="name" label="Hotel name" required value={form.name} onChange={(e) => change("name", e.target.value)} error={errors.name} />
            <TextField id="email" label="Email" required type="email" value={form.email} onChange={(e) => change("email", e.target.value)} error={errors.email} />
            <TextField id="contactPersonName" label="Contact person" value={form.contactPersonName} onChange={(e) => change("contactPersonName", e.target.value)} />
            <TextField id="phoneNumber" label="Phone number" required value={form.phoneNumber} onChange={(e) => change("phoneNumber", e.target.value)} error={errors.phoneNumber} />
            <SelectField id="propertyType" label="Property type" value={form.propertyType} onChange={(e) => change("propertyType", e.target.value)}>
              {PROPERTY_TYPE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </SelectField>
            <SelectField id="primaryPainPoint" label="Primary pain point" value={form.primaryPainPoint} onChange={(e) => change("primaryPainPoint", e.target.value)}>
              {PAIN_POINT_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </SelectField>
            <SelectField id="monthlyEvents" label="Monthly events" value={form.monthlyEvents} onChange={(e) => change("monthlyEvents", e.target.value)}>
              {MONTHLY_EVENTS_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </SelectField>
            <TextField id="staffStrength" label="Staff strength" type="number" min="0" value={form.staffStrength} onChange={(e) => change("staffStrength", e.target.value)} error={errors.staffStrength} hint="Approximate total staff" />
          </div>
        </Card>

        <Card>
          <CardHeader title="Location" subtitle="Used for maps, geo validation context and city filters." />
          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 px-5 pb-5 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <TextField label="Address" className="sm:col-span-2 lg:col-span-1" value={form.address} onChange={(e) => change("address", e.target.value)} />
            <TextField label="City" value={form.city} onChange={(e) => change("city", e.target.value)} />
            <TextField label="State" value={form.state} onChange={(e) => change("state", e.target.value)} />
            <TextField label="Country" value={form.country} onChange={(e) => change("country", e.target.value)} />
            <TextField label="Pincode" type="number" value={form.pincode} onChange={(e) => change("pincode", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Latitude" type="number" step="any" value={form.lat} onChange={(e) => change("lat", e.target.value)} />
              <TextField label="Longitude" type="number" step="any" value={form.lng} onChange={(e) => change("lng", e.target.value)} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Subscription" subtitle="Commercial plan for this tenant. Expiry and status are managed from the hotel profile afterwards." />
          <div className="grid grid-cols-1 gap-4 border-t border-slate-100 px-5 pb-5 pt-4 sm:grid-cols-2">
            <SelectField label="Plan" value={form.subscriptionPlan} onChange={(e) => change("subscriptionPlan", e.target.value)}>
              {PLAN_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </SelectField>
            <SelectField label="Subscription status" value={form.subscriptionStatus} onChange={(e) => change("subscriptionStatus", e.target.value)}>
              {SUBSCRIPTION_STATUS_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </SelectField>
          </div>
        </Card>

        {errors.form && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {errors.form}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-4">
          <Button
            variant="ghost"
            icon={<IconChevronLeft size={14} />}
            onClick={() => navigate(isEdit ? `/dashboard/hotels/${hotelId}` : "/dashboard/hotels")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={handleSave}>
            {isEdit ? "Save changes" : "Create hotel"}
          </Button>
        </div>
      </div>
    </div>
  )
}
