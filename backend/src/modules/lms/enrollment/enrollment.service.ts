import { Types } from "mongoose";
import { EnrollmentRepository } from "./enrollment.repository";
import { CourseRepository, ModuleRepository } from "../course/course.repository";
import { LectureRepository } from "../lecture/lecture.repository";
import { CertificateRepository } from "../certificate/certificate.repository";
import {
  IEnrollmentDoc,
  IEnrollmentFilters,
} from "../../../shared/interfaces/lms";
import { EnrollmentStatus, CourseStatus } from "../../../shared/enums/lms.enum";
import { ApiError } from "../../../core/utils/ApiResponse";
import { v4 as uuidv4 } from "uuid";

const enrollmentRepo = new EnrollmentRepository();
const courseRepo = new CourseRepository();
const moduleRepo = new ModuleRepository();
const lectureRepo = new LectureRepository();
const certificateRepo = new CertificateRepository();

export class EnrollmentService {
  // ─── Apply to Course ─────────────────────────────────
  async applyToCourse(
    courseId: string,
    userId: string,
    hotelId: string | Types.ObjectId
  ): Promise<IEnrollmentDoc> {
    const course = await courseRepo.findById(courseId, hotelId);
    if (!course) throw ApiError.notFound("Course not found");

    if (course.status !== CourseStatus.PUBLISHED) {
      throw ApiError.badRequest("Course is not available for enrollment");
    }

    // Check if already enrolled
    const existing = await enrollmentRepo.findByUserAndCourse(
      userId,
      courseId,
      hotelId
    );

    if (existing) {
      if (existing.status === EnrollmentStatus.DROPPED) {
        // Allow re-enrollment
        const updated = await enrollmentRepo.update(
          existing._id.toString(),
          hotelId,
          {
            status: EnrollmentStatus.APPLIED,
            progressPercentage: 0,
            completedModules: [],
            completedLectures: [],
            completedAt: null,
            startedAt: null,
          } as Partial<IEnrollmentDoc>
        );
        return updated!;
      }
      throw ApiError.conflict("You have already applied to this course");
    }

    return enrollmentRepo.create({
      user: new Types.ObjectId(userId),
      course: new Types.ObjectId(courseId),
      hotel: hotelId as Types.ObjectId,
      status: EnrollmentStatus.APPLIED,
    });
  }

  // ─── Approve Enrollment (Admin) ──────────────────────
  async approveEnrollment(
    enrollmentId: string,
    hotelId: string | Types.ObjectId
  ): Promise<IEnrollmentDoc> {
    const enrollment = await enrollmentRepo.findById(enrollmentId, hotelId);
    if (!enrollment) throw ApiError.notFound("Enrollment not found");

    if (enrollment.status !== EnrollmentStatus.APPLIED) {
      throw ApiError.badRequest("Enrollment is not in applied status");
    }

    const updated = await enrollmentRepo.update(enrollmentId, hotelId, {
      status: EnrollmentStatus.ENROLLED,
      enrolledAt: new Date(),
    } as Partial<IEnrollmentDoc>);

    return updated!;
  }

  // ─── Start Course ────────────────────────────────────
  async startCourse(
    courseId: string,
    userId: string,
    hotelId: string | Types.ObjectId
  ): Promise<IEnrollmentDoc> {
    const enrollment = await enrollmentRepo.findByUserAndCourse(
      userId,
      courseId,
      hotelId
    );

    if (!enrollment) {
      throw ApiError.notFound("Enrollment not found. Please apply first.");
    }

    if (
      enrollment.status !== EnrollmentStatus.ENROLLED &&
      enrollment.status !== EnrollmentStatus.IN_PROGRESS
    ) {
      throw ApiError.badRequest("You are not enrolled in this course");
    }

    if (enrollment.status === EnrollmentStatus.ENROLLED) {
      const updated = await enrollmentRepo.update(
        enrollment._id.toString(),
        hotelId,
        {
          status: EnrollmentStatus.IN_PROGRESS,
          startedAt: new Date(),
          lastAccessedAt: new Date(),
        } as Partial<IEnrollmentDoc>
      );
      return updated!;
    }

    // Already in progress, just update last accessed
    await enrollmentRepo.update(enrollment._id.toString(), hotelId, {
      lastAccessedAt: new Date(),
    } as Partial<IEnrollmentDoc>);

    return enrollment;
  }

  // ─── Mark Lecture Completed ──────────────────────────
  async markLectureCompleted(
    lectureId: string,
    userId: string,
    hotelId: string | Types.ObjectId
  ): Promise<IEnrollmentDoc> {
    const lecture = await lectureRepo.findById(lectureId, hotelId);
    if (!lecture) throw ApiError.notFound("Lecture not found");

    const enrollment = await enrollmentRepo.findByUserAndCourse(
      userId,
      lecture.course.toString(),
      hotelId
    );

    if (!enrollment) {
      throw ApiError.notFound("Enrollment not found");
    }

    if (
      enrollment.status !== EnrollmentStatus.IN_PROGRESS &&
      enrollment.status !== EnrollmentStatus.ENROLLED
    ) {
      throw ApiError.badRequest("Course is not in progress");
    }

    // Mark lecture completed
    const updated = await enrollmentRepo.markLectureCompleted(
      enrollment._id.toString(),
      hotelId,
      new Types.ObjectId(lectureId),
      lecture.module
    );

    if (!updated) throw ApiError.notFound("Failed to update enrollment");

    // Check if all lectures in the module are completed
    await this.checkAndUpdateModuleCompletion(
      enrollment._id.toString(),
      lecture.module.toString(),
      hotelId,
      lecture.course.toString()
    );

    return updated;
  }

  // ─── Get User Enrollments ────────────────────────────
  async getUserEnrollments(
    userId: string,
    hotelId: string | Types.ObjectId,
    filters: IEnrollmentFilters
  ): Promise<{ enrollments: IEnrollmentDoc[]; total: number }> {
    return enrollmentRepo.findByUser(userId, hotelId, filters);
  }

  // ─── Get Enrollment Details ──────────────────────────
  async getEnrollmentDetails(
    enrollmentId: string,
    hotelId: string | Types.ObjectId
  ): Promise<IEnrollmentDoc> {
    const enrollment = await enrollmentRepo.findById(enrollmentId, hotelId);
    if (!enrollment) throw ApiError.notFound("Enrollment not found");
    return enrollment;
  }

  // ─── Get Course Enrollments (Admin) ──────────────────
  async getCourseEnrollments(
    courseId: string,
    hotelId: string | Types.ObjectId,
    filters: IEnrollmentFilters
  ): Promise<{ enrollments: IEnrollmentDoc[]; total: number }> {
    return enrollmentRepo.findByCourse(courseId, hotelId, filters);
  }

  // ─── Drop Course ─────────────────────────────────────
  async dropCourse(
    courseId: string,
    userId: string,
    hotelId: string | Types.ObjectId
  ): Promise<IEnrollmentDoc> {
    const enrollment = await enrollmentRepo.findByUserAndCourse(
      userId,
      courseId,
      hotelId
    );

    if (!enrollment) throw ApiError.notFound("Enrollment not found");

    if (enrollment.status === EnrollmentStatus.COMPLETED) {
      throw ApiError.badRequest("Cannot drop a completed course");
    }

    const updated = await enrollmentRepo.update(
      enrollment._id.toString(),
      hotelId,
      { status: EnrollmentStatus.DROPPED } as Partial<IEnrollmentDoc>
    );

    return updated!;
  }

  // ─── Private Helpers ─────────────────────────────────
  private async checkAndUpdateModuleCompletion(
    enrollmentId: string,
    moduleId: string,
    hotelId: string | Types.ObjectId,
    courseId: string
  ): Promise<void> {
    const enrollment = await enrollmentRepo.findById(enrollmentId, hotelId);
    if (!enrollment) return;

    // Get all lectures in the module
    const moduleLectures = await lectureRepo.findByModule(moduleId, hotelId);
    const completedLectureIds = enrollment.completedLectures.map((l) =>
      l.toString()
    );

    const allLecturesCompleted = moduleLectures.every((lecture) =>
      completedLectureIds.includes(lecture._id.toString())
    );

    if (allLecturesCompleted) {
      await enrollmentRepo.markModuleCompleted(
        enrollmentId,
        hotelId,
        new Types.ObjectId(moduleId)
      );
    }

    // Recalculate overall progress
    const course = await courseRepo.findById(courseId, hotelId);
    if (!course || course.totalModules === 0) return;

    const refreshed = await enrollmentRepo.findById(enrollmentId, hotelId);
    if (!refreshed) return;

    const totalLectures = await lectureRepo.findByCourse(courseId, hotelId);
    const lectureProgress =
      totalLectures.length > 0
        ? Math.round(
            (refreshed.completedLectures.length / totalLectures.length) * 100
          )
        : 0;

    const isCompleted = lectureProgress >= 100;

    await enrollmentRepo.updateProgress(
      enrollmentId,
      hotelId,
      lectureProgress,
      isCompleted ? EnrollmentStatus.COMPLETED : undefined
    );

    // Issue certificate if completed
    if (isCompleted) {
      await this.issueCertificate(
        refreshed.user.toString(),
        courseId,
        enrollmentId,
        hotelId
      );
    }
  }

  private async issueCertificate(
    userId: string,
    courseId: string,
    enrollmentId: string,
    hotelId: string | Types.ObjectId
  ): Promise<void> {
    const existing = await certificateRepo.exists(userId, courseId, hotelId);
    if (existing) return;

    const certificateNumber = `CERT-${uuidv4().slice(0, 8).toUpperCase()}`;

    await certificateRepo.create({
      user: new Types.ObjectId(userId),
      course: new Types.ObjectId(courseId),
      enrollment: new Types.ObjectId(enrollmentId),
      hotel: hotelId as Types.ObjectId,
      certificateNumber,
      issueDate: new Date(),
      certificateUrl: `/certificates/${certificateNumber}.pdf`, // Placeholder
    });

    // Update enrollment with certificate info
    await enrollmentRepo.update(enrollmentId, hotelId, {
      certificateUrl: `/certificates/${certificateNumber}.pdf`,
      certificateIssuedAt: new Date(),
    } as Partial<IEnrollmentDoc>);
  }
}