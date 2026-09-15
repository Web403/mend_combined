import { Types } from "mongoose";
import {
  CategoryRepository,
  CourseRepository,
  ModuleRepository,
} from "./course.repository";
import { LectureRepository } from "../lecture/lecture.repository";
import {
  AssessmentRepository,
  AssessmentQuestionRepository,
} from "../assessment/assessment.repository";
import {
  ICategoryDoc,
  ICourseDoc,
  IModuleDoc,
  ICourseFilters,
} from "../../../shared/interfaces/lms";
import { CourseStatus } from "../../../shared/enums/lms.enum";
import { ApiError } from "../../../core/utils/ApiResponse";
import slugify from "../../../core/utils/slugify";

const categoryRepo = new CategoryRepository();
const courseRepo = new CourseRepository();
const moduleRepo = new ModuleRepository();
const lectureRepo = new LectureRepository();
const assessmentRepo = new AssessmentRepository();
const assessmentQuestionRepo = new AssessmentQuestionRepository();

export class CourseService {
  // ─── Categories ──────────────────────────────────────
  async createCategory(
    data: { name: string; description?: string; icon?: string; sortOrder?: number },
    hotelId: string | Types.ObjectId
  ): Promise<ICategoryDoc> {
    const slug = slugify(data.name, { lower: true, strict: true });

    const existing = await categoryRepo.findBySlug(slug, hotelId);
    if (existing) {
      throw ApiError.conflict("Category with this name already exists");
    }

    return categoryRepo.create({
      ...data,
      slug,
      hotel: hotelId as Types.ObjectId,
    });
  }

  async getCategories(hotelId: string | Types.ObjectId): Promise<ICategoryDoc[]> {
    return categoryRepo.findAll(hotelId);
  }

  async getCategoryById(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<ICategoryDoc> {
    const category = await categoryRepo.findById(id, hotelId);
    if (!category) throw ApiError.notFound("Category not found");
    return category;
  }

  async updateCategory(
    id: string,
    hotelId: string | Types.ObjectId,
    data: Partial<ICategoryDoc>
  ): Promise<ICategoryDoc> {
    if (data.name) {
      data.slug = slugify(data.name, { lower: true, strict: true });
    }
    const updated = await categoryRepo.update(id, hotelId, data);
    if (!updated) throw ApiError.notFound("Category not found");
    return updated;
  }

  async deleteCategory(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<void> {
    const courseCount = await categoryRepo.countCourses(id, hotelId);
    if (courseCount > 0) {
      throw ApiError.badRequest(
        `Cannot delete category with ${courseCount} associated courses`
      );
    }
    const deleted = await categoryRepo.delete(id, hotelId);
    if (!deleted) throw ApiError.notFound("Category not found");
  }

  // ─── Courses ─────────────────────────────────────────
  async createCourse(
    data: {
      title: string;
      categoryId: string;
      description?: string;
      coverImage?: string;
      icon?: string;
      learningOutcomes?: string[];
      tags?: string[];
      badge?: string;
      difficulty?: string;
      estimatedDurationMinutes?: number;
    },
    hotelId: string | Types.ObjectId,
    createdBy?: string | Types.ObjectId
  ): Promise<ICourseDoc> {
    // Verify category exists
    const category = await categoryRepo.findById(data.categoryId, hotelId);
    if (!category) throw ApiError.notFound("Category not found");

    const slug = slugify(data.title, { lower: true, strict: true });

    const existing = await courseRepo.findBySlug(slug, hotelId);
    if (existing) {
      throw ApiError.conflict("Course with this title already exists");
    }

    return courseRepo.create({
      title: data.title,
      slug,
      category: new Types.ObjectId(data.categoryId),
      hotel: hotelId as Types.ObjectId,
      description: data.description,
      coverImage: data.coverImage,
      icon: data.icon,
      learningOutcomes: data.learningOutcomes || [],
      tags: data.tags || [],
      badge: data.badge as any,
      difficulty: data.difficulty as any,
      estimatedDurationMinutes: data.estimatedDurationMinutes || 0,
      createdBy: createdBy ? (createdBy as Types.ObjectId) : undefined,
    });
  }

  async getCourses(filters: ICourseFilters): Promise<{
    courses: ICourseDoc[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { courses, total } = await courseRepo.findAll(filters);
    const page = filters.page || 1;
    const limit = filters.limit || 20;

    return {
      courses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCourseById(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<ICourseDoc> {
    const course = await courseRepo.findById(id, hotelId, true);
    if (!course) throw ApiError.notFound("Course not found");
    return course;
  }

  async getCourseBySlug(
    slug: string,
    hotelId: string | Types.ObjectId
  ): Promise<ICourseDoc> {
    const course = await courseRepo.findBySlug(slug, hotelId, true);
    if (!course) throw ApiError.notFound("Course not found");
    return course;
  }

  async updateCourse(
    id: string,
    hotelId: string | Types.ObjectId,
    data: Partial<ICourseDoc>
  ): Promise<ICourseDoc> {
    if (data.title) {
      data.slug = slugify(data.title as string, { lower: true, strict: true });
    }
    const updated = await courseRepo.update(id, hotelId, data);
    if (!updated) throw ApiError.notFound("Course not found");
    return updated;
  }

  async publishCourse(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<ICourseDoc> {
    const course = await courseRepo.findById(id, hotelId, true);
    if (!course) throw ApiError.notFound("Course not found");

    if (course.totalModules === 0) {
      throw ApiError.badRequest("Course must have at least one module to publish");
    }

    const updated = await courseRepo.update(id, hotelId, {
      status: CourseStatus.PUBLISHED,
      publishedAt: new Date(),
    } as Partial<ICourseDoc>);

    return updated!;
  }

  async archiveCourse(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<ICourseDoc> {
    const updated = await courseRepo.update(id, hotelId, {
      status: CourseStatus.ARCHIVED,
    } as Partial<ICourseDoc>);
    if (!updated) throw ApiError.notFound("Course not found");
    return updated;
  }

  async deleteCourse(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<void> {
    const course = await courseRepo.findById(id, hotelId);
    if (!course) throw ApiError.notFound("Course not found");

    // Cascade delete all related data
    await Promise.all([
      lectureRepo.deleteByCourse(id, hotelId),
      assessmentRepo.deleteByCourse(id, hotelId),
      // Assessment questions are deleted via assessment cascade
    ]);

    // Delete modules
    const modules = await moduleRepo.findByCourse(id, hotelId, false);
    for (const mod of modules) {
      await moduleRepo.delete(mod._id.toString(), hotelId);
    }

    await courseRepo.delete(id, hotelId);
  }

  // ─── Modules ─────────────────────────────────────────
  async createModule(
    data: {
      courseId: string;
      title: string;
      description?: string;
      estimatedDurationMinutes?: number;
    },
    hotelId: string | Types.ObjectId
  ): Promise<IModuleDoc> {
    const course = await courseRepo.findById(data.courseId, hotelId);
    if (!course) throw ApiError.notFound("Course not found");

    const slug = slugify(data.title, { lower: true, strict: true });
    const orderIndex = await moduleRepo.getNextOrderIndex(data.courseId);

    const module = await moduleRepo.create({
      course: new Types.ObjectId(data.courseId),
      hotel: hotelId as Types.ObjectId,
      title: data.title,
      slug,
      description: data.description,
      orderIndex,
      estimatedDurationMinutes: data.estimatedDurationMinutes || 0,
    });

    // Update course counts & learning outcomes
    await courseRepo.incrementModuleCount(data.courseId, 1);

    // Auto-add to learning outcomes if not already there
    if (!course.learningOutcomes.includes(data.title)) {
      await courseRepo.update(data.courseId, hotelId, {
        $push: { learningOutcomes: data.title },
      } as any);
    }

    return module;
  }

  async getModulesByCourse(
    courseId: string,
    hotelId: string | Types.ObjectId
  ): Promise<IModuleDoc[]> {
    const course = await courseRepo.findById(courseId, hotelId);
    if (!course) throw ApiError.notFound("Course not found");
    return moduleRepo.findByCourse(courseId, hotelId);
  }

  async getModuleById(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<IModuleDoc> {
    const module = await moduleRepo.findById(id, hotelId, true);
    if (!module) throw ApiError.notFound("Module not found");
    return module;
  }

  async updateModule(
    id: string,
    hotelId: string | Types.ObjectId,
    data: Partial<IModuleDoc>
  ): Promise<IModuleDoc> {
    if (data.title) {
      data.slug = slugify(data.title as string, { lower: true, strict: true });
    }
    const updated = await moduleRepo.update(id, hotelId, data);
    if (!updated) throw ApiError.notFound("Module not found");
    return updated;
  }

  async reorderModules(
    courseId: string,
    hotelId: string | Types.ObjectId,
    moduleOrders: { moduleId: string; orderIndex: number }[]
  ): Promise<void> {
    const course = await courseRepo.findById(courseId, hotelId);
    if (!course) throw ApiError.notFound("Course not found");
    await moduleRepo.reorder(courseId, hotelId, moduleOrders);
  }

  async deleteModule(
    id: string,
    hotelId: string | Types.ObjectId
  ): Promise<void> {
    const module = await moduleRepo.findById(id, hotelId);
    if (!module) throw ApiError.notFound("Module not found");

    // Cascade delete lectures, assessment, questions
    await Promise.all([
      lectureRepo.deleteByModule(id, hotelId),
      assessmentRepo.deleteByModule(id, hotelId),
    ]);

    await moduleRepo.delete(id, hotelId);

    // Update course counts
    await courseRepo.incrementModuleCount(module.course, -1);
    await courseRepo.recalculateCounts(module.course);
  }
}