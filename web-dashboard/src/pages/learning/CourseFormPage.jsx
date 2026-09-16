import { useCallback, useState } from "react"
import { useNavigate } from "react-router-dom"
import { createLmsCourse, getLmsCategories } from "../../api/lms"
import { getErrorMessage } from "../../api/api"
import useAsyncData from "../../hooks/useAsyncData"
import PageHeader from "../../components/ui/PageHeader"
import Card, { CardHeader } from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import CourseFormFields from "./CourseFormFields"
import { EMPTY_COURSE_FORM, buildCoursePayload, validateCourseForm } from "./courseFormUtils"
import { InlineAlert } from "../../components/ui/States"
import { IconChevronLeft } from "../../components/ui/Icons"

/**
 * New course is a full page (complex form), not a modal — modal overload was a
 * diagnosed problem. Payload identical to the previous inline form.
 */
export default function CourseFormPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_COURSE_FORM)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  const load = useCallback(() => getLmsCategories(), [])
  const { data: categories = [] } = useAsyncData(load)

  const change = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  async function submit() {
    const nextErrors = validateCourseForm(form, { requireCategory: true })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    setFormError("")
    try {
      const created = await createLmsCourse(buildCoursePayload(form))
      const id = created?.id ?? created?._id
      navigate(id ? `/dashboard/learning/courses/${id}` : "/dashboard/learning/courses")
    } catch (err) {
      setFormError(
        err?.response?.status === 409
          ? "A course with this title already exists. Choose a different title."
          : getErrorMessage(err, "Could not create the course.")
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="New course"
        description="Give the course its identity first — modules, lectures and assessments come next on the course page."
        backLink={{ to: "/dashboard/learning/courses", label: "Back to courses" }}
      />

      <Card>
        <CardHeader title="Course information" subtitle="Every field maps directly to what the catalog and learners use." />
        <div className="border-t border-slate-100 px-5 py-4">
          <CourseFormFields form={form} onChange={change} errors={errors} categories={categories ?? []} />
          {formError && (
            <p className="mt-4">
              <InlineAlert tone="danger">{formError}</InlineAlert>
            </p>
          )}
          <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="ghost" icon={<IconChevronLeft size={14} />} onClick={() => navigate("/dashboard/learning/courses")} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" loading={saving} onClick={submit}>
              Create course
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
