// ─────────────────────────────────────────────────────────────────────────────
// modules/sos/sos.controller.ts
//
// Thin HTTP adapter — validates the request shape, delegates to the service,
// and serialises responses.  No business logic lives here.
// ─────────────────────────────────────────────────────────────────────────────

import { Request, Response, NextFunction } from "express";
import { SOSService } from "./sos.service";
import { SOSErrors } from "./sos.errors";
import { successResponse, errorResponse } from "../../core/utils/ApiResponse";
import type { CoordinatesWithAccuracy } from "../../shared/interfaces/geo.interface";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";

export class SOSController {
  private readonly service = new SOSService();

  // ── POST /sos/trigger ──────────────────────────────────────────────────────

  async triggerSOS(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = SOSController.parseTriggerBody(req.body);
      const result = await this.service.triggerSOS(dto);
      res.status(201).json(successResponse(result, "SOS alert triggered successfully"));
    } catch (err) {
      next(err);
    }
  }

  // ── GET /sos ───────────────────────────────────────────────────────────────

  async getSOSAlerts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const hotelId = (req.query.hotelId as string) || (req.user?.hotelId as string) || (req.user?.id as string);
      const status = req.query.status as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await this.service.getSOSAlerts(hotelId, status, limit, offset);
      res.status(200).json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }

  // ── GET /sos/:id ───────────────────────────────────────────────────────────

  async getSOSById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.getSOSById(id as string);

      if (!result) {
        throw SOSErrors.sosNotFound(id as string);
      }

      res.status(200).json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }

  // ── PUT /sos/:id/escalate ──────────────────────────────────────────────────

  async escalateSOS(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { level } = req.body;
      const newLevel = level ? parseInt(level) : 1;

      const result = await this.service.escalateSOS(id as string, newLevel);
      res.status(200).json(successResponse(result, "SOS alert escalated"));
    } catch (err) {
      next(err);
    }
  }

  // ── PUT /sos/:id/resolve ───────────────────────────────────────────────────

  async resolveSOS(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await this.service.resolveSOS(id as string);
      res.status(200).json(successResponse(result, "SOS alert resolved"));
    } catch (err) {
      next(err);
    }
  }

  // ── Body parsers / lightweight validators ──────────────────────────────────

  private static parseTriggerBody(body: Record<string, any>) {
    const coords = SOSController.parseCoords(body.coords);

    return {
      userId: SOSController.requireString(body, "userId"),
      hotelId: SOSController.requireString(body, "hotelId"),
      coords,
      message: body.message ? String(body.message) : undefined,
    };
  }

  private static requireString(
    body: Record<string, any>,
    field: string,
  ): string {
    const val = body[field];
    if (typeof val !== "string" || val.trim() === "") {
      throw SOSErrors.invalidCoords(); // reuse generic 422 for missing fields
    }
    return val.trim();
  }

  private static parseCoords(raw: any): CoordinatesWithAccuracy {
    if (!raw || typeof raw !== "object") throw SOSErrors.invalidCoords();

    const lat = Number(raw.lat);
    const lng = Number(raw.lng);

    if (isNaN(lat) || isNaN(lng)) throw SOSErrors.invalidCoords();

    return {
      lat,
      lng,
      accuracy: raw.accuracy ? Number(raw.accuracy) : undefined,
      capturedAt: raw.capturedAt ? Number(raw.capturedAt) : Date.now(),
    };
  }
}