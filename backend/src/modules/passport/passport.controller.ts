// ─────────────────────────────────────────────────────────────────────────────
// modules/passport/passport.controller.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Response } from "express";
import { PassportService } from "./passport.service";
import { successResponse, errorResponse } from "../../core/utils/ApiResponse";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";

const qs = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const service = new PassportService();

export class PassportController {
  // ── POST /passport — create passport for a user (FR48, FR50) ─────────────

  async createPassport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      if (!hotelId) {
        res.status(400).json(errorResponse("Hotel context required."));
        return;
      }

      const { userId } = req.body;
      if (!userId) {
        res.status(400).json(errorResponse("userId is required."));
        return;
      }

      const passport = await service.createPassport(hotelId, userId);
      res.status(201).json(successResponse(passport, "Mend Passport created successfully."));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PUT /passport/:userId — update skills & career progression (FR49, FR51) ──

  async updatePassport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.params["userId"] as string;
      if (!userId) {
        res.status(400).json(errorResponse("userId is required."));
        return;
      }

      const passport = await service.updatePassport(userId, req.body);
      res.json(successResponse(passport, "Mend Passport updated successfully."));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── POST /passport/:userId/sync — re-pull live LMS + efficiency data ──────

  async syncPassport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      if (!hotelId) {
        res.status(400).json(errorResponse("Hotel context required."));
        return;
      }

      const userId = req.params["userId"] as string;
      if (!userId) {
        res.status(400).json(errorResponse("userId is required."));
        return;
      }

      const passport = await service.syncPassport(hotelId, userId);
      res.json(successResponse(passport, "Mend Passport synced successfully."));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /passport/user/:userId — get by user (FR49) ──────────────────────

  async getByUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.params["userId"] as string;
      if (!userId) {
        res.status(400).json(errorResponse("userId is required."));
        return;
      }

      const passport = await service.getPassportByUser(userId);
      res.json(successResponse(passport, "Mend Passport retrieved."));
    } catch (error: any) {
      res.status(error.statusCode ?? 404).json(errorResponse(error.message));
    }
  }

  // ── GET /passport/credential/:credentialNumber — public lookup (FR50) ─────

  async getByCredential(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const credentialNumber = req.params["credentialNumber"] as string;
      if (!credentialNumber) {
        res.status(400).json(errorResponse("credentialNumber is required."));
        return;
      }

      const passport = await service.getPassportByCredential(credentialNumber);
      res.json(successResponse(passport, "Mend Passport retrieved."));
    } catch (error: any) {
      res.status(error.statusCode ?? 404).json(errorResponse(error.message));
    }
  }

  // ── GET /passport/hotel — all passports for this hotel ───────────────────

  async getByHotel(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      if (!hotelId) {
        res.status(400).json(errorResponse("Hotel context required."));
        return;
      }

      const page  = parseInt(qs(req.query.page)  ?? "1",  10);
      const limit = parseInt(qs(req.query.limit) ?? "20", 10);

      const { passports, total } = await service.getHotelPassports(hotelId, { page, limit });
      res.json(
        successResponse({ passports }, "Hotel passports retrieved.", { page, limit, total })
      );
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }
}
