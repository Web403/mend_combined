import { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { createLmsCategory, deleteLmsCategory, getLmsCategories, updateLmsCategory } from "../../api/lms"
import { getErrorMessage } from "../../api/api"
import useAsyncData from "../../hooks/useAsyncData"
import PageHeader from "../../components/ui/PageHeader"
import Button, { LinkButton } from "../../components/ui/Button"
import StatusBadge from "../../components/ui/StatusBadge"
import DataTable from "../../components/ui/DataTable"
import Modal from "../../components/ui/Modal"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import Dropdown from "../../components/ui/Dropdown"
import { InlineAlert } from "../../components/ui/States"
import { TextAreaField, TextField, CheckboxField } from "../../components/ui/Field"
import { useToast } from "../../hooks/useToast"
import { IconCategory, IconPlus } from "../../components/ui/Icons"
import { formatDate } from "../../utils/format"

const idOf = (item) => item.id ?? item._id
const EMPTY_FORM = { name: "", description: "", isActive: true }

/**
 * Categories keep the catalog organized. The previous UI kept a permanent
 * side-form rail open on every visit; here it's a focused table plus
 * create/edit modals (short forms → modals is the chosen pattern).
 */
export default function CategoriesPage() {
  const toast = useToast()
  const load = useCallback(() => getLmsCategories(), [])
  const { data: categories = [], loading, error, reload, runAction } = useAsyncData(load)

  const [modal, setModal] = useState(null) // null | {editing}
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)

  const list = Array.isArray(categories) ? categories : []

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Category",
        width: "16rem",
        render: (c) => (
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{c.name}</p>
            <p className="truncate text-[11px] text-slate-400">{c.slug ? `/${c.slug}` : ""}</p>
          </div>
        ),
      },
      {
        key: "description",
        label: "Description",
        render: (c) => <span className={c.description ? "text-slate-600" : "text-slate-400"}>{c.description || "No description"}</span>,
      },
      {
        key: "status",
        label: "Status",
        render: (c) =>
          c.isActive === false ? <StatusBadge tone="neutral">Inactive</StatusBadge> : <StatusBadge tone="success">Active</StatusBadge>,
      },
      {
        key: "courses",
        label: "Used by",
        render: (c) => {
          const n = c.courseCount ?? c.courses?.length
          return n == null ? (
            <Link to="/dashboard/learning/courses" className="text-slate-500 no-underline hover:text-brand-700 hover:underline">
              View courses
            </Link>
          ) : (
            <span className="text-slate-600">
              {n} course{n === 1 ? "" : "s"}
            </span>
          )
        },
      },
      {
        key: "updatedAt",
        label: "Updated",
        render: (c) => <span className="whitespace-nowrap text-slate-500">{formatDate(c.updatedAt ?? c.createdAt)}</span>,
      },
      {
        key: "actions",
        label: "",
        align: "right",
        render: (c) => (
          <div className="flex items-center justify-end gap-1">
            <Button size="xs" variant="secondary" onClick={() => setModal({ editing: c })}>
              Edit
            </Button>
            <Dropdown
              label={`More actions for ${c.name}`}
              items={[
                {
                  label: c.isActive === false ? "Activate category" : "Deactivate category",
                  onClick: async () => {
                    const result = await runAction(() =>
                      updateLmsCategory(idOf(c), { isActive: c.isActive === false })
                    )
                    if (result.ok) {
                      toast.success(`${c.name} ${c.isActive === false ? "activated" : "deactivated"}`)
                      reload()
                    }
                  },
                },
                {
                  label: "Delete category",
                  danger: true,
                  separatorBefore: true,
                  onClick: () => setConfirm(c),
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [reload, runAction, toast]
  )

  async function confirmDelete() {
    if (!confirm) return
    setBusy(true)
    const result = await runAction(() => deleteLmsCategory(idOf(confirm)))
    setBusy(false)
    if (result.ok) {
      toast.success(`Category “${confirm.name}” deleted`)
      setConfirm(null)
      reload()
    }
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Top-level organization for the course catalog. Every course must belong to one category."
        actions={
          <Button variant="primary" size="sm" icon={<IconPlus size={14} />} onClick={() => setModal({ editing: null })}>
            New category
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={list}
        keyField="_id"
        loading={loading}
        error={error ? (typeof error === "string" ? error : error.message) : ""}
        onRetry={reload}
        empty={{
          icon: <IconCategory size={20} />,
          title: "No categories yet",
          description: "Categories group courses in the catalog (e.g. “Housekeeping”, “Food safety”). Create one before adding courses.",
          action: (
            <Button size="sm" variant="primary" icon={<IconPlus size={13} />} onClick={() => setModal({ editing: null })}>
              New category
            </Button>
          ),
        }}
      />

      <p className="mt-3 text-[11px] text-slate-400">
        Courses reference categories when they are created — manage them on the{" "}
        <LinkButton variant="link" size="sm" to="/dashboard/learning/courses" className="h-auto px-0">
          Courses
        </LinkButton>{" "}
        page.
      </p>

      {modal && <CategoryModal category={modal.editing} onClose={() => setModal(null)} onSaved={() => {
        setModal(null)
        toast.success(modal.editing ? "Category updated" : "Category created")
        reload()
      }} />}

      <ConfirmDialog
        open={!!confirm}
        danger
        title="Delete category"
        description={`“${confirm?.name}” will be removed from the catalog. Courses linked to it may become uncategorized — delete or reassign them first if that matters.`}
        confirmLabel="Delete category"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => !busy && setConfirm(null)}
      />
    </div>
  )
}

function CategoryModal({ category, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: category?.name || "",
    description: category?.description || "",
    isActive: category ? category.isActive !== false : true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function save() {
    if (!form.name.trim()) {
      setError("A category name is required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const payload = { ...form, name: form.name.trim(), description: form.description.trim() }
      if (category) await updateLmsCategory(idOf(category), payload)
      else await createLmsCategory(payload)
      onSaved()
    } catch (err) {
      setError(
        err?.response?.status === 409
          ? "A category with this name already exists."
          : getErrorMessage(err, "Could not save the category.")
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title={category ? "Edit category" : "New category"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={save}>
            {category ? "Save changes" : "Create category"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <TextField
          id="category-name"
          label="Name"
          required
          data-autofocus
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          hint="URL slug is generated automatically"
        />
        <TextAreaField
          id="category-desc"
          label="Description"
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <CheckboxField
          label="Active"
          description="Inactive categories are hidden from learners"
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
        />
        {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      </div>
    </Modal>
  )
}
