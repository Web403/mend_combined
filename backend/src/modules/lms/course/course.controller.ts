import { Response, NextFunction } from "express";
import { CourseService } from "./course.service";
import { ApiResponse } from "../../../core/utils/ApiResponse";
import { resolveLmsHotelId } from "../../../core/utils/resolve-hotel-id";
import { getString } from "../../../core/utils/string.helper";
import { AuthenticatedRequest } from "../../../core/middleware/auth.middleware";

const courseService = new CourseService();

export class CourseController {
  // ─── Categories ──────────────────────────────────────
  static async createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const category = await courseService.createCategory(req.body, hotelId);
      res
        .status(201)
        .json(ApiResponse.success("Category created successfully", category));
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const categories = await courseService.getCategories(hotelId);
      res.json(ApiResponse.success("Categories fetched", categories));
    } catch (error) {
      next(error);
    }
  }

  static async getCategoryById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const category = await courseService.getCategoryById(getString(req.params.id) ?? "", hotelId);
      res.json(ApiResponse.success("Category fetched", category));
    } catch (error) {
      next(error);
    }
  }

  static async updateCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const category = await courseService.updateCategory(
        getString(req.params.id) ?? "",
        hotelId,
        req.body
      );
      res.json(ApiResponse.success("Category updated", category));
    } catch (error) {
      next(error);
    }
  }

  static async deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      await courseService.deleteCategory(getString(req.params.id) ?? "", hotelId);
      res.json(ApiResponse.success("Category deleted"));
    } catch (error) {
      next(error);
    }
  }

  // ─── Courses ─────────────────────────────────────────
  static async createCourse(req: AuthenticatedRequest , res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const userId = req.user?.id;
      const course = await courseService.createCourse(req.body, hotelId, userId);
      res.status(201).json(ApiResponse.success("Course created", course));
    } catch (error) {
      next(error);
    }
  }

  static async getCourses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const filters = {
        hotel: hotelId,
        category: req.query.category as string,
        status: req.query.status as any,
        difficulty: req.query.difficulty as any,
        badge: req.query.badge as any,
        search: req.query.search as string,
        isActive: req.query.isActive === "false" ? false : true,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: (req.query.sortBy as string) || "sortOrder",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "asc",
      };

      const result = await courseService.getCourses(filters);
      res.json(ApiResponse.success("Courses fetched", result));
    } catch (error) {
      next(error);
    }
  }

  static async getCourseById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const course = await courseService.getCourseById(getString(req.params.id) ?? "", hotelId);
      res.json(ApiResponse.success("Course fetched", course));
    } catch (error) {
      next(error);
    }
  }

  static async getCourseBySlug(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const course = await courseService.getCourseBySlug(getString(req.params.slug) ?? "", hotelId);
      res.json(ApiResponse.success("Course fetched", course));
    } catch (error) {
      next(error);
    }
  }

  static async updateCourse(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const course = await courseService.updateCourse(
        getString(req.params.id) ?? "",
        hotelId,
        req.body
      );
      res.json(ApiResponse.success("Course updated", course));
    } catch (error) {
      next(error);
    }
  }

  static async publishCourse(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const course = await courseService.publishCourse(getString(req.params.id) ?? "", hotelId);
      res.json(ApiResponse.success("Course published", course));
    } catch (error) {
      next(error);
    }
  }

  static async archiveCourse(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const course = await courseService.archiveCourse(getString(req.params.id) ?? "", hotelId);
      res.json(ApiResponse.success("Course archived", course));
    } catch (error) {
      next(error);
    }
  }

  static async deleteCourse(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      await courseService.deleteCourse(getString(req.params.id) ?? "", hotelId);
      res.json(ApiResponse.success("Course deleted"));
    } catch (error) {
      next(error);
    }
  }

  // ─── Modules ─────────────────────────────────────────
  static async createModule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const module = await courseService.createModule(req.body, hotelId);
      res.status(201).json(ApiResponse.success("Module created", module));
    } catch (error) {
      next(error);
    }
  }

  static async getModulesByCourse(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const modules = await courseService.getModulesByCourse(
        getString(req.params.courseId) ?? "",
        hotelId
      );
      res.json(ApiResponse.success("Modules fetched", modules));
    } catch (error) {
      next(error);
    }
  }

  static async getModuleById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const module = await courseService.getModuleById(getString(req.params.id) ?? "", hotelId);
      res.json(ApiResponse.success("Module fetched", module));
    } catch (error) {
      next(error);
    }
  }

  static async updateModule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const module = await courseService.updateModule(
        getString(req.params.id) ?? "",
        hotelId,
        req.body
      );
      res.json(ApiResponse.success("Module updated", module));
    } catch (error) {
      next(error);
    }
  }

  static async reorderModules(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      await courseService.reorderModules(
        getString(req.params.courseId) ?? "",
        hotelId,
        req.body.moduleOrders
      );
      res.json(ApiResponse.success("Modules reordered"));
    } catch (error) {
      next(error);
    }
  }

  static async deleteModule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      await courseService.deleteModule(getString(req.params.id) ?? "", hotelId);
      res.json(ApiResponse.success("Module deleted"));
    } catch (error) {
      next(error);
    }
  }
}