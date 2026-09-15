import { Request, Response, NextFunction } from "express";
import { AttendanceService } from "./attendance.service";
import { AttendanceErrors } from "./attendance.errors";
import { successResponse, errorResponse } from "../../core/utils/ApiResponse";
import type {
  ClockInRequestDto,
  ClockOutRequestDto,
} from "../../shared/interfaces/attendance";
import type { CoordinatesWithAccuracy } from "../../shared/interfaces/geo.interface";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";

export class AttendanceController {
  private readonly service = new AttendanceService();

  async clockIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { hotelId } = req.body;
      const dto = AttendanceController.parseClockInBody(req.body);
      const result = await this.service.clockIn(hotelId, dto);
      res.status(201).json(successResponse(result, result.message || "Clocked in successfully"));
    } catch (err: any) {
      const attendanceErr = err;
      if (attendanceErr && attendanceErr.httpStatus && attendanceErr.message && attendanceErr.code) {
        res.status(attendanceErr.httpStatus).json(errorResponse(attendanceErr.message, attendanceErr.code));
        return;
      }
      next(err);
    }
  }

  async clockOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { hotelId } = req.body;
      const dto = AttendanceController.parseClockOutBody(req.body);
      const result = await this.service.clockOut(hotelId, dto);
      res.status(200).json(successResponse(result, result.message || "Clocked out successfully"));
    } catch (err: any) {
      const attendanceErr = err;
      if (attendanceErr && attendanceErr.httpStatus && attendanceErr.message && attendanceErr.code) {
        res.status(attendanceErr.httpStatus).json(errorResponse(attendanceErr.message, attendanceErr.code));
        return;
      }
      next(err);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hotelId = (req as any).hotelId || (req.query.hotelId as string);
      if (!hotelId) {
        res.status(400).json(errorResponse("Missing hotelId"));
        return;
      }
      const result = await this.service.getHistory(hotelId, req.query);
      res.status(200).json(successResponse(result, "Attendance history retrieved successfully"));
    } catch (err) {
      next(err);
    }
  }

  async getLive(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const hotelId = (req as any).hotelId || (req.query.hotelId as string);
      if (!hotelId) {
        res.status(400).json(errorResponse("Missing hotelId"));
        return;
      }
      const result = await this.service.getLive(hotelId);
      res.status(200).json(successResponse(result, "Live attendance retrieved successfully"));
    } catch (err) {
      next(err);
    }
  }

  async getEmployeesWithAttendance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const hotelId = (req as any).hotelId || (req.query.hotelId as string) || (req.user?.id as string);
      if (!hotelId) {
        res.status(400).json(errorResponse("Missing hotelId"));
        return;
      }
      const result = await this.service.getEmployeesWithAttendance(hotelId);
      res.status(200).json(successResponse(result, "Employees with attendance retrieved successfully"));
    } catch (err) {
      next(err);
    }
  }

  private static parseClockInBody(body: Record<string, any>): ClockInRequestDto {
    const coords = AttendanceController.parseCoords(body.coords);

    return {
      userId: AttendanceController.requireString(body, "userId"),
      hotelId: AttendanceController.requireString(body, "hotelId"),
      coords,
      deviceId: body.deviceId ?? undefined,
      offlineQueuedAt:
        typeof body.offlineQueuedAt === "number"
          ? body.offlineQueuedAt
          : undefined,
    };
  }

  private static parseClockOutBody(body: Record<string, any>): ClockOutRequestDto {
    const coords = AttendanceController.parseCoords(body.coords);
    return {
      userId: AttendanceController.requireString(body, "userId"),
      hotelId: AttendanceController.requireString(body, "hotelId"),
      coords,
      deviceId: body.deviceId ?? undefined,
      offlineQueuedAt:
        typeof body.offlineQueuedAt === "number"
          ? body.offlineQueuedAt
          : undefined,
    };
  }

  private static requireString(
    body: Record<string, any>,
    field: string,
  ): string {
    const val = body[field];
    if (typeof val !== "string" || val.trim() === "") {
      throw AttendanceErrors.invalidCoords();
    }
    return val.trim();
  }

  private static parseCoords(raw: any): CoordinatesWithAccuracy {
    if (!raw || typeof raw !== "object") throw AttendanceErrors.invalidCoords();
    const lat = Number(raw.lat);
    const lng = Number(raw.lng);
    if (isNaN(lat) || isNaN(lng)) throw AttendanceErrors.invalidCoords();
    return {
      lat,
      lng,
      accuracy: raw.accuracy != null ? Number(raw.accuracy) : undefined,
      capturedAt: raw.capturedAt != null ? Number(raw.capturedAt) : undefined,
    };
  }
}
