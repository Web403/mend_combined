import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  archiveLmsCourse,
  deleteLmsCourse,
  getLmsCategories,
  getLmsCourses,
  publishLmsCourse,
} from "../../api/lms"
import useAsyncData from "../../hooks/useAsyncData"
import useDebouncedValue from "../../hooks/useDebouncedValue"
import useUrlState from "../../hooks/useUrlState"
import PageHeader from "../../components/ui/PageHeader"
import Button, { LinkButton } from "../../components/ui/Button"
import StatusBadge, { Tag } from "../../components/ui/StatusBadge"
import DataTable from "../../components/ui/DataTable"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import Dropdown from "../../components/ui/Dropdown"
import { ActiveFilterChips, FilterSelect, SearchInput, Toolbar } from "../../components/ui/Toolbar"
import { useToast } from "../../hooks/useToast"
import { IconPlus, IconBook } from "../../components/ui/Icons"
import { courseStatus } from "../../utils/labels"
import { durationLabel, formatDate } from "../../utils/format"

const idOf = (item) => item.id ?? item._id

const URL_DEFAULTS = {
  q: "",
  category: "",
  status: "",
  sort: "updatedAt",
  order: "desc",
  page: 1,
  limit: 20,
}

/**
 * Catalog management. Publishing/archiving/deleting a course is deliberately
 * placed behind a confirm; "Manage" (the course detail page) is the primary
 * action because content editing happens there.
 */
export default function CoursesPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [q, setQ] = useUrlState(URL_DEFAULTS)
  const [searchInput, setSearchInput] = useState(q.q)
  const search = useDebouncedValue(searchInput, 300)
  const [confirm, setConfirm] = useState(null) // {type:'publish'|'archive'|'delete', course}
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (search !== q.q) setQ({ q: search })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const load = useCallback(async () => {
    const [courses, categories] = await Promise.all([
      getLmsCourses({
        page: q.page,
        limit: q.limit,
        search: search || undefined,
        category: q.category || undefined,
        status: q.status || undefined,
        sortBy: q.sort,
        sortOrder: q.order,
      }),
      getLmsCategories(),
    ])
    return { ...courses, categories }
  }, [JSON.stringify({ ...q, search })]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading, error, reload, runAction } = useAsyncData(load)
  const courses = data?.items ?? []
  const categories = data?.categories ?? []
  const pagination = data?.pagination ?? { total: courses.length, page: q.page, totalPages: 1 }

  async function runConfirmation() {
    if (!confirm) return
    setPending(true)
    const { type, course } = confirm
    const result = await runAction(async () => {
      if (type === "publish") return publishLmsCourse(idOf(course))
      if (type === "archive") return archiveLmsCourse(idOf(course))
      if (type === "delete") return deleteLmsCourse(idOf(course))
    })
    setPending(false)
    if (result.ok) {
      if (type === "publish") toast.success(`“${course.title}” is now published and visible to learners`)
      if (type === "archive") toast.success(`“${course.title}” archived — learners no longer see it`)
      if (type === "delete") {
        toast.success(`“${course.title}” deleted`)
        if (confirm.type === "delete" && courses.length === 1 && q.page > 1) setQ({ page: q.page - 1 })
      }
      setConfirm(null)
      reload()
    }
  }

  const chips = [
    q.category && {
      key: "category",
      label: "Category",
      value: categories.find((c) => String(idOf(c)) === q.category)?.name ?? q.category,
    },
    q.status && { key: "status", label: "Status", value: q.status },
  ].filter(Boolean)

  const onSort = (key) => {
    if (q.sort === key) setQ({ order: q.order === "asc" ? "desc" : "asc" }, { resetPage: false })
    else setQ({ sort: key, order: "asc" })
  }

  const columns = useMemo(
    () => [
      {
        key: "title",
        label: "Course",
        sortable: true,
        width: "22rem",
        render: (c) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{c.title}</p>
            {c.description && <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-400">{c.description}</p>}
          </div>
        ),
      },
      {
        key: "category",
        label: "Category",
        render: (c) => (c.category?.name ? <Tag>{c.category.name}</Tag> : <span className="text-slate-400">Uncategorized</span>),
      },
      {
        key: "difficulty",
        label: "Level",
        render: (c) => <span className="capitalize text-slate-600">{c.difficulty || "beginner"}</span>,
      },
      {
        key: "structure",
        label: "Content",
        render: (c) => (
          <span className="whitespace-nowrap text-slate-500">
            {c.totalModules || 0} modules · {c.totalQuizQuestions || 0} questions
          </span>
        ),
      },
      {
        key: "estimatedDurationMinutes",
        label: "Duration",
        render: (c) => <span className="whitespace-nowrap text-slate-500">{durationLabel(c.estimatedDurationMinutes)}</span>,
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (c) => {
          const st = courseStatus(c)
          return <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
        },
      },
      {
        key: "updatedAt",
        label: "Updated",
        sortable: true,
        render: (c) => <span className="whitespace-nowrap text-slate-500">{formatDate(c.updatedAt ?? c.createdAt)}</span>,
      },
      {
        key: "actions",
        label: "",
        align: "right",
        render: (c) => {
          const status = String(c.status ?? (c.isPublished ? "published" : "draft")).toLowerCase()
          return (
            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <LinkButton size="xs" variant="secondary" to={`/dashboard/learning/courses/${idOf(c)}`}>
                Manage
              </LinkButton>
              <Dropdown
                label={`More actions for ${c.title}`}
                items={[
                  status === "published"
                    ? { label: "Archive course", onClick: () => setConfirm({ type: "archive", course: c }) }
                    : { label: "Publish course", onClick: () => setConfirm({ type: "publish", course: c }) },
                  { label: "Course settings", onClick: () => navigate(`/dashboard/learning/courses/${idOf(c)}?tab=settings`) },
                  {
                    label: "Delete course",
                    danger: true,
                    separatorBefore: true,
                    onClick: () => setConfirm({ type: "delete", course: c }),
                  },
                ]}
              />
            </div>
          )
        },
      },
    ],
    [navigate]
  )

  return (
    <div>
      <PageHeader
        title="Courses"
        description="The platform learning catalog. A course bundles its modules, lectures, assessments and enrollments in one place."
        actions={
          <LinkButton to="/dashboard/learning/courses/new" variant="primary" icon={<IconPlus size={14} />}>
            New course
          </LinkButton>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Toolbar className="flex-1">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search courses…"
            className="w-full max-w-xs"
            label="Search courses"
          />
          <FilterSelect
            label="Status"
            value={q.status}
            onChange={(v) => setQ({ status: v })}
            options={[
              { value: "", label: "Any status" },
              { value: "draft", label: "Draft" },
              { value: "published", label: "Published" },
              { value: "archived", label: "Archived" },
            ]}
          />
          <FilterSelect
            label="Category"
            value={q.category}
            onChange={(v) => setQ({ category: v })}
            options={[{ value: "", label: "Any category" }, ...categories.map((c) => ({ value: idOf(c), label: c.name }))]}
          />
          <ActiveFilterChips chips={chips} onRemove={(k) => setQ({ [k]: "" })} onClear={() => setQ({ category: "", status: "" })} />
        </Toolbar>
        <p className="text-xs text-slate-400">{loading ? "Loading…" : `${pagination.total ?? courses.length} courses`}</p>
      </div>

      <DataTable
        columns={columns}
        rows={courses}
        keyField="_id"
        loading={loading}
        error={error && !data ? error : ""}
        onRetry={reload}
        sort={{ by: q.sort, order: q.order, onSort }}
        pagination={{
          page: q.page,
          limit: q.limit,
          total: pagination.total ?? 0,
          totalPages: pagination.totalPages,
          onPage: (p) => setQ({ page: p }, { resetPage: false }),
        }}
        onRowClick={(c) => navigate(`/dashboard/learning/courses/${idOf(c)}`)}
        empty={{
          icon: <IconBook size={20} />,
          title: "No courses yet",
          description:
            courses.length === 0 && !chips.length && !q.q
              ? "Create the first course to start building the catalog: modules, lectures and assessments follow."
              : "Try changing your search or clearing the filters.",
          action:
            chips.length || q.q ? (
              <Button size="sm" variant="secondary" onClick={() => { setSearchInput(""); setQ({ q: "", category: "", status: "" }) }}>
                Clear filters
              </Button>
            ) : (
              <LinkButton size="sm" variant="primary" to="/dashboard/learning/courses/new">
                New course
              </LinkButton>
            ),
        }}
      />

      <p className="mt-3 text-[11px] text-slate-400">
        Enrollments are reviewed on the{" "}
        <Link className="font-medium text-brand-600 hover:underline" to="/dashboard/learning/enrollments">
          Enrollments
        </Link>{" "}
        page. Learner progress itself is owned by each hotel's dashboard.
      </p>

      <ConfirmDialog
        open={confirm?.type === "publish"}
        title="Publish course"
        description={`“${confirm?.course?.title}” becomes visible in the learning catalog and open for enrollment immediately.`}
        confirmLabel="Publish course"
        busy={pending}
        onConfirm={runConfirmation}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.type === "archive"}
        danger
        title="Archive course"
        description={`“${confirm?.course?.title}” is hidden from the catalog. Learners keep their history, but nobody can enroll until it's published again.`}
        confirmLabel="Archive course"
        busy={pending}
        onConfirm={runConfirmation}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.type === "delete"}
        danger
        requireText={confirm?.course?.title}
        title="Delete course"
        description={`“${confirm?.course?.title}” will be permanently removed together with its modules, lectures and assessments. This cannot be undone.`}
        confirmLabel="Delete course"
        busy={pending}
        onConfirm={runConfirmation}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
