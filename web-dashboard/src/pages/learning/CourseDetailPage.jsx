import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  archiveLmsCourse,
  createLmsAssessment,
  createLmsLecture,
  createLmsModule,
  createLmsQuestion,
  deleteLmsAssessment,
  deleteLmsCourse,
  deleteLmsLecture,
  deleteLmsModule,
  deleteLmsQuestion,
  getLmsAssessmentByModule,
  getLmsCategories,
  getLmsCourse,
  getLmsLectures,
  getLmsModules,
  getLmsQuestions,
  publishLmsCourse,
  reorderLmsLectures,
  reorderLmsModules,
  updateLmsAssessment,
  updateLmsCourse,
  updateLmsLecture,
  updateLmsModule,
  updateLmsQuestion,
} from "../../api/lms"
import { getErrorMessage } from "../../api/api"
import useAsyncData from "../../hooks/useAsyncData"
import useUrlState from "../../hooks/useUrlState"
import { ROOT_CRUMB } from "../../routes/navigation"
import { useSetCrumbs } from "../../components/layout/crumbs"
import PageHeader from "../../components/ui/PageHeader"
import Button from "../../components/ui/Button"
import Card, { CardBody, CardHeader, DetailGrid, DetailItem } from "../../components/ui/Card"
import StatusBadge, { Tag } from "../../components/ui/StatusBadge"
import Tabs, { TabPanel } from "../../components/ui/Tabs"
import Modal from "../../components/ui/Modal"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import { EmptyState, ErrorState, InlineAlert } from "../../components/ui/States"
import { TextAreaField, TextField, SelectField, CheckboxField } from "../../components/ui/Field"
import { useToast } from "../../hooks/useToast"
import {
  IconArrowDown,
  IconArrowUp,
  IconBook,
  IconCheck,
  IconPencil,
  IconPlus,
} from "../../components/ui/Icons"
import { courseStatus } from "../../utils/labels"
import { durationLabel, formatDate } from "../../utils/format"
import CourseFormFields from "./CourseFormFields"
import { buildCoursePayload, courseFormFromRecord, validateCourseForm } from "./courseFormUtils"

const idOf = (item) => item?.id ?? item?._id

const TABS = [
  { id: "content", label: "Content" },
  { id: "assessments", label: "Assessments" },
  { id: "settings", label: "Settings" },
]

/**
 * A course is managed as ONE entity here — information, modules/lectures and
 * assessments — instead of three disconnected CRUD screens.
 */
export default function CourseDetailPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [q, setQ] = useUrlState({ tab: "content" })
  const tab = TABS.some((t) => t.id === q.tab) ? q.tab : "content"

  const load = useCallback(async () => {
    const [course, modules] = await Promise.all([getLmsCourse(courseId), getLmsModules(courseId)])
    return { course, modules }
  }, [courseId])

  const { data, loading, error, reload, runAction } = useAsyncData(load, { deps: [courseId] })
  const course = data?.course
  const modules = data?.modules ?? []

  const [confirm, setConfirm] = useState(null) // {type:'publish'|'archive'|'delete'}
  const [pending, setPending] = useState(false)

  const loadMeta = useCallback(() => getLmsCategories(), [])
  const { data: categories = [] } = useAsyncData(loadMeta)

  useSetCrumbs(
    course
      ? [
          ROOT_CRUMB,
          { label: "Learning", to: "/dashboard/learning/courses" },
          { label: "Courses", to: "/dashboard/learning/courses" },
          { label: course.title },
        ]
      : null
  )

  async function runConfirmation() {
    if (!confirm || !course) return
    setPending(true)
    const result = await runAction(async () => {
      if (confirm.type === "publish") return publishLmsCourse(courseId)
      if (confirm.type === "archive") return archiveLmsCourse(courseId)
      if (confirm.type === "delete") return deleteLmsCourse(courseId)
    })
    setPending(false)
    if (result.ok) {
      if (confirm.type === "publish") {
        toast.success("Course published — learners can enroll now")
        setConfirm(null)
        reload()
      } else if (confirm.type === "archive") {
        toast.success("Course archived — hidden from the catalog")
        setConfirm(null)
        reload()
      } else if (confirm.type === "delete") {
        toast.success("Course deleted")
        navigate("/dashboard/learning/courses")
      }
    }
  }

  if (loading && !data) {
    return (
      <div>
        <PageHeader title="Course" backLink={{ to: "/dashboard/learning/courses", label: "Courses" }} />
        <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    )
  }

  if (error && !course) {
    return (
      <div>
        <PageHeader title="Course" backLink={{ to: "/dashboard/learning/courses", label: "Courses" }} />
        <ErrorState title="We couldn't load this course" message={error} onRetry={reload} />
      </div>
    )
  }

  const st = courseStatus(course)
  const status = String(course?.status ?? "draft").toLowerCase()
  const totalLectures = course?.totalLectures ?? course?.modules?.reduce((n, m) => n + (m?.totalLectures ?? 0), 0)

  return (
    <div>
      <PageHeader
        title={course?.title || "Course"}
        backLink={{ to: "/dashboard/learning/courses", label: "Courses" }}
        description={[
          course?.category?.name || "Uncategorized",
          course?.difficulty ? course.difficulty[0].toUpperCase() + course.difficulty.slice(1) : null,
          durationLabel(course?.estimatedDurationMinutes),
          `${modules.length} module${modules.length === 1 ? "" : "s"}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        status={<StatusBadge tone={st.tone}>{st.label}</StatusBadge>}
        actions={
          <>
            {status === "published" ? (
              <Button variant="secondary" size="sm" onClick={() => setConfirm({ type: "archive" })}>
                Archive
              </Button>
            ) : (
              <Button variant="primary" size="sm" icon={<IconCheck size={13} />} onClick={() => setConfirm({ type: "publish" })}>
                Publish
              </Button>
            )}
            <Button size="sm" variant="secondary" icon={<IconPencil size={13} />} onClick={() => setQ({ tab: "settings" })}>
              Edit details
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <Tabs
          tabs={TABS.map((t) => ({
            ...t,
            count:
              t.id === "content"
                ? modules.length
                : t.id === "assessments"
                  ? course?.totalQuizQuestions ?? undefined
                  : undefined,
          }))}
          value={tab}
          onChange={(id) => setQ({ tab: id })}
        />
      </div>

      <TabPanel id="content" active={tab === "content"}>
        <ContentTab courseId={courseId} modules={modules} course={course} onChanged={reload} categories={categories} />
      </TabPanel>

      <TabPanel id="assessments" active={tab === "assessments"}>
        <AssessmentsTab courseId={courseId} modules={modules} />
      </TabPanel>

      <TabPanel id="settings" active={tab === "settings"}>
        <SettingsTab
          course={course}
          categories={categories}
          totalLectures={totalLectures}
          onChanged={reload}
          onRequestDelete={() => setConfirm({ type: "delete" })}
        />
      </TabPanel>

      <ConfirmDialog
        open={confirm?.type === "publish"}
        title="Publish course"
        description="Publishing makes this course immediately visible in the learning catalog and open for enrollments."
        confirmLabel="Publish course"
        busy={pending}
        onConfirm={runConfirmation}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.type === "archive"}
        danger
        title="Archive course"
        description="Archived courses disappear from the catalog. Enrolled learners keep their progress; nothing is deleted."
        confirmLabel="Archive course"
        busy={pending}
        onConfirm={runConfirmation}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.type === "delete"}
        danger
        requireText={course?.title}
        title="Delete course"
        description={`“${course?.title}” will be permanently removed with all of its modules, lectures, assessments and questions. This cannot be undone.`}
        confirmLabel="Delete course"
        busy={pending}
        onConfirm={runConfirmation}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

/* ── Content tab: modules + lectures ──────────────────────────────────────── */

function ContentTab({ courseId, modules, onChanged }) {
  const toast = useToast()
  const [modal, setModal] = useState(null) // {kind, module?, lecture?, moduleId?}
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  // lectures by module id, loaded lazily per module list
  const [lectures, setLectures] = useState({})
  useEffect(() => {
    let ignore = false
    ;(async () => {
      const entries = await Promise.all(
        modules.map(async (m) => {
          try {
            return [idOf(m), await getLmsLectures(idOf(m))]
          } catch {
            return [idOf(m), []]
          }
        })
      )
      if (!ignore) setLectures(Object.fromEntries(entries))
    })()
    return () => {
      ignore = true
    }
  }, [modules])

  async function moveModule(index, dir) {
    const next = [...modules]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    await reorderLmsModules(
      courseId,
      next.map((m, i) => ({ moduleId: m._id ?? m.id, orderIndex: i }))
    )
      .then(() => onChanged())
      .catch((err) => toast.error(getErrorMessage(err, "Could not reorder modules.")))
  }

  async function moveLecture(moduleId, index, dir) {
    const list = lectures[moduleId] ?? []
    const next = [...list]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    await reorderLmsLectures(
      moduleId,
      next.map((l, i) => ({ lectureId: l._id ?? l.id, orderIndex: i }))
    )
      .then(() => onChanged())
      .catch((err) => toast.error(getErrorMessage(err, "Could not reorder lectures.")))
  }

  async function runConfirm() {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.kind === "module") await deleteLmsModule(idOf(confirm.item))
      if (confirm.kind === "lecture") await deleteLmsLecture(idOf(confirm.item))
      toast.success(confirm.kind === "module" ? "Module deleted" : "Lecture deleted")
      setConfirm(null)
      onChanged()
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete it."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-slate-500">
          Learners work through modules top-to-bottom. Order matters — use the arrows to rearrange.
        </p>
        <Button variant="primary" size="sm" icon={<IconPlus size={14} />} onClick={() => setModal({ kind: "module-new" })}>
          Add module
        </Button>
      </div>

      {modules.length === 0 ? (
        <Card className="border-dashed">
          <EmptyState
            icon={<IconBook size={20} />}
            title="This course has no modules yet"
            description="A course starts with modules; lectures and assessments live inside them."
            action={
              <Button variant="primary" size="sm" icon={<IconPlus size={14} />} onClick={() => setModal({ kind: "module-new" })}>
                Add the first module
              </Button>
            }
          />
        </Card>
      ) : (
        modules.map((module, index) => {
          const moduleId = idOf(module)
          const lectureList = lectures[moduleId] ?? []
          return (
            <Card key={moduleId}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-50 text-[11px] font-bold text-brand-700">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-900">{module.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {module.description || "No description"} · {lectureList.length} lecture{lectureList.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="xs" variant="ghost" disabled={index === 0} aria-label={`Move module ${module.title} up`} onClick={() => moveModule(index, -1)}>
                    <IconArrowUp size={13} />
                  </Button>
                  <Button size="xs" variant="ghost" disabled={index === modules.length - 1} aria-label={`Move module ${module.title} down`} onClick={() => moveModule(index, 1)}>
                    <IconArrowDown size={13} />
                  </Button>
                  <Button size="xs" variant="ghost" icon={<IconPencil size={12} />} onClick={() => setModal({ kind: "module-edit", module })}>
                    Edit
                  </Button>
                  <Button size="xs" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirm({ kind: "module", item: module })}>
                    Delete
                  </Button>
                </div>
              </div>

              {lectureList.length > 0 && (
                <ul className="divide-y divide-slate-100">
                  {lectureList.map((lecture, li) => (
                    <li key={idOf(lecture)} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="w-4 shrink-0 text-right text-[11px] tabular-nums text-slate-400">{li + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700">{lecture.title}</span>
                      <span className="shrink-0 text-[11px] text-slate-400">{durationLabel(lecture.estimatedDurationMinutes)}</span>
                      <span className="flex shrink-0 items-center gap-0.5">
                        <Button size="xs" variant="ghost" disabled={li === 0} aria-label={`Move lecture ${lecture.title} up`} onClick={() => moveLecture(moduleId, li, -1)}>
                          <IconArrowUp size={12} />
                        </Button>
                        <Button size="xs" variant="ghost" disabled={li === lectureList.length - 1} aria-label={`Move lecture ${lecture.title} down`} onClick={() => moveLecture(moduleId, li, 1)}>
                          <IconArrowDown size={12} />
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => setModal({ kind: "lecture-edit", moduleId, lecture })} aria-label={`Edit lecture ${lecture.title}`}>
                          <IconPencil size={12} />
                        </Button>
                        <Button size="xs" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setConfirm({ kind: "lecture", item: lecture })} aria-label={`Delete lecture ${lecture.title}`}>
                          Delete
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="border-t border-slate-100 px-5 py-3">
                <Button size="sm" variant="secondary" icon={<IconPlus size={13} />} onClick={() => setModal({ kind: "lecture-new", moduleId })}>
                  Add lecture
                </Button>
              </div>
            </Card>
          )
        })
      )}

      {modal?.kind?.startsWith("module") && (
        <ModuleModal
          courseId={courseId}
          module={modal.module}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            onChanged()
            toast.success(modal.module ? "Module updated" : "Module added")
          }}
        />
      )}
      {modal?.kind?.startsWith("lecture") && (
        <LectureModal
          courseId={courseId}
          moduleId={modal.moduleId}
          lecture={modal.lecture}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            onChanged()
            toast.success(modal.lecture ? "Lecture updated" : "Lecture added")
          }}
        />
      )}

      <ConfirmDialog
        open={confirm?.kind === "module"}
        danger
        title="Delete module"
        description={`“${confirm?.item?.title}” will be deleted together with its lectures and its assessment. This cannot be undone.`}
        confirmLabel="Delete module"
        busy={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === "lecture"}
        danger
        title="Delete lecture"
        description={`“${confirm?.item?.title}” will be permanently removed from this module.`}
        confirmLabel="Delete lecture"
        busy={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

function ModuleModal({ courseId, module, onClose, onSaved }) {
  const [form, setForm] = useState({ title: module?.title || "", description: module?.description || "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function save() {
    if (!form.title.trim()) {
      setError("A module title is required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const payload = { title: form.title.trim(), description: form.description.trim(), courseId }
      if (module) await updateLmsModule(idOf(module), payload)
      else await createLmsModule(payload)
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, "Could not save the module."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={module ? "Edit module" : "Add module"}
      description="Modules group lectures into one learning step."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={save}>
            {module ? "Save module" : "Add module"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField
          id="module-title"
          label="Module title"
          required
          data-autofocus
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <TextAreaField
          id="module-desc"
          label="Description"
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      </div>
    </Modal>
  )
}

function LectureModal({ courseId, moduleId, lecture, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: lecture?.title || "",
    content: lecture?.content || "",
    duration: lecture?.estimatedDurationMinutes ? String(lecture.estimatedDurationMinutes) : "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function save() {
    if (!form.title.trim() || !form.content.trim()) {
      setError("A lecture title and content are required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const payload = {
        module: moduleId,
        course: courseId,
        title: form.title.trim(),
        content: form.content.trim(),
        estimatedDurationMinutes: form.duration === "" ? 0 : Number(form.duration),
      }
      if (lecture) await updateLmsLecture(idOf(lecture), payload)
      else await createLmsLecture(payload)
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, "Could not save the lecture."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={lecture ? "Edit lecture" : "Add lecture"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={save}>
            {lecture ? "Save lecture" : "Add lecture"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_140px]">
          <TextField
            id="lecture-title"
            label="Lecture title"
            required
            data-autofocus
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <TextField
            id="lecture-duration"
            label="Duration"
            type="number"
            min="0"
            hint="mins"
            value={form.duration}
            onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
          />
        </div>
        <TextAreaField
          id="lecture-content"
          label="Content"
          required
          rows={8}
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          hint="What the learner reads for this lecture"
        />
        {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      </div>
    </Modal>
  )
}

/* ── Assessments tab ──────────────────────────────────────────────────────── */

const ASSESSMENT_DEFAULTS = {
  title: "",
  passingPercentage: 70,
  maxAttempts: 3,
  timeLimitMinutes: 15,
  shuffleQuestions: false,
  shuffleOptions: false,
  showExplanationAfterSubmit: true,
}

const QUESTION_DEFAULTS = {
  questionText: "",
  questionType: "multiple_choice",
  options: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ],
  explanation: "",
  points: 1,
}

function AssessmentsTab({ courseId, modules }) {
  const toast = useToast()
  const [assessments, setAssessments] = useState(null) // { [moduleId]: assessment|null }
  const [questions, setQuestions] = useState({})
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      const pairs = await Promise.all(
        modules.map(async (m) => {
          try {
            return [idOf(m), await getLmsAssessmentByModule(idOf(m))]
          } catch (err) {
            if (err?.response?.status === 404) return [idOf(m), null]
            throw err
          }
        })
      )
      const map = Object.fromEntries(pairs)
      setAssessments(map)
      const qPairs = await Promise.all(
        pairs
          .filter(([, a]) => idOf(a))
          .map(async ([moduleId, assessment]) => [moduleId, await getLmsQuestions(idOf(assessment)).catch(() => [])])
      )
      setQuestions(Object.fromEntries(qPairs))
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not load assessments."))
    } finally {
      setLoading(false)
    }
  }, [modules])

  useEffect(() => {
    load()
  }, [load])

  async function runConfirm() {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.kind === "assessment") await deleteLmsAssessment(idOf(confirm.item))
      if (confirm.kind === "question") await deleteLmsQuestion(idOf(confirm.item))
      toast.success(confirm.kind === "assessment" ? "Assessment deleted" : "Question deleted")
      setConfirm(null)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete it."))
    } finally {
      setBusy(false)
    }
  }

  if (modules.length === 0) {
    return (
      <Card className="border-dashed">
        <EmptyState
          title="Assessments need modules first"
          description="Each module can carry one assessment. Create a module in the Content tab, then come back here to quiz learners on it."
        />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {loadError && <InlineAlert tone="danger">{loadError}</InlineAlert>}
      {loading && !assessments ? (
        <div className="space-y-3">
          {modules.map((m) => (
            <div key={idOf(m)} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        modules.map((module, index) => {
          const moduleId = idOf(module)
          const assessment = assessments?.[moduleId]
          const questionList = questions[moduleId] ?? []
          return (
            <Card key={moduleId}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500">
                    {index + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900">{module.title}</h3>
                </div>
                {assessment ? (
                  <div className="flex items-center gap-1">
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={<IconPencil size={12} />}
                      onClick={() => setModal({ kind: "assessment", module, assessment })}
                    >
                      Edit
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => setConfirm({ kind: "assessment", item: assessment })}
                    >
                      Delete
                    </Button>
                  </div>
                ) : (
                  <Button size="xs" variant="secondary" icon={<IconPlus size={12} />} onClick={() => setModal({ kind: "assessment", module })} disabled={loading}>
                    Create assessment
                  </Button>
                )}
              </div>

              {assessment && (
                <div className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-600">
                    <span className="font-medium text-slate-800">{assessment.title}</span>
                    <Tag>Pass {assessment.passingPercentage}%</Tag>
                    <Tag>{assessment.maxAttempts} attempts</Tag>
                    <Tag>{assessment.timeLimitMinutes} min</Tag>
                    {assessment.shuffleQuestions && <Tag>Questions shuffled</Tag>}
                    {assessment.showExplanationAfterSubmit !== false && <Tag>Explanations shown after submit</Tag>}
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {questionList.length} question{questionList.length === 1 ? "" : "s"}
                      </p>
                      <Button size="xs" variant="secondary" icon={<IconPlus size={12} />} onClick={() => setModal({ kind: "question", assessment, moduleId })}>
                        Add question
                      </Button>
                    </div>
                    {questionList.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center text-xs text-slate-400">
                        No questions yet — add the first one so this assessment can be taken.
                      </p>
                    ) : (
                      <ol className="space-y-1.5">
                        {questionList.map((question, qi) => (
                          <li
                            key={idOf(question)}
                            className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3.5 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-slate-800">
                                {qi + 1}. {question.questionText}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {String(question.questionType).replace(/_/g, " ")} · {question.points} point{question.points === 1 ? "" : "s"} ·{" "}
                                {(question.options || []).length} options,{" "}
                                {(question.options || []).filter((o) => o.isCorrect).length} marked correct
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5">
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => setModal({ kind: "question", assessment, moduleId, question })}
                                aria-label={`Edit question ${qi + 1}`}
                              >
                                <IconPencil size={12} />
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => setConfirm({ kind: "question", item: question })}
                                aria-label={`Delete question ${qi + 1}`}
                              >
                                Delete
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )
        })
      )}

      {modal?.kind === "assessment" && (
        <AssessmentModal
          courseId={courseId}
          module={modal.module}
          assessment={modal.assessment}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            load()
            toast.success(modal.assessment ? "Assessment updated" : "Assessment created")
          }}
        />
      )}
      {modal?.kind === "question" && (
        <QuestionModal
          assessment={modal.assessment}
          question={modal.question}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            load()
            toast.success(modal.question ? "Question updated" : "Question added")
          }}
        />
      )}

      <ConfirmDialog
        open={confirm?.kind === "assessment"}
        danger
        title="Delete assessment"
        description={`“${confirm?.item?.title}” and all of its questions will be removed from this module.`}
        confirmLabel="Delete assessment"
        busy={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === "question"}
        danger
        title="Delete question"
        description="This question will be removed from the assessment."
        confirmLabel="Delete question"
        busy={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

function AssessmentModal({ courseId, module, assessment, onClose, onSaved }) {
  const [form, setForm] = useState(
    assessment
      ? {
          title: assessment.title || "",
          passingPercentage: assessment.passingPercentage ?? 70,
          maxAttempts: assessment.maxAttempts ?? 3,
          timeLimitMinutes: assessment.timeLimitMinutes ?? 15,
          shuffleQuestions: !!assessment.shuffleQuestions,
          shuffleOptions: !!assessment.shuffleOptions,
          showExplanationAfterSubmit: assessment.showExplanationAfterSubmit !== false,
        }
      : { ...ASSESSMENT_DEFAULTS, title: `${module.title} — assessment` }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function save() {
    if (!form.title.trim()) {
      setError("An assessment title is required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        moduleId: idOf(module),
        courseId,
        passingPercentage: Number(form.passingPercentage),
        maxAttempts: Number(form.maxAttempts),
        timeLimitMinutes: Number(form.timeLimitMinutes),
      }
      if (assessment) await updateLmsAssessment(idOf(assessment), payload)
      else await createLmsAssessment(payload)
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, "Could not save the assessment."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      size="lg"
      title={assessment ? "Edit assessment" : "Create assessment"}
      description={`One assessment per module: “${module.title}”.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={save}>
            {assessment ? "Save assessment" : "Create assessment"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField
          id="assessment-title"
          label="Title"
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <TextField
            id="assessment-pass"
            label="Passing score"
            type="number"
            min="0"
            max="100"
            hint="%"
            value={form.passingPercentage}
            onChange={(e) => setForm((f) => ({ ...f, passingPercentage: e.target.value }))}
          />
          <TextField
            id="assessment-attempts"
            label="Max attempts"
            type="number"
            min="1"
            value={form.maxAttempts}
            onChange={(e) => setForm((f) => ({ ...f, maxAttempts: e.target.value }))}
          />
          <TextField
            id="assessment-time"
            label="Time limit"
            type="number"
            min="1"
            hint="mins"
            value={form.timeLimitMinutes}
            onChange={(e) => setForm((f) => ({ ...f, timeLimitMinutes: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3.5 ring-1 ring-slate-100 sm:grid-cols-3">
          <CheckboxField
            label="Shuffle questions"
            checked={form.shuffleQuestions}
            onChange={(e) => setForm((f) => ({ ...f, shuffleQuestions: e.target.checked }))}
          />
          <CheckboxField
            label="Shuffle options"
            checked={form.shuffleOptions}
            onChange={(e) => setForm((f) => ({ ...f, shuffleOptions: e.target.checked }))}
          />
          <CheckboxField
            label="Show explanations"
            description="After the learner submits"
            checked={form.showExplanationAfterSubmit}
            onChange={(e) => setForm((f) => ({ ...f, showExplanationAfterSubmit: e.target.checked }))}
          />
        </div>
        {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      </div>
    </Modal>
  )
}

function QuestionModal({ assessment, question, onClose, onSaved }) {
  const [form, setForm] = useState(
    question
      ? {
          questionText: question.questionText || "",
          questionType: question.questionType || "multiple_choice",
          options: (question.options || []).map((o) => ({ text: o.text, isCorrect: !!o.isCorrect })),
          explanation: question.explanation || "",
          points: question.points ?? 1,
        }
      : { ...QUESTION_DEFAULTS }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function setOption(index, patch) {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => (i === index ? { ...o, ...patch } : o)),
    }))
  }

  async function save() {
    if (!form.questionText.trim() || form.options.some((o) => !o.text.trim())) {
      setError("Add the question and text for every option.")
      return
    }
    if (!form.options.some((o) => o.isCorrect)) {
      setError("Mark at least one option as correct.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const payload = {
        assessmentId: idOf(assessment),
        questionText: form.questionText.trim(),
        questionType: form.questionType,
        options: form.options,
        explanation: form.explanation.trim(),
        points: Number(form.points),
      }
      if (question) await updateLmsQuestion(idOf(question), payload)
      else await createLmsQuestion(payload)
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, "Could not save the question."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      size="lg"
      title={question ? "Edit question" : "Add question"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={save}>
            {question ? "Save question" : "Add question"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextAreaField
          id="question-text"
          label="Question"
          required
          rows={2}
          value={form.questionText}
          onChange={(e) => setForm((f) => ({ ...f, questionText: e.target.value }))}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            id="question-type"
            label="Type"
            value={form.questionType}
            onChange={(e) => setForm((f) => ({ ...f, questionType: e.target.value }))}
          >
            <option value="multiple_choice">Multiple choice</option>
            <option value="true_false">True / false</option>
            <option value="multi_select">Multi select</option>
            <option value="ordering">Ordering</option>
          </SelectField>
          <TextField
            id="question-points"
            label="Points"
            type="number"
            min="1"
            value={form.points}
            onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-slate-600">Options — tick the correct answer(s)</p>
          <div className="space-y-2">
            {form.options.map((option, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={option.text}
                  onChange={(e) => setOption(i, { text: e.target.value })}
                  placeholder={`Option ${i + 1}`}
                  aria-label={`Option ${i + 1}`}
                  className="h-9 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={option.isCorrect}
                    onChange={(e) => setOption(i, { isCorrect: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 accent-[var(--color-brand-800)]"
                  />
                  Correct
                </label>
                {form.options.length > 2 && (
                  <Button
                    size="xs"
                    variant="ghost"
                    aria-label={`Remove option ${i + 1}`}
                    onClick={() => setForm((f) => ({ ...f, options: f.options.filter((_, j) => j !== i) }))}
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button size="xs" variant="ghost" className="mt-2" icon={<IconPlus size={11} />} onClick={() => setForm((f) => ({ ...f, options: [...f.options, { text: "", isCorrect: false }] }))}>
            Add option
          </Button>
        </div>

        <TextAreaField
          id="question-explanation"
          label="Explanation"
          rows={2}
          hint="optional"
          value={form.explanation}
          onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
        />
        {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      </div>
    </Modal>
  )
}

/* ── Settings tab ─────────────────────────────────────────────────────────── */

function SettingsTab({ course, categories, totalLectures, onChanged, onRequestDelete }) {
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(courseFormFromRecord(course))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    setForm(courseFormFromRecord(course))
  }, [course])

  async function save() {
    const nextErrors = validateCourseForm(form, { requireCategory: true })
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    setError("")
    try {
      // updateLmsCourse maps categoryId → category exactly like the previous UI did
      await updateLmsCourse(idOf(course) ?? course?.id, buildCoursePayload(form))
      toast.success("Course details updated")
      setEditing(false)
      onChanged()
    } catch (err) {
      setError(getErrorMessage(err, "Could not update the course."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Course information"
          subtitle="Catalog entry the learner sees before enrolling."
          actions={
            editing ? null : (
              <Button size="sm" variant="secondary" icon={<IconPencil size={12} />} onClick={() => setEditing(true)}>
                Edit
              </Button>
            )
          }
        />
        <CardBody>
          {editing ? (
            <div>
              <CourseFormFields
                form={form}
                onChange={(k, v) => {
                  setForm((f) => ({ ...f, [k]: v }))
                  setErrors((e) => ({ ...e, [k]: undefined }))
                }}
                errors={errors}
                categories={categories}
              />
              {error && <p className="mt-3"><InlineAlert tone="danger">{error}</InlineAlert></p>}
              <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button variant="ghost" onClick={() => { setEditing(false); setForm(courseFormFromRecord(course)); setError("") }} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="primary" loading={saving} onClick={save}>
                  Save changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <DetailGrid cols={3}>
                <DetailItem label="Title" value={course?.title} />
                <DetailItem label="Slug" value={course?.slug} />
                <DetailItem label="Category" value={course?.category?.name} />
                <DetailItem label="Difficulty" value={course?.difficulty} />
                <DetailItem label="Duration" value={durationLabel(course?.estimatedDurationMinutes)} />
                <DetailItem label="Badge" value={course?.badge ? String(course.badge).toUpperCase() : "None"} />
                <DetailItem label="Modules" value={course?.totalModules ?? "—"} />
                <DetailItem label="Lectures" value={totalLectures ?? course?.totalLectures ?? "—"} />
                <DetailItem label="Quiz questions" value={course?.totalQuizQuestions ?? 0} />
                <DetailItem label="Created" value={formatDate(course?.createdAt)} />
                <DetailItem label="Last updated" value={formatDate(course?.updatedAt)} />
                <DetailItem label="Published at" value={formatDate(course?.publishedAt)} />
              </DetailGrid>
              {course?.description && (
                <p className="rounded-lg bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-600 ring-1 ring-slate-100">
                  {course.description}
                </p>
              )}
              {Array.isArray(course?.learningOutcomes) && course.learningOutcomes.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Learning outcomes</p>
                  <ul className="list-disc space-y-0.5 pl-5 text-[13px] text-slate-600">
                    {course.learningOutcomes.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(course?.tags) && course.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {course.tags.map((t) => (
                    <Tag key={t}>#{t}</Tag>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="border-red-200">
        <CardHeader
          title="Danger zone"
          subtitle="Removing a course takes its entire structure with it."
          icon={<span className="text-red-500">⚠</span>}
        />
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-slate-500">
            Delete permanently removes modules, lectures, assessments, questions and their history.
          </p>
          <Button variant="dangerGhost" size="sm" onClick={onRequestDelete}>
            Delete course
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}
