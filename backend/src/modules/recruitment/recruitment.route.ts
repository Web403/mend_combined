// ─────────────────────────────────────────────────────────────────────────────
// modules/recruitment/recruitment.route.ts
//
// Route map:
//
//  PUBLIC MARKETPLACE (any authenticated user)
//  GET    /recruitment/jobs                          — browse open listings (FR53, FR54)
//  GET    /recruitment/jobs/:id                      — single job detail
//
//  HOTEL MANAGEMENT (hotel admin / manager)
//  GET    /recruitment/jobs/mine                     — hotel's own listings
//  GET    /recruitment/jobs/stats                    — job + application stats
//  POST   /recruitment/jobs                          — create job (FR53)
//  PUT    /recruitment/jobs/:id                      — update job
//  PATCH  /recruitment/jobs/:id/publish              — publish DRAFT → OPEN
//  PATCH  /recruitment/jobs/:id/close                — close job
//  DELETE /recruitment/jobs/:id                      — delete job
//  GET    /recruitment/jobs/:id/applications         — ranked applicants (FR56, FR57)
//  GET    /recruitment/jobs/:id/applications/stats   — per-status counts
//  GET    /recruitment/applications                  — hotel-wide applications
//  PATCH  /recruitment/applications/:id/review       — shortlist / reject (FR56)
//  PATCH  /recruitment/applications/:id/rate         — rate hired candidate (FR58)
//  GET    /recruitment/applications/:id              — single application detail
//
//  CANDIDATE (any authenticated user)
//  POST   /recruitment/jobs/:id/apply                — apply (FR55)
//  GET    /recruitment/applications/mine             — my applications
//  PATCH  /recruitment/applications/:id/withdraw     — withdraw application
//
//  MENDADMIN
//  POST   /recruitment/admin/hotels/:hotelId/block   — block hotel from hiring (FR61)
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import { RecruitmentController } from "./recruitment.controller";
import { authMiddleware } from "../../core/middleware/auth.middleware";
import { adminAuthMiddleware } from "../../core/middleware/admin.middleware";
import { tenantMiddleware } from "../../core/middleware/tenant.middleware";

const router = Router();
const ctrl   = new RecruitmentController();

// All recruitment routes require a valid JWT
router.use(authMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// Static / named routes — MUST come before /:id to avoid shadowing
// ─────────────────────────────────────────────────────────────────────────────

// Candidate: my applications
router.get(
  "/applications/mine",
  ctrl.getMyApplications.bind(ctrl)
);

// Hotel: all applications across all jobs
router.get(
  "/applications",
  tenantMiddleware,
  ctrl.getHotelApplications.bind(ctrl)
);

// Hotel: job stats
router.get(
  "/jobs/stats",
  tenantMiddleware,
  ctrl.getJobStats.bind(ctrl)
);

// Hotel: own listings
router.get(
  "/jobs/mine",
  tenantMiddleware,
  ctrl.getHotelJobs.bind(ctrl)
);

// ─────────────────────────────────────────────────────────────────────────────
// Public marketplace
// ─────────────────────────────────────────────────────────────────────────────

router.get("/jobs", ctrl.getPublicListings.bind(ctrl));

// ─────────────────────────────────────────────────────────────────────────────
// Hotel job management (tenant-scoped write operations)
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/jobs",
  tenantMiddleware,
  ctrl.createJob.bind(ctrl)
);

router.put(
  "/jobs/:id",
  tenantMiddleware,
  ctrl.updateJob.bind(ctrl)
);

router.patch(
  "/jobs/:id/publish",
  tenantMiddleware,
  ctrl.publishJob.bind(ctrl)
);

router.patch(
  "/jobs/:id/close",
  tenantMiddleware,
  ctrl.closeJob.bind(ctrl)
);

router.delete(
  "/jobs/:id",
  tenantMiddleware,
  ctrl.deleteJob.bind(ctrl)
);

// ─────────────────────────────────────────────────────────────────────────────
// Job detail (public read — no tenant required)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/jobs/:id", ctrl.getJobById.bind(ctrl));

// ─────────────────────────────────────────────────────────────────────────────
// Applications nested under job
// ─────────────────────────────────────────────────────────────────────────────

// Candidate: apply
router.post(
  "/jobs/:id/apply",
  ctrl.applyToJob.bind(ctrl)
);

// Recruiter: ranked applicant list for a job (FR56, FR57)
router.get(
  "/jobs/:id/applications/stats",
  tenantMiddleware,
  ctrl.getApplicationStats.bind(ctrl)
);

router.get(
  "/jobs/:id/applications",
  tenantMiddleware,
  ctrl.getApplicationsForJob.bind(ctrl)
);

// ─────────────────────────────────────────────────────────────────────────────
// Application actions
// ─────────────────────────────────────────────────────────────────────────────

// Single application detail
router.get(
  "/applications/:id",
  ctrl.getApplicationById.bind(ctrl)
);

// Candidate: withdraw
router.patch(
  "/applications/:id/withdraw",
  ctrl.withdrawApplication.bind(ctrl)
);

// Recruiter: review / shortlist / reject / hire (FR56)
router.patch(
  "/applications/:id/review",
  tenantMiddleware,
  ctrl.reviewApplication.bind(ctrl)
);

// Recruiter: rate hired candidate (FR58)
router.patch(
  "/applications/:id/rate",
  tenantMiddleware,
  ctrl.rateApplication.bind(ctrl)
);

// ─────────────────────────────────────────────────────────────────────────────
// MENDADMIN: block hotel from hiring (FR61)
// ─────────────────────────────────────────────────────────────────────────────

router.post(
  "/admin/hotels/:hotelId/block",
  adminAuthMiddleware,
  ctrl.blockHotelJobs.bind(ctrl)
);

export default router;
