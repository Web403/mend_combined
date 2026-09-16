import api from "./api"

const clean = (params = {}) => Object.fromEntries(
  Object.entries(params).filter(([, value]) => value !== "" && value !== undefined && value !== null)
)

const unwrap = (response) => response.data?.data ?? response.data

export async function getLmsCategories() {
  const data = unwrap(await api.get("/lms/categories"))
  return Array.isArray(data) ? data : data?.items ?? data?.data ?? []
}

export const getLmsCategory = (id) => api.get(`/lms/categories/${id}`).then(unwrap)
export const createLmsCategory = (payload) => api.post("/lms/categories", payload).then(unwrap)
export const updateLmsCategory = (id, payload) => api.patch(`/lms/categories/${id}`, payload).then(unwrap)
export const deleteLmsCategory = (id) => api.delete(`/lms/categories/${id}`).then(unwrap)

export async function getLmsCourses(params = {}) {
  const data = unwrap(await api.get("/lms/courses", { params: clean(params) }))
  // The LMS controller returns { courses, total, page, totalPages } while older
  // deployments returned { items } or { data }. Support both response shapes.
  const items = Array.isArray(data) ? data : data?.courses ?? data?.items ?? data?.data ?? []
  return {
    items,
    pagination: data?.pagination ?? {
      total: data?.total ?? items.length,
      page: data?.page ?? params.page ?? 1,
      totalPages: data?.totalPages ?? 1,
    },
  }
}

export const getLmsCourse = (id) => api.get(`/lms/courses/${id}`).then(unwrap)
export const createLmsCourse = (payload) => api.post("/lms/courses", payload).then(unwrap)
// Creation requires categoryId; the update service persists the Course model's
// category field. Keep that backend distinction out of the form components.
export const updateLmsCourse = (id, { categoryId, ...payload }) => api.patch(
  `/lms/courses/${id}`,
  { ...payload, ...(categoryId ? { category: categoryId } : {}) }
).then(unwrap)
export const publishLmsCourse = (id) => api.patch(`/lms/courses/${id}/publish`).then(unwrap)
export const archiveLmsCourse = (id) => api.patch(`/lms/courses/${id}/archive`).then(unwrap)
export const deleteLmsCourse = (id) => api.delete(`/lms/courses/${id}`).then(unwrap)

export async function getLmsModules(courseId) {
  const data = unwrap(await api.get(`/lms/courses/${courseId}/modules`))
  return Array.isArray(data) ? data : data?.items ?? data?.data ?? []
}

export const getLmsModule = (id) => api.get(`/lms/modules/${id}`).then(unwrap)
export const createLmsModule = (payload) => api.post("/lms/modules", payload).then(unwrap)
export const updateLmsModule = (id, payload) => api.patch(`/lms/modules/${id}`, payload).then(unwrap)
export const deleteLmsModule = (id) => api.delete(`/lms/modules/${id}`).then(unwrap)
export const reorderLmsModules = (courseId, moduleOrders) => api.patch(`/lms/courses/${courseId}/modules/reorder`, { moduleOrders }).then(unwrap)

export async function getLmsLectures(moduleId) {
  const data = unwrap(await api.get(`/lms/modules/${moduleId}/lectures`))
  return Array.isArray(data) ? data : data?.items ?? data?.data ?? []
}

export const getLmsLecture = (id) => api.get(`/lms/lectures/${id}`).then(unwrap)
export const createLmsLecture = (payload) => api.post("/lms/lectures", payload).then(unwrap)
export const updateLmsLecture = (id, payload) => api.patch(`/lms/lectures/${id}`, payload).then(unwrap)
export const deleteLmsLecture = (id) => api.delete(`/lms/lectures/${id}`).then(unwrap)
export const reorderLmsLectures = (moduleId, lectureOrders) => api.patch(`/lms/modules/${moduleId}/lectures/reorder`, { lectureOrders }).then(unwrap)

export async function getLmsAssessmentByModule(moduleId) {
  const data = unwrap(await api.get(`/lms/modules/${moduleId}/assessment`))
  // Some deployed API versions wrap this resource as { assessment: ... }.
  return data?.assessment ?? data?.item ?? data
}
export const getLmsAssessment = (id, includeQuestions = true) => api.get(`/lms/assessments/${id}`, { params: { includeQuestions } }).then(unwrap)
export const createLmsAssessment = (payload) => api.post("/lms/assessments", payload).then(unwrap)
export const updateLmsAssessment = (id, payload) => api.patch(`/lms/assessments/${id}`, payload).then(unwrap)
export const deleteLmsAssessment = (id) => api.delete(`/lms/assessments/${id}`).then(unwrap)

export async function getLmsQuestions(assessmentId) {
  if (!assessmentId) throw new Error("The assessment response did not include an ID.")
  const data = unwrap(await api.get(`/lms/assessments/${assessmentId}/questions`))
  return Array.isArray(data) ? data : data?.items ?? data?.data ?? []
}

export const createLmsQuestion = (payload) => api.post("/lms/assessments/questions", payload).then(unwrap)
export const updateLmsQuestion = (id, payload) => api.patch(`/lms/assessments/questions/${id}`, payload).then(unwrap)
export const deleteLmsQuestion = (id) => api.delete(`/lms/assessments/questions/${id}`).then(unwrap)

export async function getCourseEnrollments(courseId, params = {}) {
  const data = unwrap(await api.get(`/lms/courses/${courseId}/enrollments`, { params: clean(params) }))
  // Documented frontend-integration fix: the LMS enrollment controller returns
  // { enrollments, total } (see backend enrollment.service.getCourseEnrollments);
  // the previous shape-mapping only knew `items`/`data`, so the list always rendered empty.
  const items = Array.isArray(data) ? data : data?.enrollments ?? data?.items ?? data?.data ?? []
  return { items, pagination: data?.pagination ?? { total: data?.total ?? items.length } }
}

export const approveEnrollment = (id) => api.patch(`/lms/enrollments/${id}/approve`).then(unwrap)
