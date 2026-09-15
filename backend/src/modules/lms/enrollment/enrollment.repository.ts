import { Types } from "mongoose";
import { Enrollment } from "./enrollment.model";
import {
  IEnrollmentDoc,
  IEnrollmentFilters,
} from "../../../shared/interfaces/lms";
import { EnrollmentStatus } from "../../../shared/enums/lms.enum";

export class EnrollmentRepository {
  async create(data: Partial<IEnrollmentDoc>): Promise<IEnrollmentDoc> {
    return Enrollment.create(data);
  }

  async findById(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<IEnrollmentDoc | null> {
    return Enrollment.findOne({ _id: id, hotel: hotelId })
      .populate("course", "title slug coverImage totalModules totalQuizQuestions")
      .populate("lastAccessedModule", "title orderIndex")
      .populate("lastAccessedLecture", "title orderIndex");
  }

  async findByUserAndCourse(
    userId: string,
    courseId: string,
    hotelId: string | Types.ObjectId
  ): Promise<IEnrollmentDoc | null> {
    return Enrollment.findOne({
      user: userId,
      course: courseId,
      hotel: hotelId,
    });
  }

  async findByUser(
    userId: string,
    hotelId: string | Types.ObjectId,
    filters: IEnrollmentFilters
  ): Promise<{ enrollments: IEnrollmentDoc[]; total: number }> {
    const { status, page = 1, limit = 20 } = filters;

    const filter: Record<string, unknown> = {
      user: userId,
      hotel: hotelId,
    };

    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      Enrollment.find(filter)
        .populate("course", "title slug coverImage icon badge category totalModules totalQuizQuestions")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Enrollment.countDocuments(filter),
    ]);

    return { enrollments: enrollments as IEnrollmentDoc[], total };
  }

  async findByCourse(
    courseId: string,
    hotelId: string | Types.ObjectId,
    filters: IEnrollmentFilters
  ): Promise<{ enrollments: IEnrollmentDoc[]; total: number }> {
    const { status, page = 1, limit = 20 } = filters;

    const filter: Record<string, unknown> = {
      course: courseId,
      hotel: hotelId,
    };

    if (status) (filter as Record<string, unknown>).status = status;

    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      Enrollment.find(filter)
        .populate("user", "firstName lastName email avatar")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Enrollment.countDocuments(filter),
    ]);

    return { enrollments: enrollments as IEnrollmentDoc[], total };
  }

  async update(
    id: string,
    hotelId: string | Types.ObjectId,
    data: Partial<IEnrollmentDoc>
  ): Promise<IEnrollmentDoc | null> {
    return Enrollment.findOneAndUpdate(
      { _id: id, hotel: hotelId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async updateByUserAndCourse(
    userId: string,
    courseId: string,
    hotelId: string | Types.ObjectId,
    data: Partial<IEnrollmentDoc>
  ): Promise<IEnrollmentDoc | null> {
    return Enrollment.findOneAndUpdate(
      { user: userId, course: courseId, hotel: hotelId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async markLectureCompleted(
    enrollmentId: string,
    hotelId: string | Types.ObjectId,
    lectureId: string | Types.ObjectId,
    moduleId: string | Types.ObjectId
  ): Promise<IEnrollmentDoc | null> {
    return Enrollment.findOneAndUpdate(
      { _id: enrollmentId, hotel: hotelId },
      {
        $addToSet: { completedLectures: lectureId },
        $set: {
          lastAccessedLecture: lectureId,
          lastAccessedModule: moduleId,
          lastAccessedAt: new Date(),
        },
      },
      { new: true }
    );
  }

  async markModuleCompleted(
    enrollmentId: string,
    hotelId: string | Types.ObjectId,
    moduleId: string | Types.ObjectId
  ): Promise<IEnrollmentDoc | null> {
    return Enrollment.findOneAndUpdate(
      { _id: enrollmentId, hotel: hotelId },
      {
        $addToSet: { completedModules: moduleId },
        $set: { lastAccessedAt: new Date() },
      },
      { new: true }
    );
  }

  async updateProgress(
    enrollmentId: string,
    hotelId: string | Types.ObjectId,
    progressPercentage: number,
    status?: EnrollmentStatus
  ): Promise<IEnrollmentDoc | null> {
    const updateData: Record<string, any> = { progressPercentage };

    if (status) {
      updateData.status = status;
      if (status === EnrollmentStatus.COMPLETED) {
        updateData.completedAt = new Date();
      }
    }

    return Enrollment.findOneAndUpdate(
      { _id: enrollmentId, hotel: hotelId },
      { $set: updateData },
      { new: true }
    );
  }

  async isEnrolled(
    userId: string,
    courseId: string,
    hotelId: string | Types.ObjectId
  ): Promise<boolean> {
    const enrollment = await Enrollment.findOne({
      user: userId,
      course: courseId,
      hotel: hotelId,
      status: {
        $in: [
          EnrollmentStatus.ENROLLED,
          EnrollmentStatus.IN_PROGRESS,
          EnrollmentStatus.COMPLETED,
        ],
      },
    })
      .select("_id")
      .lean();
    return !!enrollment;
  }

  async countByCourse(
    courseId: string,
    hotelId: string | Types.ObjectId,
    status?: EnrollmentStatus
  ): Promise<number> {
    const filter: Record<string, unknown> = {
      course: courseId,
      hotel: hotelId,
    };
    if (status) (filter as Record<string, unknown>).status = status;
    return Enrollment.countDocuments(filter);
  }

  async delete(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<IEnrollmentDoc | null> {
    return Enrollment.findOneAndDelete({ _id: id, hotel: hotelId });
  }
}