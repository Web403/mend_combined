// ─────────────────────────────────────────────────────────────────────────────
// modules/gigs/gig.controller.ts
// HTTP adapter for all Gig operations — no business logic lives here.
// Requirements: 3, 4, 5, 6, 7, 12
// ─────────────────────────────────────────────────────────────────────────────

import { Response } from "express";
import { GigService } from "./gig.service";
import { BookingRepository } from "./booking.repository";
import { successResponse, errorResponse } from "../../core/utils/ApiResponse";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";
import {
  GigStatus,
  JobDepartment,
  CertificationLevel,
} from "../../shared/enums/recruitment";
import type { GigListOptions, GigListFilters } from "../../shared/interfaces/gigs.d";

// Narrows Express query values to plain string | undefined
const qs = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

const service        = new GigService();
const bookingRepo    = new BookingRepository();

export class GigController {
  // ── POST /gigs ───────────────────────────────────────────────────────────────

  async createGig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId  = (req as any).hotelId as string;
      const postedBy = (req as any).user?.id as string;

      const gig = await service.createGig(hotelId, postedBy, req.body);
      res.status(201).json(successResponse(gig, "Gig created successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PATCH /gigs/:id/publish ──────────────────────────────────────────────────

  async publishGig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const gigId   = req.params["id"] as string;

      const gig = await service.publishGig(hotelId, gigId);
      res.json(successResponse(gig, "Gig published successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PATCH /gigs/:id/close ────────────────────────────────────────────────────

  async closeGig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const gigId   = req.params["id"] as string;

      const gig = await service.closeGig(hotelId, gigId);
      res.json(successResponse(gig, "Gig closed successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PATCH /gigs/:id/cancel ───────────────────────────────────────────────────

  async cancelGig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const gigId   = req.params["id"] as string;

      // Inject BookingRepository.cancelAllConfirmedForGig as the cascade callback
      const gig = await service.cancelGig(
        hotelId,
        gigId,
        bookingRepo.cancelAllConfirmedForGig.bind(bookingRepo)
      );
      res.json(successResponse(gig, "Gig cancelled successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PUT /gigs/:id ────────────────────────────────────────────────────────────

  async updateGig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const gigId   = req.params["id"] as string;

      const gig = await service.updateGig(hotelId, gigId, req.body);
      res.json(successResponse(gig, "Gig updated successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /gigs (public marketplace) ──────────────────────────────────────────

  async getPublicListings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page  = parseInt(qs(req.query.page)  ?? "1",  10);
      const limit = Math.min(parseInt(qs(req.query.limit) ?? "25", 10), 100);

      const deptRaw  = qs(req.query.department);
      const certRaw  = qs(req.query.certificationRequired);
      const afterRaw = qs(req.query.startAfter);
      const beforeRaw = qs(req.query.startBefore);

      const filters: GigListFilters = {
        ...(deptRaw && Object.values(JobDepartment).includes(deptRaw as JobDepartment)
          ? { department: deptRaw as JobDepartment } : {}),
        ...(certRaw && Object.values(CertificationLevel).includes(certRaw as CertificationLevel)
          ? { certificationRequired: certRaw as CertificationLevel } : {}),
        ...(afterRaw  ? { startAfter:  new Date(afterRaw)  } : {}),
        ...(beforeRaw ? { startBefore: new Date(beforeRaw) } : {}),
      };

      const options: GigListOptions = { page, limit, filters };

      const result = await service.getPublicListings(options);
      res.json(successResponse(result.gigs, "Gigs retrieved successfully", result.pagination as any));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /gigs/mine (hotel's own listings) ────────────────────────────────────

  async getHotelGigs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const page    = parseInt(qs(req.query.page)  ?? "1",  10);
      const limit   = Math.min(parseInt(qs(req.query.limit) ?? "25", 10), 100);

      const statusRaw = qs(req.query.status);
      const deptRaw   = qs(req.query.department);
      const certRaw   = qs(req.query.certificationRequired);
      const afterRaw  = qs(req.query.startAfter);
      const beforeRaw = qs(req.query.startBefore);

      const filters: GigListFilters = {
        ...(statusRaw && Object.values(GigStatus).includes(statusRaw as GigStatus)
          ? { status: statusRaw as GigStatus } : {}),
        ...(deptRaw && Object.values(JobDepartment).includes(deptRaw as JobDepartment)
          ? { department: deptRaw as JobDepartment } : {}),
        ...(certRaw && Object.values(CertificationLevel).includes(certRaw as CertificationLevel)
          ? { certificationRequired: certRaw as CertificationLevel } : {}),
        ...(afterRaw  ? { startAfter:  new Date(afterRaw)  } : {}),
        ...(beforeRaw ? { startBefore: new Date(beforeRaw) } : {}),
      };

      const options: GigListOptions = { page, limit, filters };

      const result = await service.getHotelGigs(hotelId, options);
      res.json(successResponse(result.gigs, "Hotel gigs retrieved successfully", result.pagination as any));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /gigs/:id ────────────────────────────────────────────────────────────

  async getGigById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const gigId = req.params["id"] as string;
      const gig   = await service.getGigById(gigId);
      res.json(successResponse(gig, "Gig retrieved successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /gigs/stats ──────────────────────────────────────────────────────────

  async getGigStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const stats   = await service.getGigStats(hotelId);
      res.json(successResponse(stats, "Gig stats retrieved successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }
}
