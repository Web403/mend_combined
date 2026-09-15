import { Response, NextFunction } from "express";
import { EnrollmentService } from "./enrollment.service";
import { ApiResponse } from "../../../core/utils/ApiResponse";
import { resolveLmsHotelId } from "../../../core/utils/resolve-hotel-id";
import { getString } from "../../../core/utils/string.helper";
import { AuthenticatedRequest } from "../../../core/middleware/auth.middleware";

const enrollmentService = new EnrollmentService();

export class EnrollmentController {
  static async applyToCourse(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const userId = req.user?.id ?? "";
      const enrollment = await enrollmentService.applyToCourse(
        getString(req.params.courseId) ?? "",
        userId,
        hotelId
      );
      res.status(201).json(ApiResponse.success("Applied to course", enrollment));
    } catch (error) {
      next(error);
    }
  }

  static async approveEnrollment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const enrollment = await enrollmentService.approveEnrollment(
        getString(req.params.id) ?? "",
        hotelId
      );
      res.json(ApiResponse.success("Enrollment approved", enrollment));
    } catch (error) {
      next(error);
    }
  }

  static async startCourse(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const userId = req.user?.id ?? "";
      const enrollment = await enrollmentService.startCourse(
        getString(req.params.courseId) ?? "",
        userId,
        hotelId
      );
      res.json(ApiResponse.success("Course started", enrollment));
    } catch (error) {
      next(error);
    }
  }

  static async markLectureCompleted(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const userId = req.user?.id ?? "";
      const enrollment = await enrollmentService.markLectureCompleted(
        getString(req.params.lectureId) ?? "",
        userId,
        hotelId
      );
      res.json(ApiResponse.success("Lecture marked completed", enrollment));
    } catch (error) {
      next(error);
    }
  }

  static async getUserEnrollments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const userId = req.user?.id ?? "";
      const filters = {
        hotel: hotelId,
        status: req.query.status as any,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };
      const result = await enrollmentService.getUserEnrollments(
        userId,
        hotelId,
        filters
      );
      res.json(ApiResponse.success("Enrollments fetched", result));
    } catch (error) {
      next(error);
    }
  }

  static async getEnrollmentDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const enrollment = await enrollmentService.getEnrollmentDetails(
        getString(req.params.id) ?? "",
        hotelId
      );
      res.json(ApiResponse.success("Enrollment details fetched", enrollment));
    } catch (error) {
      next(error);
    }
  }

  static async getCourseEnrollments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const filters = {
        hotel: hotelId,
        status: req.query.status as any,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };
      const result = await enrollmentService.getCourseEnrollments(
        getString(req.params.courseId) ?? "",
        hotelId,
        filters
      );
      res.json(ApiResponse.success("Course enrollments fetched", result));
    } catch (error) {
      next(error);
    }
  }

  static async dropCourse(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const userId = req.user?.id ?? "";
      const enrollment = await enrollmentService.dropCourse(
        getString(req.params.courseId) ?? "",
        userId,
        hotelId
      );
      res.json(ApiResponse.success("Course dropped", enrollment));
    } catch (error) {
      next(error);
    }
  }
}