import { Types } from "mongoose";
import { LectureRepository } from "./lecture.repository";
import { ModuleRepository } from "../course/course.repository";
import { ILectureDoc } from "../../../shared/interfaces/lms";
import { ApiError } from "../../../core/utils/ApiResponse";
import slugify from "../../../core/utils/slugify";

const lectureRepo = new LectureRepository();
const moduleRepo = new ModuleRepository();

export class LectureService {
  async createLecture(
    data: {
      module: string;
      course: string;
      title: string;
      difficulty?: string;
      content: string;
      steps?: { stepNumber: number; text: string }[];
      keyFigures?: string[];
      contentBlocks?: any[];
      estimatedDurationMinutes?: number;
    },
    hotelId: string | Types.ObjectId
  ): Promise<ILectureDoc> {
    const module = await moduleRepo.findById(data.module, hotelId);
    if (!module) throw ApiError.notFound("Module not found");

    if (module.course.toString() !== data.course) {
      throw ApiError.badRequest("Module does not belong to the specified course");
    }

    const slug = slugify(data.title, { lower: true, strict: true });
    const orderIndex = await lectureRepo.getNextOrderIndex(data.module);

    const lecture = await lectureRepo.create({
      module: new Types.ObjectId(data.module),
      course: new Types.ObjectId(data.course),
      hotel: hotelId as Types.ObjectId,
      title: data.title,
      slug,
      orderIndex,
      difficulty: data.difficulty as any,
      content: data.content,
      steps: data.steps || [],
      keyFigures: data.keyFigures || [],
      contentBlocks: data.contentBlocks || [],
      estimatedDurationMinutes: data.estimatedDurationMinutes || 0,
    });

    // Update module lesson count
    await moduleRepo.incrementLessonCount(data.module, 1);

    return lecture;
  }

  async getLecturesByModule(
    moduleId: string,
    hotelId: string | Types.ObjectId
  ): Promise<ILectureDoc[]> {
    return lectureRepo.findByModule(moduleId, hotelId);
  }

  async getLectureById(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<ILectureDoc> {
    const lecture = await lectureRepo.findById(id, hotelId);
    if (!lecture) throw ApiError.notFound("Lecture not found");
    return lecture;
  }

  async getLectureWithNavigation(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<{
    lecture: ILectureDoc;
    previous: { _id: string; title: string } | null;
    next: { _id: string; title: string } | null;
    currentIndex: number;
    totalLectures: number;
  }> {
    const lecture = await lectureRepo.findById(id, hotelId);
    if (!lecture) throw ApiError.notFound("Lecture not found");

    const allLectures = await lectureRepo.findByModule(
      lecture.module.toString(),
      hotelId
    );

    const currentIdx = allLectures.findIndex(
      (l) => l._id.toString() === id
    );

    return {
      lecture,
      previous: currentIdx > 0
        ? { _id: allLectures[currentIdx - 1]._id.toString(), title: allLectures[currentIdx - 1].title }
        : null,
      next: currentIdx < allLectures.length - 1
        ? { _id: allLectures[currentIdx + 1]._id.toString(), title: allLectures[currentIdx + 1].title }
        : null,
      currentIndex: currentIdx + 1,
      totalLectures: allLectures.length,
    };
  }

  async updateLecture(
    id: string,
    hotelId: string | Types.ObjectId,
    data: Partial<ILectureDoc>
  ): Promise<ILectureDoc> {
    if (data.title) {
      data.slug = slugify(data.title as string, { lower: true, strict: true });
    }
    const updated = await lectureRepo.update(id, hotelId, data);
    if (!updated) throw ApiError.notFound("Lecture not found");
    return updated;
  }

  async reorderLectures(
    moduleId: string,
    hotelId: string | Types.ObjectId,
    lectureOrders: { lectureId: string; orderIndex: number }[]
  ): Promise<void> {
    await lectureRepo.reorder(moduleId, hotelId, lectureOrders);
  }

  async deleteLecture(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<void> {
    const lecture = await lectureRepo.findById(id, hotelId);
    if (!lecture) throw ApiError.notFound("Lecture not found");

    await lectureRepo.delete(id, hotelId);
    await moduleRepo.incrementLessonCount(lecture.module, -1);
  }
}