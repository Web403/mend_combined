import { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { approveEnrollment, getCourseEnrollments, getLmsCourse, getLmsCourses } from "../../api/lms"
import useAsyncData from "../../hooks/useAsyncData"
import useUrlState from "../../hooks/useUrlState"
import PageHeader from "../../components/ui/PageHeader"
import Button from "../../components/ui/Button"
import Card, { CardBody } from "../../components/ui/Card"
import StatusBadge from "../../components/ui/StatusBadge"
import DataTable from "../../components/ui/DataTable"
import { EmptyState } from "../../components/ui/States"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import { FilterSelect } from "../../components/ui/Toolbar"
import { useToast } from "../../hooks/useToast"
import { IconCheckCircle, IconEnrollments } from "../../components/ui/Icons"
import { enrollmentStatus, isEnrollmentApprovable } from "../../utils/labels"
import { avatarTone, formatDate, getInitials } from "../../utils/format"

const idOf = (item) => item.id ?? item._id

const learner = (e) => {
  const name =
    e.user?.name ||
    [e.user?.profile?.firstName, e.user?.profile?.lastName].filter(Boolean).join(" ") ||
    e.user?.email ||
    e.learner?.name ||
    "Learner"
  return { name, email: e.user?.email ?? e.learner?.email ?? "" }
}

/**
 * Enrollment review. Enrollments belong to a course, so a course is the
 * scope — it's kept in the URL (?course=) to stay deep-linkable and shareable.
 */
export default function EnrollmentsPage() {
  const toast = useToast()
  const [q, setQ] = useUrlState({ course: "", status: "", page: 1, limit: 20 })

  const [approveTarget, setApproveTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const loadCourses = useCallback(async () => {
    const res = await getLmsCourses({ page: 1, limit: 100, sortBy: "title", sortOrder: "asc" })
    return res.items ?? []
  }, [])

  const { data: coursesData, error: coursesError } = useAsyncData(loadCourses)
  const courses = coursesData ?? []

  const loadCourse = useCallback(async () => {
    if (!q.course) return null
    return getLmsCourse(q.course)
  }, [q.course])
  const { data: activeCourse } = useAsyncData(loadCourse, { deps: [q.course] })

  const load = useCallback(async () => {
    if (!q.course) return null
    return getCourseEnrollments(q.course, {
      page: q.page,
      limit: q.limit,
      status: q.status || undefined,
    })
  }, [q.course, q.page, q.limit, q.status])

  const { data, loading, error, reload, runAction } = useAsyncData(load, { deps: [q.course, q.page, q.limit, q.status] })
  const enrollments = data?.items ?? []
  const pagination = data?.pagination ?? { total: 0 }

  async function approve() {
    if (!approveTarget) return
    setBusy(true)
    const result = await runAction(() => approveEnrollment(idOf(approveTarget)))
    setBusy(false)
    if (result.ok) {
      toast.success(`${learner(approveTarget).name} approved — they can start the course now`)
      setApproveTarget(null)
      reload()
    }
  }

  const columns = useMemo(
    () => [
      {
        key: "learner",
        label: "Learner",
        width: "18rem",
        render: (e) => {
          const l = learner(e)
          return (
            <div className="flex items-center gap-2.5">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarTone(l.email || l.name)}`}>
                {getInitials(l.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-900">{l.name}</span>
                <span className="block truncate text-[11px] text-slate-400">{l.email}</span>
              </span>
            </div>
          )
        },
      },
      {
        key: "status",
        label: "Status",
        render: (e) => {
          const st = enrollmentStatus(e.status)
          return <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
        },
      },
      {
        key: "progress",
        label: "Progress",
        render: (e) => {
          const pct = Number(e.progressPercentage ?? 0)
          return (
            <div className="flex min-w-36 items-center gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : "bg-brand-500"}`}
                  style={{ width: `${Math.min(100, pct)}%` }}
                />
              </div>
              <span className="text-xs tabular-nums text-slate-500">{pct}%</span>
            </div>
          )
        },
      },
      {
        key: "enrolledAt",
        label: "Enrolled",
        render: (e) => <span className="whitespace-nowrap text-slate-500">{formatDate(e.enrolledAt ?? e.createdAt)}</span>,
      },
      {
        key: "completedAt",
        label: "Completed",
        render: (e) => <span className="whitespace-nowrap text-slate-500">{formatDate(e.completedAt)}</span>,
      },
      {
        key: "actions",
        label: "",
        align: "right",
        render: (e) =>
          isEnrollmentApprovable(e.status) ? (
            <Button size="xs" variant="primary" icon={<IconCheckCircle size={12} />} onClick={() => setApproveTarget(e)}>
              Approve
            </Button>
          ) : (
            <span className="text-[11px] text-slate-400">No action needed</span>
          ),
      },
    ],
    []
  )

  return (
    <div>
      <PageHeader
        title="Enrollments"
        description="Review learners waiting for access and watch their progress through a course."
      />

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="block min-w-64">
          <span className="mb-1 block text-xs font-semibold text-slate-600">Course</span>
          <select
            value={q.course}
            onChange={(e) => setQ({ course: e.target.value })}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            <option value="">{coursesError ? "Could not load courses" : "Select a course…"}</option>
            {courses.map((c) => (
              <option key={idOf(c)} value={idOf(c)}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        {q.course && (
          <FilterSelect
            label="Status filter"
            value={q.status}
            onChange={(v) => setQ({ status: v })}
            options={[
              { value: "", label: "All statuses" },
              { value: "applied", label: "Needs approval" },
              { value: "enrolled", label: "Enrolled" },
              { value: "in_progress", label: "In progress" },
              { value: "completed", label: "Completed" },
              { value: "dropped", label: "Dropped" },
            ]}
          />
        )}
        {q.course && (
          <p className="ml-auto text-xs text-slate-400">
            {loading ? "Loading…" : `${pagination.total ?? 0} enrollment${pagination.total === 1 ? "" : "s"}`}
          </p>
        )}
      </div>

      {activeCourse?.description ? (
        <Card className="mb-4 border-brand-100 bg-brand-50/40">
          <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3.5">
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-slate-600">{activeCourse.description}</p>
            <Link
              to={`/dashboard/learning/courses/${q.course}`}
              className="shrink-0 text-xs font-semibold text-brand-700 no-underline hover:underline"
            >
              Open course →
            </Link>
          </CardBody>
        </Card>
      ) : null}

      {!q.course ? (
        <Card className="border-dashed">
          <EmptyState
            icon={<IconEnrollments size={20} />}
            title="Pick a course to review enrollments"
            description="Enrollments are managed per course so approvals always happen with the right catalog context. The list is remembered in the URL."
          />
        </Card>
      ) : (
        <DataTable
          columns={columns}
          rows={enrollments}
          keyField="_id"
          loading={loading}
          error={error || ""}
          onRetry={reload}
          pagination={{
            page: q.page,
            limit: q.limit,
            total: pagination.total ?? 0,
            totalPages: pagination.totalPages ?? Math.ceil((pagination.total ?? 0) / q.limit),
            onPage: (p) => setQ({ page: p }, { resetPage: false }),
          }}
          empty={{
            title: q.status ? "No enrollments with this status" : "No one has enrolled in this course yet",
            description: q.status
              ? "Switch the status filter to see other enrollments."
              : "Learners can apply from the hotel-side learning app once the course is published.",
          }}
        />
      )}

      <ConfirmDialog
        open={!!approveTarget}
        title="Approve enrollment"
        description={
          approveTarget
            ? `${learner(approveTarget).name} will be enrolled in “${activeCourse?.title ?? "this course"}” and can start learning immediately.`
            : ""
        }
        confirmLabel="Approve learner"
        busy={busy}
        onConfirm={approve}
        onCancel={() => !busy && setApproveTarget(null)}
      />
    </div>
  )
}
