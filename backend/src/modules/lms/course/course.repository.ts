import { Types } from "mongoose";
import type { QueryFilter } from "mongoose";
import { Category, Course, Module } from "./course.model";
import {
  ICategoryDoc,
  ICourseDoc,
  IModuleDoc,
  ICourseFilters,
  IModuleFilters,
} from "../../../shared/interfaces/lms";
import { CourseStatus } from "../../../shared/enums/lms.enum";

// ─── Category Repository ────────────────────────────────
export class CategoryRepository {
  async create(data: Partial<ICategoryDoc>): Promise<ICategoryDoc> {
    return Category.create(data);
  }

  async findById(id: string, hotelId: string | Types.ObjectId): Promise<ICategoryDoc | null> {
    return Category.findOne({ _id: id, hotel: hotelId });
  }

  async findBySlug(slug: string, hotelId: string | Types.ObjectId): Promise<ICategoryDoc | null> {
    return Category.findOne({ slug, hotel: hotelId });
  }

  async findAll(hotelId: string | Types.ObjectId, onlyActive = true): Promise<ICategoryDoc[]> {
    const filter: QueryFilter<ICategoryDoc> = { hotel: hotelId };
    if (onlyActive) filter.isActive = true;
    return Category.find(filter).sort({ sortOrder: 1, name: 1 });
  }

  async update(
    id: string,
    hotelId: string | Types.ObjectId,
    data: Partial<ICategoryDoc>
  ): Promise<ICategoryDoc | null> {
    return Category.findOneAndUpdate(
      { _id: id, hotel: hotelId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async delete(id: string, hotelId: string | Types.ObjectId): Promise<ICategoryDoc | null> {
    return Category.findOneAndDelete({ _id: id, hotel: hotelId });
  }

  async countCourses(categoryId: string, hotelId: string | Types.ObjectId): Promise<number> {
    return Course.countDocuments({
      category: categoryId,
      hotel: hotelId,
      isActive: true,
    });
  }
}

// ─── Course Repository ──────────────────────────────────
export class CourseRepository {
  async create(data: Partial<ICourseDoc>): Promise<ICourseDoc> {
    return Course.create(data);
  }

  async findById(
    id: string,
    hotelId: string | Types.ObjectId,
    populate = false
  ): Promise<ICourseDoc | null> {
    const query = Course.findOne({ _id: id, hotel: hotelId });
    if (populate) {
      query.populate("category", "name slug icon");
      query.populate({
        path: "modules",
        select: "title slug description orderIndex totalLessons totalQuizQuestions",
        match: { isActive: true },
        options: { sort: { orderIndex: 1 } },
      });
    }
    return query;
  }

  async findBySlug(
    slug: string,
    hotelId: string | Types.ObjectId,
    populate = false
  ): Promise<ICourseDoc | null> {
    const query = Course.findOne({ slug, hotel: hotelId });
    if (populate) {
      query.populate("category", "name slug icon");
      query.populate({
        path: "modules",
        select: "title slug description orderIndex totalLessons totalQuizQuestions",
        match: { isActive: true },
        options: { sort: { orderIndex: 1 } },
      });
    }
    return query;
  }

  async findAll(
    filters: ICourseFilters
  ): Promise<{ courses: ICourseDoc[]; total: number }> {
    const {
      hotel,
      category,
      status,
      difficulty,
      badge,
      search,
      isActive = true,
      page = 1,
      limit = 20,
      sortBy = "sortOrder",
      sortOrder = "asc",
    } = filters;

    const filter: QueryFilter<ICourseDoc> = { hotel };

    if (isActive !== undefined) filter.isActive = isActive;
    if (category) filter.category = category;
    if (status) filter.status = status;
    else filter.status = CourseStatus.PUBLISHED; // default: only published
    if (difficulty) filter.difficulty = difficulty;
    if (badge) filter.badge = badge;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate("category", "name slug icon")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Course.countDocuments(filter),
    ]);

    return { courses: courses as ICourseDoc[], total };
  }

  async update(
    id: string,
    hotelId: string | Types.ObjectId,
    data: Partial<ICourseDoc>
  ): Promise<ICourseDoc | null> {
    return Course.findOneAndUpdate(
      { _id: id, hotel: hotelId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async delete(id: string, hotelId: string | Types.ObjectId): Promise<ICourseDoc | null> {
    return Course.findOneAndDelete({ _id: id, hotel: hotelId });
  }

  async incrementModuleCount(
    courseId: string | Types.ObjectId,
    increment: number
  ): Promise<void> {
    await Course.findByIdAndUpdate(courseId, {
      $inc: { totalModules: increment },
    });
  }

  async incrementQuizQuestionCount(
    courseId: string | Types.ObjectId,
    increment: number
  ): Promise<void> {
    await Course.findByIdAndUpdate(courseId, {
      $inc: { totalQuizQuestions: increment },
    });
  }

  async recalculateCounts(courseId: string | Types.ObjectId): Promise<void> {
    const [moduleCount, questionCount] = await Promise.all([
      Module.countDocuments({ course: courseId, isActive: true }),
      // We'll import AssessmentQuestion at service level to avoid circular deps
      mongoose.model("LmsAssessmentQuestion").countDocuments({
        course: courseId,
        isActive: true,
      }),
    ]);

    await Course.findByIdAndUpdate(courseId, {
      $set: {
        totalModules: moduleCount,
        totalQuizQuestions: questionCount,
      },
    });
  }
}

// ─── Module Repository ──────────────────────────────────
import mongoose from "mongoose";

export class ModuleRepository {
  async create(data: Partial<IModuleDoc>): Promise<IModuleDoc> {
    return Module.create(data);
  }

  async findById(
    id: string,
    hotelId: string | Types.ObjectId,
    populate = false
  ): Promise<IModuleDoc | null> {
    const query = Module.findOne({ _id: id, hotel: hotelId });
    console.log("ModuleRepository.findById called with id:", id, "hotelId:", hotelId, "populate:", populate);
    if (populate) {
      query.populate({
        path: "lectures",
        select: "title slug orderIndex difficulty estimatedDurationMinutes",
        match: { isActive: true },
        options: { sort: { orderIndex: 1 } },
      });
      query.populate({
        path: "assessment",
        select: "title slug totalQuestions passingPercentage",
        match: { isActive: true },
      });
    }
    return query;
  }

  async findByCourse(
    courseId: string,
    hotelId: string | Types.ObjectId,
    onlyActive = true
  ): Promise<IModuleDoc[]> {
    const filter: QueryFilter<IModuleDoc> = {
      course: courseId,
      hotel: hotelId,
    };
    if (onlyActive) filter.isActive = true;

    return Module.find(filter).sort({ orderIndex: 1 });
  }

  async update(
    id: string,
    hotelId: string | Types.ObjectId,
    data: Partial<IModuleDoc>
  ): Promise<IModuleDoc | null> {
    return Module.findOneAndUpdate(
      { _id: id, hotel: hotelId },
      { $set: data },
      { new: true, runValidators: true }
    );
  }

  async delete(id: string, hotelId: string | Types.ObjectId): Promise<IModuleDoc | null> {
    return Module.findOneAndDelete({ _id: id, hotel: hotelId });
  }

  async getNextOrderIndex(courseId: string | Types.ObjectId): Promise<number> {
    const lastModule = await Module.findOne({ course: courseId })
      .sort({ orderIndex: -1 })
      .select("orderIndex")
      .lean();
    return (lastModule?.orderIndex ?? 0) + 1;
  }

  async reorder(
    courseId: string,
    hotelId: string | Types.ObjectId,
    moduleOrders: { moduleId: string; orderIndex: number }[]
  ): Promise<void> {
    const bulkOps = moduleOrders.map(({ moduleId, orderIndex }) => ({
      updateOne: {
        filter: { _id: moduleId, course: courseId, hotel: hotelId },
        update: { $set: { orderIndex } },
      },
    }));
    await Module.bulkWrite(bulkOps);
  }

  async incrementLessonCount(
    moduleId: string | Types.ObjectId,
    increment: number
  ): Promise<void> {
    await Module.findByIdAndUpdate(moduleId, {
      $inc: { totalLessons: increment },
    });
  }

  async incrementQuizQuestionCount(
    moduleId: string | Types.ObjectId,
    increment: number
  ): Promise<void> {
    await Module.findByIdAndUpdate(moduleId, {
      $inc: { totalQuizQuestions: increment },
    });
  }
}