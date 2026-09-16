import { TextAreaField, SelectField, TextField } from "../../components/ui/Field"
import { BADGE_OPTIONS, DIFFICULTY_OPTIONS } from "./courseFormUtils"

/**
 * The course field set, shared by the create page and the Settings tab.
 */
export default function CourseFormFields({ form, onChange, errors = {}, categories, disabled = false }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="course-title"
          label="Course title"
          required
          value={form.title}
          onChange={(e) => onChange("title", e.target.value)}
          error={errors.title}
          disabled={disabled}
        />
        <SelectField
          id="course-category"
          label="Category"
          required
          value={form.categoryId}
          onChange={(e) => onChange("categoryId", e.target.value)}
          error={errors.categoryId}
          disabled={disabled}
        >
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id ?? c._id} value={c.id ?? c._id}>
              {c.name}
            </option>
          ))}
        </SelectField>
      </div>

      <TextAreaField
        id="course-description"
        label="Description"
        rows={3}
        value={form.description}
        onChange={(e) => onChange("description", e.target.value)}
        disabled={disabled}
        hint="Shown to learners in the catalog card"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SelectField
          id="course-difficulty"
          label="Difficulty"
          value={form.difficulty}
          onChange={(e) => onChange("difficulty", e.target.value)}
          disabled={disabled}
        >
          {DIFFICULTY_OPTIONS.map((d) => (
            <option key={d} value={d} className="capitalize">
              {d[0].toUpperCase() + d.slice(1)}
            </option>
          ))}
        </SelectField>
        <TextField
          id="course-duration"
          label="Estimated duration"
          type="number"
          min="0"
          value={form.estimatedDurationMinutes}
          onChange={(e) => onChange("estimatedDurationMinutes", e.target.value)}
          error={errors.estimatedDurationMinutes}
          disabled={disabled}
          hint="minutes"
        />
        <SelectField
          id="course-badge"
          label="Badge"
          value={form.badge}
          onChange={(e) => onChange("badge", e.target.value)}
          disabled={disabled}
        >
          {BADGE_OPTIONS.map((b) => (
            <option key={b.value} value={b.value}>
              {b.label}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="course-cover"
          label="Cover image URL"
          value={form.coverImage}
          onChange={(e) => onChange("coverImage", e.target.value)}
          disabled={disabled}
        />
        <TextField
          id="course-icon"
          label="Icon (URL or name)"
          value={form.icon}
          onChange={(e) => onChange("icon", e.target.value)}
          disabled={disabled}
        />
      </div>

      <TextField
        id="course-tags"
        label="Tags"
        value={form.tags}
        onChange={(e) => onChange("tags", e.target.value)}
        disabled={disabled}
        hint="comma separated"
      />

      <TextAreaField
        id="course-outcomes"
        label="Learning outcomes"
        rows={3}
        value={form.learningOutcomes}
        onChange={(e) => onChange("learningOutcomes", e.target.value)}
        disabled={disabled}
        hint="one per line"
      />
    </div>
  )
}
