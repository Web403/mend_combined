import { Response } from "express";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";
import { successResponse, errorResponse } from "../../core/utils/ApiResponse";
import { WellbeingService } from "./wellbeing.service";

const service = new WellbeingService();

const paramString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

export class WellbeingController {
  async submitDaily(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId = req.hotelId || req.body.hotelId;
      if (!hotelId) {
        res.status(400).json(errorResponse("hotelId is required"));
        return;
      }

      const userId = req.body.userId || req.user?.id;
      const result = await service.submitDaily(String(hotelId), {
        userId: String(userId || ""),
        rating: Number(req.body.rating),
        sleepHours:
          req.body.sleepHours !== undefined ? Number(req.body.sleepHours) : undefined,
        stressLevel:
          req.body.stressLevel !== undefined ? Number(req.body.stressLevel) : undefined,
      });

      res.status(201).json(successResponse(result, "Wellbeing submitted successfully"));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  }

  async getMyHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId = req.hotelId;
      const userId = req.user?.id;
      if (!hotelId || !userId) {
        res.status(400).json(errorResponse("hotelId and userId are required"));
        return;
      }

      const result = await service.getMyHistory(hotelId, userId, req.query);
      res.json(
        successResponse(result.data, "Wellbeing history retrieved successfully", result.pagination),
      );
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  }

  async getUserHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId = req.hotelId;
      const userId = paramString(req.params.userId);
      if (!hotelId || !userId) {
        res.status(400).json(errorResponse("hotelId and userId are required"));
        return;
      }

      const result = await service.getUserHistory(hotelId, userId, req.query);
      res.json(
        successResponse(result.data, "User wellbeing history retrieved successfully", result.pagination),
      );
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  }

  async getFatigueAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId = req.hotelId || req.query.hotelId || req.user?.id;
      if (!hotelId) {
        res.status(400).json(errorResponse("hotelId is required"));
        return;
      }

      const result = await service.getFatigueAlerts(String(hotelId), req.query);
      res.json(
        successResponse(result.data, "Fatigue alerts retrieved successfully", result.pagination),
      );
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  }

  async acknowledgeAlert(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId = req.hotelId || req.query.hotelId || req.user?.id;
      const id = paramString(req.params.id);
      if (!hotelId || !id) {
        res.status(400).json(errorResponse("hotelId and alert id are required"));
        return;
      }

      const result = await service.acknowledgeAlert(String(hotelId), id, req.user?.id);
      res.json(successResponse(result, "Fatigue alert acknowledged successfully"));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  }

  async resolveAlert(req: AuthenticatedRequest, res: Response) {
    try {
      const hotelId = req.hotelId || req.query.hotelId || req.user?.id;
      const id = paramString(req.params.id);
      if (!hotelId || !id) {
        res.status(400).json(errorResponse("hotelId and alert id are required"));
        return;
      }

      const result = await service.resolveAlert(String(hotelId), id, req.user?.id);
      res.json(successResponse(result, "Fatigue alert resolved successfully"));
    } catch (error: any) {
      res.status(400).json(errorResponse(error.message));
    }
  }

  async getUsersWithWellbeing(req: AuthenticatedRequest, res: Response) {
    const hotelId = req.hotelId || req.query.hotelId || req.user?.id;
    if (!hotelId) {
      res.status(400).json(errorResponse("hotelId is required"));
      return;
    }
    const result = await service.getUsersWithWellbeing(String(hotelId));
    res.json(successResponse(result, "Users with wellbeing retrieved successfully"));
  }
}
