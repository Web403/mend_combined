/**
 * Course form model + payload helpers (kept outside the component file so
 * shared constants don't break fast-refresh conventions). Payload shape is
 * byte-identical to what the previous inline form sent to the API.
 */
export const DIFFICULTY_OPTIONS = ["beginner", "intermediate", "advanced", "professional"]
export const BADGE_OPTIONS = [
  { value: "", label: "No badge" },
  { value: "new", label: "New" },
  { value: "popular", label: "Popular" },
  { value: "updated", label: "Updated" },
  { value: "featured", label: "Featured" },
]

export const EMPTY_COURSE_FORM = {
  title: "",
  description: "",
  categoryId: "",
  difficulty: "beginner",
  estimatedDurationMinutes: "",
  learningOutcomes: "",
  tags: "",
  badge: "",
  coverImage: "",
  icon: "",
}

export function courseFormFromRecord(course) {
  return {
    ...EMPTY_COURSE_FORM,
    title: course?.title || "",
    description: course?.description || "",
    categoryId: typeof course?.category === "object" ? String(course?.category?.id ?? course?.category?._id ?? "") : course?.category || "",
    difficulty: course?.difficulty || "beginner",
    estimatedDurationMinutes: course?.estimatedDurationMinutes || course?.estimatedDurationMinutes === 0 ? String(course.estimatedDurationMinutes) : "",
    learningOutcomes: (course?.learningOutcomes || []).join("\n"),
    tags: (course?.tags || []).join(", "),
    badge: course?.badge || "",
    coverImage: course?.coverImage || "",
    icon: course?.icon || "",
  }
}

export function buildCoursePayload(form) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    categoryId: form.categoryId || undefined,
    difficulty: form.difficulty,
    badge: form.badge || undefined,
    coverImage: form.coverImage.trim() || undefined,
    icon: form.icon.trim() || undefined,
    estimatedDurationMinutes: form.estimatedDurationMinutes === "" ? 0 : Number(form.estimatedDurationMinutes),
    learningOutcomes: form.learningOutcomes
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    tags: form.tags
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  }
}

export function validateCourseForm(form, { requireCategory }) {
  const errors = {}
  if (!form.title.trim()) errors.title = "A course title is required."
  if (requireCategory && !form.categoryId) errors.categoryId = "Choose the category this course belongs to."
  if (form.estimatedDurationMinutes !== "" && Number(form.estimatedDurationMinutes) < 0)
    errors.estimatedDurationMinutes = "Duration cannot be negative."
  return errors
}

