import { Response } from "express";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";
import { errorResponse, successResponse } from "../../core/utils/ApiResponse";
import { GigApplicationStatus } from "../../shared/enums/recruitment";
import type { GigApplicationListOptions } from "../../shared/interfaces/gigs.d";
import { GigApplicationService } from "./gig-application.service";

const service = new GigApplicationService();
const stringQuery = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

function organizerContext(req: AuthenticatedRequest) {
  return {
    actorId: String(req.user?.id ?? ""),
    hotelId: String(req.hotelId ?? ""),
    canManageAllTenantGigs: (req as any).gigIsHotelAccount === true,
  };
}

function paginationOptions(req: AuthenticatedRequest): GigApplicationListOptions {
  const status = stringQuery(req.query.status);
  const page = Math.max(parseInt(stringQuery(req.query.page) ?? "1", 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(stringQuery(req.query.limit) ?? "25", 10) || 25, 1),
    100,
  );
  return {
    page,
    limit,
    filters: {
      ...(status && Object.values(GigApplicationStatus).includes(status as GigApplicationStatus)
        ? { status: status as GigApplicationStatus }
        : {}),
    },
  };
}

export class GigApplicationController {
  async applyToGig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const application = await service.applyToGig(
        String(req.user?.id ?? ""),
        req.params.id as string,
        { coverNote: req.body?.coverNote },
      );
      res.status(201).json(successResponse(application, "Gig application submitted."));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  async withdrawApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const application = await service.withdrawApplication(
        String(req.user?.id ?? ""),
        req.params.id as string,
      );
      res.json(successResponse(application, "Gig application withdrawn."));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  async getMyApplications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await service.getMyApplications(
        String(req.user?.id ?? ""),
        paginationOptions(req),
      );
      res.json(successResponse(result.applications, "Your gig applications retrieved.", result.pagination as any));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  async getApplicationsForGig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { actorId, hotelId, canManageAllTenantGigs } = organizerContext(req);
      const result = await service.getApplicationsForGig(
        actorId,
        hotelId,
        req.params.id as string,
        canManageAllTenantGigs,
        paginationOptions(req),
      );
      res.json(successResponse(result.applications, "Gig applicants retrieved.", result.pagination as any));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  async approveApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { actorId, hotelId, canManageAllTenantGigs } = organizerContext(req);
      const application = await service.approveApplication(
        actorId,
        hotelId,
        req.params.id as string,
        canManageAllTenantGigs,
      );
      res.json(successResponse(application, "Freelancer approved and hired for the gig."));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  async rejectApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { actorId, hotelId, canManageAllTenantGigs } = organizerContext(req);
      const application = await service.rejectApplication(
        actorId,
        hotelId,
        req.params.id as string,
        canManageAllTenantGigs,
        req.body?.recruiterNotes ?? req.body?.reason,
      );
      res.json(successResponse(application, "Freelancer application rejected."));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  async voteForFreelancer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { actorId, hotelId, canManageAllTenantGigs } = organizerContext(req);
      const preference = await service.voteForFreelancer(
        actorId,
        hotelId,
        req.params.id as string,
        req.body?.vote,
        canManageAllTenantGigs,
      );
      res.json(successResponse(preference, "Freelancer priority vote saved."));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  async blockFreelancer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { actorId, hotelId, canManageAllTenantGigs } = organizerContext(req);
      const preference = await service.blockFreelancer(
        actorId,
        hotelId,
        req.params.id as string,
        req.body?.reason,
        canManageAllTenantGigs,
      );
      res.json(successResponse(preference, "Freelancer blocked for your account only."));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  async unblockFreelancer(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { actorId, hotelId, canManageAllTenantGigs } = organizerContext(req);
      const preference = await service.unblockFreelancer(
        actorId,
        hotelId,
        req.params.id as string,
        canManageAllTenantGigs,
      );
      res.json(successResponse(preference, "Freelancer unblocked for your account."));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }
}
