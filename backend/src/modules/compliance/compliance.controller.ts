// ─────────────────────────────────────────────────────────────────────────────
// modules/compliance/compliance.controller.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Response } from "express";
import { ComplianceService } from "./compliance.service";
import { successResponse, errorResponse } from "../../core/utils/ApiResponse";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";
import { AuditAction } from "../../shared/enums/compliance.enum";

const qs = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const service = new ComplianceService();

export class ComplianceController {
  // ── POST /compliance/evaluate/:hotelId — trigger evaluation (FR34, FR35) ──

  async evaluate(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId    = (req.body.hotelId as string) || (req.user?.hotelId as string) || (req.query?.hotelId as string) || (req.user?.id as string);
      const actorId    = req.user?.id ?? "system";
      const actorRole  = req.user?.roles?.[0] ?? "SYSTEM";
      const windowDays = req.body.windowDays
        ? parseInt(req.body.windowDays, 10)
        : undefined;

      if (!hotelId) {
        res.status(400).json(errorResponse("hotelId is required."));
        return;
      }

      const report = await service.evaluateHotel(hotelId, actorId, actorRole, windowDays);
      res.json(successResponse(report, "Compliance evaluated successfully."));
    } catch (error: any) {
      res.status(error.statusCode ?? 500).json(errorResponse(error.message));
    }
  }

  // ── GET /compliance/report/:hotelId — fetch report (FR39) ────────────────

  async getReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req.query.hotelId as string) || (req.user?.id as string);
      if (!hotelId) {
        res.status(400).json(errorResponse("hotelId is required."));
        return;
      }

      const report = await service.getReport(hotelId);
      res.json(successResponse(report, "Compliance report retrieved."));
    } catch (error: any) {
      res.status(error.statusCode ?? 404).json(errorResponse(error.message));
    }
  }

  // ── GET /compliance/reports — all hotels compliance overview (FR39) ───────

  async getAllReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page  = parseInt(qs(req.query.page)  ?? "1",  10);
      const limit = parseInt(qs(req.query.limit) ?? "20", 10);

      const { reports, total } = await service.getAllReports({ page, limit });
      res.json(
        successResponse({ reports }, "All compliance reports retrieved.", {
          page,
          limit,
          total,
        })
      );
    } catch (error: any) {
      res.status(error.statusCode ?? 500).json(errorResponse(error.message));
    }
  }

  // ── GET /compliance/audit/:hotelId — audit log (FR36) ────────────────────

  async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req.query.hotelId as string) || (req.user?.id as string);
      if (!hotelId) {
        res.status(400).json(errorResponse("hotelId is required."));
        return;
      }

      const page   = parseInt(qs(req.query.page)   ?? "1",  10);
      const limit  = parseInt(qs(req.query.limit)  ?? "25", 10);
      const action = qs(req.query.action) as AuditAction | undefined;

      const { logs, total } = await service.getAuditLogs(hotelId, {
        page,
        limit,
        action,
      });

      res.json(
        successResponse({ logs }, "Audit log retrieved.", { page, limit, total })
      );
    } catch (error: any) {
      res.status(error.statusCode ?? 500).json(errorResponse(error.message));
    }
  }

  // ── GET /compliance/hiring-check/:hotelId — FR38 hiring gate ─────────────

  async checkHiringEligibility(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = req.params["hotelId"] as string;
      if (!hotelId) {
        res.status(400).json(errorResponse("hotelId is required."));
        return;
      }

      const eligible = await service.isEligibleToHire(hotelId);
      res.json(
        successResponse(
          { hotelId, isEligibleToHire: eligible },
          eligible
            ? "Hotel is eligible to hire."
            : "Hotel is not eligible to hire — compliance threshold not met."
        )
      );
    } catch (error: any) {
      res.status(error.statusCode ?? 500).json(errorResponse(error.message));
    }
  }
}
