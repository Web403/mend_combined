import { Types, QueryFilter } from "mongoose";
import { Lecture } from "./lecture.model";
import { ILectureDoc, ILectureFilters } from "../../../shared/interfaces/lms";

export class LectureRepository {
  async create(data: Partial<ILectureDoc>): Promise<ILectureDoc> {
    return Lecture.create(data);
  }

  async findById(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<ILectureDoc | null> {
    return Lecture.findOne({ _id: id, hotel: hotelId });
  }

  async findByModule(
    moduleId: string,
    hotelId: string | Types.ObjectId,
    onlyActive = true
  ): Promise<ILectureDoc[]> {
    const filter: QueryFilter<ILectureDoc> = {
      module: moduleId,
      hotel: hotelId,
    };
    if (onlyActive) filter.isActive = true;
    return Lecture.find(filter).sort({ orderIndex: 1 });
  }

  async findByCourse(
    courseId: string,
    hotelId: string | Types.ObjectId
  ): Promise<ILectureDoc[]> {
    return Lecture.find({
      course: courseId,
      hotel: hotelId,
      isActive: true,
    }).sort({ orderIndex: 1 });
  }

  async update(
    id: string,
    hotelId: string | Types.ObjectId,
    data: Partial<ILectureDoc>
  ): Promise<ILectureDoc | null> {
    return Lecture.findOneAndUpdate(
      { _id: id, hotel: hotelId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async delete(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<ILectureDoc | null> {
    return Lecture.findOneAndDelete({ _id: id, hotel: hotelId });
  }

  async getNextOrderIndex(moduleId: string | Types.ObjectId): Promise<number> {
    const lastLecture = await Lecture.findOne({ module: moduleId })
      .sort({ orderIndex: -1 })
      .select("orderIndex")
      .lean();
    return (lastLecture?.orderIndex ?? 0) + 1;
  }

  async reorder(
    moduleId: string,
    hotelId: string | Types.ObjectId,
    lectureOrders: { lectureId: string; orderIndex: number }[]
  ): Promise<void> {
    const bulkOps = lectureOrders.map(({ lectureId, orderIndex }) => ({
      updateOne: {
        filter: { _id: lectureId, module: moduleId, hotel: hotelId },
        update: { $set: { orderIndex } },
      },
    }));
    await Lecture.bulkWrite(bulkOps);
  }

  async countByModule(moduleId: string | Types.ObjectId): Promise<number> {
    return Lecture.countDocuments({ module: moduleId, isActive: true });
  }

  async deleteByModule(
    moduleId: string,
    hotelId: string | Types.ObjectId
  ): Promise<number> {
    const result = await Lecture.deleteMany({ module: moduleId, hotel: hotelId });
    return result.deletedCount;
  }

  async deleteByCourse(
    courseId: string,
    hotelId: string | Types.ObjectId
  ): Promise<number> {
    const result = await Lecture.deleteMany({ course: courseId, hotel: hotelId });
    return result.deletedCount;
  }
}