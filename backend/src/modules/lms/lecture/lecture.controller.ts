import { Request, Response, NextFunction } from "express";
import { LectureService } from "./lecture.service";
import { ApiResponse } from "../../../core/utils/ApiResponse";
import { resolveLmsHotelId } from "../../../core/utils/resolve-hotel-id";
import { getString } from "../../../core/utils/string.helper";

const lectureService = new LectureService();

export class LectureController {
  static async createLecture(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const lecture = await lectureService.createLecture(req.body, hotelId);
      res.status(201).json(ApiResponse.success("Lecture created", lecture));
    } catch (error) {
      next(error);
    }
  }

  static async getLecturesByModule(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const lectures = await lectureService.getLecturesByModule(
        getString(req.params.moduleId) ?? "",
        hotelId
      );
      res.json(ApiResponse.success("Lectures fetched", lectures));
    } catch (error) {
      next(error);
    }
  }

  static async getLectureById(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const result = await lectureService.getLectureWithNavigation(
        getString(req.params.id) ?? "",
        hotelId
      );
      res.json(ApiResponse.success("Lecture fetched", result));
    } catch (error) {
      next(error);
    }
  }

  static async updateLecture(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      const lecture = await lectureService.updateLecture(
        getString(req.params.id) ?? "",
        hotelId,
        req.body
      );
      res.json(ApiResponse.success("Lecture updated", lecture));
    } catch (error) {
      next(error);
    }
  }

  static async reorderLectures(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      await lectureService.reorderLectures(
        getString(req.params.moduleId) ?? "",
        hotelId,
        req.body.lectureOrders
      );
      res.json(ApiResponse.success("Lectures reordered"));
    } catch (error) {
      next(error);
    }
  }

  static async deleteLecture(req: Request, res: Response, next: NextFunction) {
    try {
      const hotelId = resolveLmsHotelId(req);
      await lectureService.deleteLecture(getString(req.params.id) ?? "", hotelId);
      res.json(ApiResponse.success("Lecture deleted"));
    } catch (error) {
      next(error);
    }
  }
}