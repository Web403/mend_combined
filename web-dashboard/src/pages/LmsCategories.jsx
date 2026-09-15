import { useCallback, useEffect, useState } from "react"
import { createLmsCategory, deleteLmsCategory, getLmsCategories, updateLmsCategory } from "../api/lms"
import { getErrorMessage } from "../api/api"
import ConfirmModal from "../components/ConfirmModal"

const emptyForm = { name: "", description: "", isActive: true }
const idOf = (item) => item.id ?? item._id

export default function LmsCategories() {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try { setCategories(await getLmsCategories()) }
    catch (err) { setError(getErrorMessage(err, "Could not load LMS categories.")) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function startEdit(category) {
    setEditing(category)
    setForm({ name: category.name || "", description: category.description || "", isActive: category.isActive !== false })
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.name.trim()) return setError("A category name is required.")
    setSaving(true); setError("")
    try {
      const payload = { ...form, name: form.name.trim(), description: form.description.trim() }
      if (editing) await updateLmsCategory(idOf(editing), payload)
      else await createLmsCategory(payload)
      setForm(emptyForm); setEditing(null); await load()
    } catch (err) { setError(getErrorMessage(err, "Could not save the category.")) }
    finally { setSaving(false) }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteLmsCategory(idOf(deleteTarget))
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete the category."))
    } finally {
      setDeleting(false)
    }
  }

  return <div className="max-w-6xl">
    <ConfirmModal
      open={!!deleteTarget}
      danger
      title="Delete category"
      description={`Delete "${deleteTarget?.name}"? Courses linked to this category may be affected.`}
      confirmLabel="Delete category"
      loading={deleting}
      onConfirm={confirmDelete}
      onCancel={() => !deleting && setDeleteTarget(null)}
    />
    <div className="mb-6"><h1 className="text-xl font-bold text-slate-900">LMS Categories</h1><p className="text-sm text-slate-500">Organize the course catalog for your platform.</p></div>
    {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>}
    <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="h-fit rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-slate-900">{editing ? "Edit category" : "New category"}</h2>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Category name" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows="4" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" />
        <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label>
        <div className="flex gap-2"><button disabled={saving} className="rounded-lg bg-[#1A2F5E] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving..." : editing ? "Save changes" : "Create category"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(emptyForm) }} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Cancel</button>}</div>
      </form>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? <p className="p-6 text-sm text-slate-500">Loading categories...</p> : categories.length === 0 ? <p className="p-6 text-sm text-slate-500">No categories yet.</p> : categories.map((category) => <div key={idOf(category)} className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 last:border-0"><div><div className="flex gap-2"><h3 className="font-semibold text-slate-800">{category.name}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${category.isActive === false ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>{category.isActive === false ? "Inactive" : "Active"}</span></div><p className="mt-1 text-sm text-slate-500">{category.description || "No description"}</p></div><div className="flex gap-2"><button onClick={() => startEdit(category)} className="text-sm font-medium text-blue-600">Edit</button><button onClick={() => setDeleteTarget(category)} className="text-sm font-medium text-red-600">Delete</button></div></div>)}
      </div>
    </div>
  </div>
}
