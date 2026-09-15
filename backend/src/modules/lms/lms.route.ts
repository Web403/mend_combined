import { Router } from "express";
import { CourseController } from "./course/course.controller";
import { LectureController } from "./lecture/lecture.controller";
import { AssessmentController } from "./assessment/assessment.controller";
import { EnrollmentController } from "./enrollment/enrollment.controller";
import { authMiddleware } from "../../core/middleware/auth.middleware";
import { tenantMiddleware } from "../../core/middleware/tenant.middleware";

const router = Router();

// All LMS routes require authentication and tenant context
router.use(authMiddleware);
// router.use(tenantMiddleware);

// ═══════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════
router.post("/categories", CourseController.createCategory.bind(CourseController));
router.get("/categories", CourseController.getCategories.bind(CourseController));
router.get("/categories/:id", CourseController.getCategoryById.bind(CourseController));
router.patch("/categories/:id", CourseController.updateCategory.bind(CourseController));
router.delete("/categories/:id", CourseController.deleteCategory.bind(CourseController));

// ═══════════════════════════════════════════════════════
// COURSES
// ═══════════════════════════════════════════════════════
router.post("/courses", CourseController.createCourse.bind(CourseController));
router.get("/courses", CourseController.getCourses.bind(CourseController));
router.get("/courses/:id", CourseController.getCourseById.bind(CourseController));
router.get("/courses/slug/:slug", CourseController.getCourseBySlug.bind(CourseController));
router.patch("/courses/:id", CourseController.updateCourse.bind(CourseController));
router.patch("/courses/:id/publish", CourseController.publishCourse.bind(CourseController));
router.patch("/courses/:id/archive", CourseController.archiveCourse.bind(CourseController));
router.delete("/courses/:id", CourseController.deleteCourse.bind(CourseController));

// ═══════════════════════════════════════════════════════
// MODULES
// ═══════════════════════════════════════════════════════
router.post("/modules", CourseController.createModule.bind(CourseController));
router.get("/courses/:courseId/modules", CourseController.getModulesByCourse.bind(CourseController));
router.get("/modules/:id", CourseController.getModuleById.bind(CourseController));
router.patch("/modules/:id", CourseController.updateModule.bind(CourseController));
router.patch(
  "/courses/:courseId/modules/reorder",
  CourseController.reorderModules.bind(CourseController)
);
router.delete("/modules/:id", CourseController.deleteModule.bind(CourseController));

// ═══════════════════════════════════════════════════════
// LECTURES
// ═══════════════════════════════════════════════════════
router.post("/lectures", LectureController.createLecture.bind(LectureController));
router.get(
  "/modules/:moduleId/lectures",
  LectureController.getLecturesByModule.bind(LectureController)
);
router.get("/lectures/:id", LectureController.getLectureById.bind(LectureController));
router.patch("/lectures/:id", LectureController.updateLecture.bind(LectureController));
router.patch(
  "/modules/:moduleId/lectures/reorder",
  LectureController.reorderLectures.bind(LectureController)
);
router.delete("/lectures/:id", LectureController.deleteLecture.bind(LectureController));

// ═══════════════════════════════════════════════════════
// ASSESSMENTS (Quizzes)
// ══════════════════════════════════════════════════
router.post("/assessments", AssessmentController.createAssessment.bind(AssessmentController));
router.get("/assessments/:id", AssessmentController.getAssessmentById.bind(AssessmentController));
router.get(
  "/modules/:moduleId/assessment",
  AssessmentController.getAssessmentByModule.bind(AssessmentController)
);
router.patch("/assessments/:id", AssessmentController.updateAssessment.bind(AssessmentController));
router.delete("/assessments/:id", AssessmentController.deleteAssessment.bind(AssessmentController));

// ─── Assessment Questions ──────────────────────────────
router.post(
  "/assessments/questions",
  AssessmentController.addQuestion.bind(AssessmentController)
);
router.post(
  "/assessments/:assessmentId/questions/bulk",
  AssessmentController.addBulkQuestions.bind(AssessmentController)
);
router.get(
  "/assessments/:assessmentId/questions",
  AssessmentController.getQuestions.bind(AssessmentController)
);
router.patch(
  "/assessments/questions/:id",
  AssessmentController.updateQuestion.bind(AssessmentController)
);
router.delete(
  "/assessments/questions/:id",
  AssessmentController.deleteQuestion.bind(AssessmentController)
);

// ─── Quiz Taking (Learner) ─────────────────────────────
router.post(
  "/assessments/:assessmentId/start",
  AssessmentController.startQuiz.bind(AssessmentController)
);
router.post(
  "/assessments/submit",
  AssessmentController.submitQuiz.bind(AssessmentController)
);
router.get(
  "/assessments/attempts/:attemptId",
  AssessmentController.getAttemptResult.bind(AssessmentController)
);
router.get(
  "/assessments/:assessmentId/my-attempts",
  AssessmentController.getUserAttempts.bind(AssessmentController)
);

// ═══════════════════════════════════════════════════════
// ENROLLMENTS
// ═══════════════════════════════════════════════════════
router.post(
  "/courses/:courseId/apply",
  EnrollmentController.applyToCourse.bind(EnrollmentController)
);
router.patch(
  "/enrollments/:id/approve",
  EnrollmentController.approveEnrollment.bind(EnrollmentController)
);
router.post(
  "/courses/:courseId/start",
  EnrollmentController.startCourse.bind(EnrollmentController)
);
router.post(
  "/lectures/:lectureId/complete",
  EnrollmentController.markLectureCompleted.bind(EnrollmentController)
);
router.get(
  "/enrollments/me",
  EnrollmentController.getUserEnrollments.bind(EnrollmentController)
);
router.get(
  "/enrollments/:id",
  EnrollmentController.getEnrollmentDetails.bind(EnrollmentController)
);
router.get(
  "/courses/:courseId/enrollments",
  EnrollmentController.getCourseEnrollments.bind(EnrollmentController)
);
router.post(
  "/courses/:courseId/drop",
  EnrollmentController.dropCourse.bind(EnrollmentController)
);

export default router;