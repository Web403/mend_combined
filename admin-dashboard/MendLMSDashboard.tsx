// ─────────────────────────────────────────────────────────────────────────────
// Mend Admin — LMS Course Dashboard
// Self-contained React + Tailwind component. In a real Vite project each
// section below (pages, components) would live in its own file; they are
// merged here for single-file delivery.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { useAuth } from "./src/context/AuthContext";

// ─── Types ───────────────────────────────────────────────────────────────────

type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type CourseCategory =
  | "Food & Beverage" | "Housekeeping" | "Front Office" | "Compliance"
  | "Safety" | "Leadership" | "Customer Service" | "Other";

const CATEGORIES: CourseCategory[] = [
  "Food & Beverage","Housekeeping","Front Office","Compliance",
  "Safety","Leadership","Customer Service","Other",
];
const STATUSES: CourseStatus[] = ["DRAFT","PUBLISHED","ARCHIVED"];

interface Course {
  id: string; hotelId: string; title: string; description: string;
  category: CourseCategory; thumbnailUrl?: string; createdBy: string;
  status: CourseStatus; lectureCount: number; createdAt: string; updatedAt: string;
}
interface Lecture {
  id: string; hotelId: string; courseId: string; title: string;
  description?: string; videoUrl: string; duration: number;
  notes?: string; order: number; createdAt: string; updatedAt: string;
}
interface CourseWithLectures extends Course { lectures: Lecture[]; }
interface PaginationMeta { page: number; limit: number; total: number; totalPages: number; }

// ─── Axios instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) || "http://localhost:3000/api/v1",
  headers: { "Content-Type": "application/json" },
});
api.interceptors.request.use((config) => {
  // Use the canonical auth storage key; falls back to legacy key for compatibility
  const token = localStorage.getItem("mend_access_token") ?? localStorage.getItem("adminToken");
  const hotelId = localStorage.getItem("mend_hotel_id") ?? localStorage.getItem("hotelId");
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  if (hotelId) config.headers["X-Tenant-Id"] = hotelId;
  return config;
});

function unwrap<T>(res: { data: { success: boolean; message?: string; data: T | null; meta?: PaginationMeta } }): T {
  if (!res.data.success || res.data.data === null) throw new Error(res.data.message ?? "Request failed");
  return res.data.data as T;
}

const CourseAPI = {
  list: async (p: Record<string, unknown> = {}) => {
    const res = await api.get("/lms/courses", { params: p });
    return { courses: res.data.data as Course[], meta: res.data.meta as PaginationMeta };
  },
  getFull: async (id: string) => unwrap<CourseWithLectures>(await api.get(`/lms/courses/${id}/full`)),
  create: async (payload: unknown) => unwrap<Course>(await api.post("/lms/courses", payload)),
  update: async (id: string, payload: unknown) => unwrap<Course>(await api.put(`/lms/courses/${id}`, payload)),
  updateStatus: async (id: string, status: CourseStatus) => unwrap<Course>(await api.patch(`/lms/courses/${id}/status`, { status })),
  delete: async (id: string) => api.delete(`/lms/courses/${id}`),
};
const LectureAPI = {
  create: async (courseId: string, payload: unknown) => unwrap<Lecture>(await api.post(`/lms/courses/${courseId}/lectures`, payload)),
  update: async (courseId: string, id: string, payload: unknown) => unwrap<Lecture>(await api.put(`/lms/courses/${courseId}/lectures/${id}`, payload)),
  delete: async (courseId: string, id: string) => api.delete(`/lms/courses/${courseId}/lectures/${id}`),
  reorder: async (courseId: string, orderedIds: string[]) => unwrap<Lecture[]>(await api.patch(`/lms/courses/${courseId}/lectures/reorder`, { orderedIds })),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const STATUS_STYLES: Record<CourseStatus, string> = {
  DRAFT: "bg-amber-100 text-amber-800 border border-amber-200",
  PUBLISHED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  ARCHIVED: "bg-slate-100 text-slate-600 border border-slate-200",
};

const CATEGORY_COLORS: Record<CourseCategory, string> = {
  "Food & Beverage": "bg-orange-50 text-orange-700",
  "Housekeeping": "bg-blue-50 text-blue-700",
  "Front Office": "bg-violet-50 text-violet-700",
  "Compliance": "bg-red-50 text-red-700",
  "Safety": "bg-rose-50 text-rose-700",
  "Leadership": "bg-indigo-50 text-indigo-700",
  "Customer Service": "bg-teal-50 text-teal-700",
  "Other": "bg-gray-50 text-gray-600",
};

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────

const Icon = {
  plus: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>),
  search: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>),
  edit: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>),
  trash: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>),
  back: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>),
  video: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>),
  book: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>),
  grip: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/></svg>),
  chevronDown: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="6 9 12 15 18 9"/></svg>),
  x: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>),
  eye: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>),
  archive: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>),
  upload: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>),
  spinner: (<svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>),
};

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  return <div className={`flex items-center justify-center ${size === "sm" ? "py-4" : "py-16"}`}>{Icon.spinner}</div>;
}

function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-sm font-medium animate-slide-up
      ${type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">{Icon.x}</button>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel, loading }: {
  message: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-7 max-w-sm w-full mx-4 shadow-2xl">
        <h3 className="text-base font-semibold text-slate-900 mb-2">Confirm Action</h3>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 flex items-center gap-2 transition-colors cursor-pointer">
            {loading && Icon.spinner} Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, error, ...props }: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      <input {...props} className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 bg-white outline-none transition-all
        focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400
        ${error ? "border-red-400 bg-red-50" : "border-slate-200 hover:border-slate-300"} ${props.className ?? ""}`} />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

function Textarea({ label, error, ...props }: { label: string; error?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      <textarea {...props} className={`w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-900 bg-white outline-none resize-none transition-all
        focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400
        ${error ? "border-red-400 bg-red-50" : "border-slate-200 hover:border-slate-300"}`} />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

function Select({ label, error, children, ...props }: { label: string; error?: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <select {...props} className={`w-full px-3.5 py-2.5 pr-9 rounded-lg border text-sm text-slate-900 bg-white outline-none appearance-none cursor-pointer transition-all
          focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400
          ${error ? "border-red-400 bg-red-50" : "border-slate-200 hover:border-slate-300"}`}>
          {children}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{Icon.chevronDown}</span>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

// ─── Course Form Modal ────────────────────────────────────────────────────────

interface CourseFormState {
  title: string; description: string; category: CourseCategory; thumbnailUrl: string; createdBy: string;
}
const emptyCourseForm: CourseFormState = { title: "", description: "", category: "Other", thumbnailUrl: "", createdBy: "" };

function CourseModal({ course, onSave, onClose, saving }: {
  course?: Course; onSave: (data: CourseFormState) => void; onClose: () => void; saving: boolean;
}) {
  const [form, setForm] = useState<CourseFormState>(
    course ? { title: course.title, description: course.description, category: course.category, thumbnailUrl: course.thumbnailUrl ?? "", createdBy: course.createdBy } : emptyCourseForm
  );
  const [errors, setErrors] = useState<Partial<CourseFormState>>({});
  const isEdit = !!course;

  const validate = () => {
    const e: Partial<CourseFormState> = {};
    if (!form.title.trim() || form.title.trim().length < 3) e.title = "Title must be at least 3 characters";
    if (!form.description.trim()) e.description = "Description is required";
    if (!isEdit && !form.createdBy.trim()) e.createdBy = "Creator user ID is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => { if (validate()) onSave(form); };
  const set = (k: keyof CourseFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">{isEdit ? "Edit Course" : "Create Course"}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{isEdit ? "Update course details" : "Fill in the details to create a new course"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer transition-colors">{Icon.x}</button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
          <Input label="Course Title" placeholder="e.g. Advanced Food Safety" value={form.title} onChange={set("title")} error={errors.title} />
          <Textarea label="Description" placeholder="What will learners gain from this course?" value={form.description} onChange={set("description")} rows={3} error={errors.description} />
          <Select label="Category" value={form.category} onChange={set("category")}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Thumbnail URL (optional)" placeholder="https://..." value={form.thumbnailUrl} onChange={set("thumbnailUrl")} />
          {!isEdit && (
            <Input label="Creator User ID" placeholder="user_XXXXXXXX" value={form.createdBy} onChange={set("createdBy")} error={errors.createdBy} />
          )}
        </div>
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2.5 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-60 flex items-center gap-2 font-medium transition-colors cursor-pointer">
            {saving && Icon.spinner}
            {isEdit ? "Save Changes" : "Create Course"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Lecture Form Modal ───────────────────────────────────────────────────────

interface LectureFormState {
  title: string; description: string; videoUrl: string; durationStr: string; notes: string;
}
const emptyLectureForm: LectureFormState = { title: "", description: "", videoUrl: "", durationStr: "", notes: "" };

function LectureModal({ lecture, onSave, onClose, saving }: {
  lecture?: Lecture; onSave: (data: LectureFormState) => void; onClose: () => void; saving: boolean;
}) {
  const [form, setForm] = useState<LectureFormState>(
    lecture ? { title: lecture.title, description: lecture.description ?? "", videoUrl: lecture.videoUrl, durationStr: String(lecture.duration), notes: lecture.notes ?? "" }
    : emptyLectureForm
  );
  const [errors, setErrors] = useState<Partial<LectureFormState>>({});
  const isEdit = !!lecture;

  const validate = () => {
    const e: Partial<LectureFormState> = {};
    if (!form.title.trim() || form.title.trim().length < 2) e.title = "Title must be at least 2 characters";
    if (!form.videoUrl.trim()) e.videoUrl = "Video URL is required";
    const dur = Number(form.durationStr);
    if (!form.durationStr || isNaN(dur) || dur < 0) e.durationStr = "Enter a valid duration in seconds";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => { if (validate()) onSave(form); };
  const set = (k: keyof LectureFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-7 py-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">{isEdit ? "Edit Lecture" : "Add Lecture"}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{isEdit ? "Update lecture details" : "Add a new video lecture to this course"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer transition-colors">{Icon.x}</button>
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
          <Input label="Lecture Title" placeholder="e.g. Introduction to HACCP" value={form.title} onChange={set("title")} error={errors.title} />
          <Input label="Description (optional)" placeholder="Brief summary of this lecture" value={form.description} onChange={set("description")} />
          <Input label="Video URL" placeholder="https://storage.example.com/video.mp4" value={form.videoUrl} onChange={set("videoUrl")} error={errors.videoUrl} />
          <Input label="Duration (seconds)" type="number" placeholder="e.g. 1800 for 30 min" value={form.durationStr} onChange={set("durationStr")} error={errors.durationStr} min="0" />
          <Textarea label="Notes (optional — markdown supported)" placeholder="Key points, resources, or timestamps..." value={form.notes} onChange={set("notes")} rows={5} />
        </div>
        <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2.5 text-sm rounded-lg bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-60 flex items-center gap-2 font-medium transition-colors cursor-pointer">
            {saving && Icon.spinner}
            {isEdit ? "Save Changes" : "Add Lecture"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Status Change Dropdown ───────────────────────────────────────────────────

function StatusDropdown({ course, onChange }: { course: Course; onChange: (s: CourseStatus) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer ${STATUS_STYLES[course.status]}`}>
        {course.status} {Icon.chevronDown}
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-20 bg-white rounded-xl shadow-xl border border-slate-100 py-1 min-w-[140px]">
          {STATUSES.filter(s => s !== course.status).map(s => (
            <button key={s} onClick={() => { onChange(s); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-slate-50 cursor-pointer ${STATUS_STYLES[s].replace("border", "")}`}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Course Card ──────────────────────────────────────────────────────────────

function CourseCard({ course, onView, onEdit, onDelete, onStatusChange }: {
  course: Course; onView: () => void; onEdit: () => void; onDelete: () => void; onStatusChange: (s: CourseStatus) => void;
}) {
  return (
    <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 flex flex-col overflow-hidden cursor-pointer">
      {/* Thumbnail */}
      <div onClick={onView} className="relative h-44 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden flex-shrink-0">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="p-5 bg-white/60 rounded-2xl text-slate-400">{Icon.book}</div>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <StatusDropdown course={course} onChange={onStatusChange} />
        </div>
      </div>
      {/* Body */}
      <div className="flex-1 p-5 flex flex-col gap-3">
        <div>
          <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md mb-2 ${CATEGORY_COLORS[course.category]}`}>
            {course.category}
          </span>
          <h3 onClick={onView} className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-slate-700 transition-colors">
            {course.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{course.description}</p>
        </div>
        <div className="flex items-center justify-between text-xs text-slate-400 mt-auto pt-3 border-t border-slate-50">
          <span className="flex items-center gap-1.5">{Icon.video} {course.lectureCount} lecture{course.lectureCount !== 1 ? "s" : ""}</span>
          <span>{formatDate(course.updatedAt)}</span>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button onClick={onView} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors cursor-pointer">
            {Icon.eye} View
          </button>
          <button onClick={onEdit} className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer">{Icon.edit}</button>
          <button onClick={onDelete} className="p-2 rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer">{Icon.trash}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Lecture Row (Draggable) ──────────────────────────────────────────────────

function LectureRow({ lecture, index, onEdit, onDelete, onDragStart, onDragOver, onDrop }: {
  lecture: Lecture; index: number; onEdit: () => void; onDelete: () => void;
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void; onDrop: () => void;
}) {
  return (
    <div draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop}
      className="group flex items-start gap-4 bg-white border border-slate-100 rounded-xl p-4 hover:border-slate-200 hover:shadow-sm transition-all duration-150">
      <div className="text-slate-300 group-hover:text-slate-400 cursor-grab mt-0.5 flex-shrink-0">{Icon.grip}</div>
      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">{index + 1}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-slate-900 truncate">{lecture.title}</h4>
        {lecture.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{lecture.description}</p>}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-xs text-slate-400">{Icon.video} {formatDuration(lecture.duration)}</span>
          {lecture.notes && <span className="text-xs text-slate-400 flex items-center gap-1">{Icon.book} Notes</span>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button onClick={onEdit} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">{Icon.edit}</button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer">{Icon.trash}</button>
      </div>
    </div>
  );
}

// ─── Courses List Page ────────────────────────────────────────────────────────

function CoursesPage({ onViewCourse }: { onViewCourse: (id: string) => void }) {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CourseStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState<CourseCategory | "">("");
  const [page, setPage] = useState(1);

  const [showCreate, setShowCreate] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => setToast({ message, type });

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 12 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.category = categoryFilter;
      const result = await CourseAPI.list(params);
      setCourses(result.courses);
      setMeta(result.meta);
    } catch (e: any) {
      showToast(e.message ?? "Failed to load courses", "error");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, page]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  // Debounce search
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {}, 300);
  };

  const handleCreate = async (form: CourseFormState) => {
    setSaving(true);
    try {
      await CourseAPI.create(form);
      setShowCreate(false);
      showToast("Course created successfully", "success");
      fetchCourses();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (form: CourseFormState) => {
    if (!editCourse) return;
    setSaving(true);
    try {
      await CourseAPI.update(editCourse.id, { title: form.title, description: form.description, category: form.category, thumbnailUrl: form.thumbnailUrl });
      setEditCourse(null);
      showToast("Course updated successfully", "success");
      fetchCourses();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteCourse) return;
    setDeleting(true);
    try {
      await CourseAPI.delete(deleteCourse.id);
      setDeleteCourse(null);
      showToast("Course deleted", "success");
      fetchCourses();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setDeleting(false); }
  };

  const handleStatusChange = async (course: Course, status: CourseStatus) => {
    try {
      await CourseAPI.updateStatus(course.id, status);
      showToast(`Status updated to ${status}`, "success");
      fetchCourses();
    } catch (e: any) { showToast(e.message, "error"); }
  };

  const totalCourses = meta?.total ?? 0;
  const published = courses.filter(c => c.status === "PUBLISHED").length;
  const drafts = courses.filter(c => c.status === "DRAFT").length;

  return (
    <div className="min-h-screen bg-[#F8F8F6] font-['DM_Sans',sans-serif]">
      {/* Top Nav */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white">{Icon.book}</div>
            <div>
              <span className="text-sm font-bold text-slate-900 tracking-tight">Mend</span>
              <span className="text-xs text-slate-400 ml-2">/ LMS Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 pr-3 border-r border-slate-200">
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-slate-500 hidden sm:block max-w-[140px] truncate">{user.email}</span>
              </div>
            )}
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors cursor-pointer shadow-sm">
              {Icon.plus} New Course
            </button>
            <button onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
              title="Sign out">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span className="hidden sm:block">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Courses", value: meta?.total ?? "—", sub: "across all statuses" },
            { label: "Published", value: published, sub: "live & accessible" },
            { label: "Drafts", value: drafts, sub: "work in progress" },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="text-2xl font-bold text-slate-900 tabular-nums">{s.value}</div>
              <div className="text-sm font-semibold text-slate-700 mt-0.5">{s.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[220px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{Icon.search}</span>
            <input value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search courses…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as CourseStatus | ""); setPage(1); }}
              className="pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-slate-900/10">
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{Icon.chevronDown}</span>
          </div>
          <div className="relative">
            <select value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value as CourseCategory | ""); setPage(1); }}
              className="pl-3.5 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-slate-900/10">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{Icon.chevronDown}</span>
          </div>
          {(search || statusFilter || categoryFilter) && (
            <button onClick={() => { setSearch(""); setStatusFilter(""); setCategoryFilter(""); setPage(1); }}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer">
              {Icon.x} Clear
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? <Spinner /> : courses.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <div className="text-slate-300 flex justify-center mb-4 scale-150">{Icon.book}</div>
            <p className="font-semibold text-slate-500">No courses found</p>
            <p className="text-sm mt-1">Try adjusting your filters or create a new course</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {courses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                onView={() => onViewCourse(course.id)}
                onEdit={() => setEditCourse(course)}
                onDelete={() => setDeleteCourse(course)}
                onStatusChange={s => handleStatusChange(course, s)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
              Previous
            </button>
            {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={`w-9 h-9 rounded-xl text-sm font-medium cursor-pointer transition-colors
                  ${p === page ? "bg-slate-900 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                {p}
              </button>
            ))}
            <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
              Next
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && <CourseModal onSave={handleCreate} onClose={() => setShowCreate(false)} saving={saving} />}
      {editCourse && <CourseModal course={editCourse} onSave={handleUpdate} onClose={() => setEditCourse(null)} saving={saving} />}
      {deleteCourse && (
        <ConfirmModal
          message={`Delete "${deleteCourse.title}"? This will permanently remove the course and all its lectures.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteCourse(null)}
          loading={deleting}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Course Detail Page ───────────────────────────────────────────────────────

function CourseDetailPage({ courseId, onBack }: { courseId: string; onBack: () => void }) {
  const { logout } = useAuth();
  const [course, setCourse] = useState<CourseWithLectures | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddLecture, setShowAddLecture] = useState(false);
  const [editLecture, setEditLecture] = useState<Lecture | null>(null);
  const [deleteLecture, setDeleteLecture] = useState<Lecture | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingOverId, setDraggingOverId] = useState<string | null>(null);

  const showToast = (message: string, type: "success" | "error") => setToast({ message, type });

  const fetchCourse = useCallback(async () => {
    setLoading(true);
    try {
      const data = await CourseAPI.getFull(courseId);
      setCourse(data);
      if (!selectedLecture && data.lectures.length > 0) setSelectedLecture(data.lectures[0]);
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);

  const handleAddLecture = async (form: LectureFormState) => {
    setSaving(true);
    try {
      await LectureAPI.create(courseId, { title: form.title, description: form.description || undefined, videoUrl: form.videoUrl, duration: Number(form.durationStr), notes: form.notes || undefined });
      setShowAddLecture(false);
      showToast("Lecture added", "success");
      fetchCourse();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleUpdateLecture = async (form: LectureFormState) => {
    if (!editLecture) return;
    setSaving(true);
    try {
      await LectureAPI.update(courseId, editLecture.id, { title: form.title, description: form.description || undefined, videoUrl: form.videoUrl, duration: Number(form.durationStr), notes: form.notes || undefined });
      setEditLecture(null);
      showToast("Lecture updated", "success");
      fetchCourse();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setSaving(false); }
  };

  const handleDeleteLecture = async () => {
    if (!deleteLecture) return;
    setDeleting(true);
    try {
      await LectureAPI.delete(courseId, deleteLecture.id);
      if (selectedLecture?.id === deleteLecture.id) setSelectedLecture(null);
      setDeleteLecture(null);
      showToast("Lecture deleted", "success");
      fetchCourse();
    } catch (e: any) { showToast(e.message, "error"); }
    finally { setDeleting(false); }
  };

  const handleDrop = async (targetId: string) => {
    if (!course || !draggingId || draggingId === targetId) { setDraggingId(null); setDraggingOverId(null); return; }
    const lectures = [...course.lectures];
    const fromIdx = lectures.findIndex(l => l.id === draggingId);
    const toIdx = lectures.findIndex(l => l.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = lectures.splice(fromIdx, 1);
    lectures.splice(toIdx, 0, moved);
    const reordered = lectures.map((l, i) => ({ ...l, order: i + 1 }));
    setCourse(prev => prev ? { ...prev, lectures: reordered } : prev);
    setDraggingId(null); setDraggingOverId(null);
    try {
      await LectureAPI.reorder(courseId, reordered.map(l => l.id));
      showToast("Lecture order saved", "success");
    } catch (e: any) { showToast(e.message, "error"); fetchCourse(); }
  };

  if (loading) return <div className="min-h-screen bg-[#F8F8F6] flex items-center justify-center"><Spinner /></div>;
  if (!course) return null;

  const totalDuration = course.lectures.reduce((s, l) => s + l.duration, 0);

  return (
    <div className="min-h-screen bg-[#F8F8F6] font-['DM_Sans',sans-serif]">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors cursor-pointer">
            {Icon.back} Back
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-slate-900 truncate">{course.title}</h1>
            <p className="text-xs text-slate-400">{course.category}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[course.status]}`}>{course.status}</span>
            <button onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer ml-1"
              title="Sign out">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Lecture Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Course meta */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <div className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-md mb-3 ${CATEGORY_COLORS[course.category]}`}>{course.category}</div>
            <p className="text-xs text-slate-600 leading-relaxed">{course.description}</p>
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-50">
              <div className="text-center"><div className="text-lg font-bold text-slate-900">{course.lectureCount}</div><div className="text-xs text-slate-400">Lectures</div></div>
              <div className="text-center"><div className="text-lg font-bold text-slate-900">{formatDuration(totalDuration)}</div><div className="text-xs text-slate-400">Total</div></div>
            </div>
          </div>

          {/* Lecture list */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Lectures</h2>
              <button onClick={() => setShowAddLecture(true)}
                className="flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-slate-600 cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg">
                {Icon.plus} Add
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[calc(100vh-360px)]">
              {course.lectures.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm font-medium text-slate-500">No lectures yet</p>
                  <p className="text-xs mt-1">Add your first video lecture</p>
                </div>
              ) : course.lectures.map((lec, i) => (
                <div key={lec.id} onClick={() => setSelectedLecture(lec)}
                  className={`rounded-xl cursor-pointer transition-all ${selectedLecture?.id === lec.id ? "ring-2 ring-slate-900" : ""}`}
                  style={{ opacity: draggingId === lec.id ? 0.4 : 1 }}>
                  <LectureRow
                    lecture={lec}
                    index={i}
                    onEdit={() => setEditLecture(lec)}
                    onDelete={() => setDeleteLecture(lec)}
                    onDragStart={() => setDraggingId(lec.id)}
                    onDragOver={(e) => { e.preventDefault(); setDraggingOverId(lec.id); }}
                    onDrop={() => handleDrop(lec.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — Lecture Detail / Video Player */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {selectedLecture ? (
            <>
              {/* Video player */}
              <div className="bg-black rounded-2xl overflow-hidden shadow-lg aspect-video flex items-center justify-center">
                {selectedLecture.videoUrl.match(/\.(mp4|webm|ogg)$/i) ? (
                  <video key={selectedLecture.id} src={selectedLecture.videoUrl} controls className="w-full h-full" />
                ) : selectedLecture.videoUrl.includes("youtube.com") || selectedLecture.videoUrl.includes("youtu.be") ? (
                  <iframe
                    src={selectedLecture.videoUrl.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")}
                    className="w-full h-full" allowFullScreen title={selectedLecture.title}
                  />
                ) : (
                  <div className="text-center text-slate-400 p-8">
                    <div className="flex justify-center mb-3 opacity-40 scale-150">{Icon.video}</div>
                    <p className="text-sm font-medium text-white/70">External video</p>
                    <a href={selectedLecture.videoUrl} target="_blank" rel="noopener noreferrer"
                      className="mt-3 inline-block text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 break-all">
                      {selectedLecture.videoUrl}
                    </a>
                  </div>
                )}
              </div>

              {/* Lecture meta */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedLecture.title}</h2>
                    {selectedLecture.description && <p className="text-sm text-slate-500 mt-1">{selectedLecture.description}</p>}
                    <div className="flex items-center gap-3 mt-2.5">
                      <span className="flex items-center gap-1.5 text-xs text-slate-400">{Icon.video} {formatDuration(selectedLecture.duration)}</span>
                      <span className="text-slate-200">|</span>
                      <span className="text-xs text-slate-400">Lecture {selectedLecture.order} of {course.lectureCount}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => setEditLecture(selectedLecture)} className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">{Icon.edit}</button>
                    <button onClick={() => setDeleteLecture(selectedLecture)} className="p-2 rounded-xl border border-slate-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer">{Icon.trash}</button>
                  </div>
                </div>

                {/* Notes */}
                {selectedLecture.notes ? (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Lecture Notes</h3>
                    <div className="bg-slate-50 rounded-xl p-5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-['DM_Mono',monospace]">
                      {selectedLecture.notes}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <p className="text-sm text-slate-400 italic">No notes for this lecture.</p>
                    <button onClick={() => setEditLecture(selectedLecture)}
                      className="mt-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer underline underline-offset-2">
                      Add notes →
                    </button>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  disabled={selectedLecture.order === 1}
                  onClick={() => setSelectedLecture(course.lectures.find(l => l.order === selectedLecture.order - 1) ?? null)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                  {Icon.back} Previous
                </button>
                <span className="text-xs text-slate-400">{selectedLecture.order} / {course.lectureCount}</span>
                <button
                  disabled={selectedLecture.order === course.lectureCount}
                  onClick={() => setSelectedLecture(course.lectures.find(l => l.order === selectedLecture.order + 1) ?? null)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                  Next <span style={{ transform: "rotate(180deg)", display: "inline-flex" }}>{Icon.back}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex-1 flex items-center justify-center py-24">
              <div className="text-center text-slate-300">
                <div className="flex justify-center mb-4 scale-150">{Icon.video}</div>
                <p className="text-sm font-semibold text-slate-500 mt-4">Select a lecture to preview</p>
                <p className="text-xs text-slate-400 mt-1">Or add your first lecture using the button above</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddLecture && <LectureModal onSave={handleAddLecture} onClose={() => setShowAddLecture(false)} saving={saving} />}
      {editLecture && <LectureModal lecture={editLecture} onSave={handleUpdateLecture} onClose={() => setEditLecture(null)} saving={saving} />}
      {deleteLecture && (
        <ConfirmModal
          message={`Delete lecture "${deleteLecture.title}"? This cannot be undone.`}
          onConfirm={handleDeleteLecture}
          onCancel={() => setDeleteLecture(null)}
          loading={deleting}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── App Shell (Router) ───────────────────────────────────────────────────────

export default function MendLMSDashboard() {
  const [page, setPage] = useState<"list" | "detail">("list");
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);

  if (page === "detail" && activeCourseId) {
    return (
      <CourseDetailPage
        courseId={activeCourseId}
        onBack={() => { setPage("list"); setActiveCourseId(null); }}
      />
    );
  }

  return (
    <CoursesPage
      onViewCourse={(id) => { setActiveCourseId(id); setPage("detail"); }}
    />
  );
}
