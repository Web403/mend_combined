// ─────────────────────────────────────────────────────────────────────────────
// modules/recruitment/recruitment.controller.ts
// ─────────────────────────────────────────────────────────────────────────────

import { Response } from "express";
import { RecruitmentService } from "./recruitment.service";
import { successResponse, errorResponse } from "../../core/utils/ApiResponse";
import { AuthenticatedRequest } from "../../core/middleware/auth.middleware";
import {
  JobStatus,
  JobDepartment,
  EmploymentType,
  ApplicationStatus,
  CertificationLevel,
} from "../../shared/enums/recruitment";
import type { JobListOptions, ApplicationListOptions } from "../../shared/interfaces/recruitment.d";
import { UserRole } from "../../shared/enums/user";
import { Types } from "mongoose";

// Narrows Express query values to plain string | undefined
const qs = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

const service = new RecruitmentService();

/** Returns true when the request comes from a hotel admin, manager, or HR role */
function isRecruiter(req: AuthenticatedRequest): boolean {
  const roles: string[] = (req as any).user?.roles ?? [];
  return (
    roles.includes(UserRole.ADMIN) ||
    roles.includes(UserRole.MANAGER)
  );
}

export class RecruitmentController {
  // ── POST /recruitment/jobs ───────────────────────────────────────────────────

  async createJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId  = (req as any).hotelId as string;
      const postedBy = (req as any).user?.id as string;

      const job = await service.createJob(hotelId, postedBy, req.body);
      res.status(201).json(successResponse(job, "Job created successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PATCH /recruitment/jobs/:id/publish ──────────────────────────────────────

  async publishJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = req.user?.hotelId as string;
      const jobId   = req.params["id"] as string;

      const job = await service.publishJob(hotelId, jobId);
      res.json(successResponse(job, "Job published successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PATCH /recruitment/jobs/:id/close ────────────────────────────────────────

  async closeJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const jobId   = req.params["id"] as string;

      const job = await service.closeJob(hotelId, jobId);
      res.json(successResponse(job, "Job closed successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PUT /recruitment/jobs/:id ────────────────────────────────────────────────

  async updateJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const jobId   = req.params["id"] as string;

      const job = await service.updateJob(hotelId, jobId, req.body);
      res.json(successResponse(job, "Job updated successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── DELETE /recruitment/jobs/:id ─────────────────────────────────────────────

  async deleteJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const jobId   = req.params["id"] as string;

      await service.deleteJob(hotelId, jobId);
      res.json(successResponse(null, "Job deleted successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /recruitment/jobs (public marketplace) ───────────────────────────────

  async getPublicListings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page  = parseInt(qs(req.query.page)  ?? "1",  10);
      const limit = Math.min(parseInt(qs(req.query.limit) ?? "25", 10), 100);

      const deptRaw = qs(req.query.department);
      const empRaw  = qs(req.query.employmentType);
      const certRaw = qs(req.query.certificationRequired);

      const options: JobListOptions = {
        page,
        limit,
        sortBy:    qs(req.query.sortBy)    ?? "createdAt",
        sortOrder: (qs(req.query.sortOrder) ?? "desc") as "asc" | "desc",
        filters: {
          ...(deptRaw && Object.values(JobDepartment).includes(deptRaw as JobDepartment)
            ? { department: deptRaw as JobDepartment } : {}),
          ...(empRaw && Object.values(EmploymentType).includes(empRaw as EmploymentType)
            ? { employmentType: empRaw as EmploymentType } : {}),
          ...(certRaw && Object.values(CertificationLevel).includes(certRaw as CertificationLevel)
            ? { certificationRequired: certRaw as CertificationLevel } : {}),
          ...(qs(req.query.search) ? { search: qs(req.query.search) } : {}),
        },
      };

      const result = await service.getPublicListings(options);
      res.json(successResponse(result.jobs, "Jobs retrieved successfully", result.pagination as any));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /recruitment/jobs/mine (hotel's own listings) ────────────────────────

  async getHotelJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const page    = parseInt(qs(req.query.page)  ?? "1",  10);
      const limit   = Math.min(parseInt(qs(req.query.limit) ?? "25", 10), 100);

      const statusRaw = qs(req.query.status);
      const deptRaw   = qs(req.query.department);

      const options: JobListOptions = {
        page,
        limit,
        sortBy:    qs(req.query.sortBy)    ?? "createdAt",
        sortOrder: (qs(req.query.sortOrder) ?? "desc") as "asc" | "desc",
        filters: {
          ...(statusRaw && Object.values(JobStatus).includes(statusRaw as JobStatus)
            ? { status: statusRaw as JobStatus } : {}),
          ...(deptRaw && Object.values(JobDepartment).includes(deptRaw as JobDepartment)
            ? { department: deptRaw as JobDepartment } : {}),
          ...(qs(req.query.search) ? { search: qs(req.query.search) } : {}),
        },
      };

      const result = await service.getHotelJobs(hotelId, options);
      res.json(successResponse(result.jobs, "Hotel jobs retrieved successfully", result.pagination as any));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /recruitment/jobs/:id ────────────────────────────────────────────────

  async getJobById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const jobId = req.params["id"] as string;
      const job   = await service.getJobById(jobId);
      res.json(successResponse(job, "Job retrieved successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /recruitment/jobs/stats ──────────────────────────────────────────────

  async getJobStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const stats   = await service.getJobStats(hotelId);
      res.json(successResponse(stats, "Job stats retrieved successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── POST /recruitment/jobs/:id/apply ─────────────────────────────────────────

  async applyToJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const applicantId = (req as any).user?.id as Types.ObjectId;
      const jobId       = req.params["id"] as string;

      if (!applicantId) {
        res.status(401).json(errorResponse("Authentication required."));
        return;
      }

      const application = await service.applyToJob(applicantId, jobId, req.body);
      res.status(201).json(successResponse(application, "Application submitted successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PATCH /recruitment/applications/:id/withdraw ─────────────────────────────

  async withdrawApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const applicantId     = (req as any).user?.id as Types.ObjectId;
      const applicationId   = req.params["id"] as string;

      if (!applicantId) {
        res.status(401).json(errorResponse("Authentication required."));
        return;
      }

      const application = await service.withdrawApplication(applicantId, applicationId);
      res.json(successResponse(application, "Application withdrawn successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PATCH /recruitment/applications/:id/review ───────────────────────────────

  async reviewApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const reviewerId    = (req as any).user?.id as string;
      const applicationId = req.params["id"] as string;

      if (!reviewerId) {
        res.status(401).json(errorResponse("Authentication required."));
        return;
      }

      const { status, recruiterNotes } = req.body;

      if (!status || !Object.values(ApplicationStatus).includes(status)) {
        res.status(400).json(
          errorResponse(`Invalid status. Must be one of: ${Object.values(ApplicationStatus).join(", ")}`)
        );
        return;
      }

      const application = await service.reviewApplication(reviewerId, applicationId, {
        status,
        recruiterNotes,
      });
      res.json(successResponse(application, `Application ${status.toLowerCase()} successfully`));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── PATCH /recruitment/applications/:id/rate ─────────────────────────────────

  async rateApplication(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const reviewerId    = (req as any).user?.id as string;
      const applicationId = req.params["id"] as string;

      if (!reviewerId) {
        res.status(401).json(errorResponse("Authentication required."));
        return;
      }

      const { rating } = req.body;
      if (rating === undefined || typeof rating !== "number") {
        res.status(400).json(errorResponse("rating (number 1–5) is required."));
        return;
      }

      const application = await service.rateApplication(reviewerId, applicationId, { rating });
      res.json(successResponse(application, "Candidate rated successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /recruitment/applications/mine ───────────────────────────────────────

  async getMyApplications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const applicantId = (req as any).user?.id as Types.ObjectId;

      if (!applicantId) {
        res.status(401).json(errorResponse("Authentication required."));
        return;
      }

      const page   = parseInt(qs(req.query.page)  ?? "1",  10);
      const limit  = Math.min(parseInt(qs(req.query.limit) ?? "25", 10), 100);
      const statusRaw = qs(req.query.status);

      const options: ApplicationListOptions = {
        page,
        limit,
        sortBy:    qs(req.query.sortBy)    ?? "appliedAt",
        sortOrder: (qs(req.query.sortOrder) ?? "desc") as "asc" | "desc",
        filters: {
          ...(statusRaw && Object.values(ApplicationStatus).includes(statusRaw as ApplicationStatus)
            ? { status: statusRaw as ApplicationStatus } : {}),
        },
      };

      const result = await service.getMyApplications(applicantId, options);
      res.json(successResponse(result.applications, "Applications retrieved successfully", result.pagination as any));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /recruitment/jobs/:id/applications (recruiter) ───────────────────────

  async getApplicationsForJob(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const jobId  = req.params["id"] as string;
      const page   = parseInt(qs(req.query.page)  ?? "1",  10);
      const limit  = Math.min(parseInt(qs(req.query.limit) ?? "25", 10), 100);
      const statusRaw = qs(req.query.status);

      const options: ApplicationListOptions = {
        page,
        limit,
        sortBy:    qs(req.query.sortBy)    ?? "rankScore",
        sortOrder: (qs(req.query.sortOrder) ?? "desc") as "asc" | "desc",
        filters: {
          ...(statusRaw && Object.values(ApplicationStatus).includes(statusRaw as ApplicationStatus)
            ? { status: statusRaw as ApplicationStatus } : {}),
        },
      };

      const result = await service.getApplicationsForJob(jobId, options);
      res.json(successResponse(result.applications, "Applications retrieved successfully", result.pagination as any));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /recruitment/applications (hotel-wide) ───────────────────────────────

  async getHotelApplications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = (req as any).hotelId as string;
      const page    = parseInt(qs(req.query.page)  ?? "1",  10);
      const limit   = Math.min(parseInt(qs(req.query.limit) ?? "25", 10), 100);
      const statusRaw = qs(req.query.status);
      const jobId     = qs(req.query.jobId);

      const options: ApplicationListOptions = {
        page,
        limit,
        sortBy:    qs(req.query.sortBy)    ?? "appliedAt",
        sortOrder: (qs(req.query.sortOrder) ?? "desc") as "asc" | "desc",
        filters: {
          ...(statusRaw && Object.values(ApplicationStatus).includes(statusRaw as ApplicationStatus)
            ? { status: statusRaw as ApplicationStatus } : {}),
          ...(jobId ? { jobId } : {}),
        },
      };

      const result = await service.getHotelApplications(hotelId, options);
      res.json(successResponse(result.applications, "Applications retrieved successfully", result.pagination as any));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /recruitment/applications/:id ────────────────────────────────────────

  async getApplicationById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const requesterId   = (req as any).user?.id as string;
      const applicationId = req.params["id"] as string;
      const recruiter     = isRecruiter(req);

      if (!requesterId) {
        res.status(401).json(errorResponse("Authentication required."));
        return;
      }

      const application = await service.getApplicationById(applicationId, requesterId, recruiter);
      res.json(successResponse(application, "Application retrieved successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── GET /recruitment/jobs/:id/applications/stats ─────────────────────────────

  async getApplicationStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const jobId = req.params["id"] as string;
      const stats = await service.getApplicationStatsForJob(jobId);
      res.json(successResponse(stats, "Application stats retrieved successfully"));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }

  // ── POST /recruitment/admin/hotels/:hotelId/block (MENDADMIN) ────────────────

  async blockHotelJobs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const hotelId = req.params["hotelId"] as string;
      const { reason } = req.body;

      if (!reason?.trim()) {
        res.status(400).json(errorResponse("reason is required."));
        return;
      }

      const result = await service.blockHotelJobs(hotelId, reason);
      res.json(successResponse(result, `${result.blocked} job(s) blocked for hotel ${hotelId}`));
    } catch (error: any) {
      res.status(error.statusCode ?? 400).json(errorResponse(error.message));
    }
  }
}
